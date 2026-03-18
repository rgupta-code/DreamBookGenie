
// Import Modality to fix the "Cannot find name 'Modality'" error
import { GoogleGenAI, Type, Modality, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Story, StoryRequest, ProgressEntry } from "../types";

const getApiKey = () => {
  // Uses the user-provided key if available (Paid Mode), otherwise uses the default env key (Free Mode)
  return localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
};

// Use enums for safety settings categories and thresholds to satisfy type requirements
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

// Helper for exponential backoff retry
async function callGenAIWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // 503 Service Unavailable / Overloaded is the main target
      // 500 Internal Error sometimes resolves on retry
      // 429 Too Many Requests might resolve if we wait, though usually indicates quota. 
      // However, sometimes 429 is rate limit (RPM) which backoff helps.
      const isRetryable =
        error.status === 503 ||
        error.status === 500 ||
        error.status === 429 || 
        (error.message && (
            error.message.includes("503") ||
            error.message.includes("overloaded") ||
            error.message.includes("internal error") ||
            error.message.includes("UNAVAILABLE") || 
            error.message.includes("Too Many Requests")
        ));

      if (isRetryable && i < retries) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export const validateApiKey = async (key: string): Promise<boolean> => {
  if (!key || key.trim() === '') return false;
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    // Use a simple generation request to test the key with a lightweight model
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: "ping" }] },
    });
    // Check if we got a valid response object
    if (response && response.text !== undefined) {
        return true;
    }
    return false;
  } catch (e) {
    console.error("Key validation failed", e);
    return false;
  }
};

const getModelTierOLD = () => {
  const isPaid = localStorage.getItem('magic_storybook_is_paid') === 'true';
  return {
    // Text Tasks: Use Gemini 3 Pro for Paid, Gemini 3 Flash for Free
    text: isPaid ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
    
    // Image Tasks: Use Gemini 3 Pro Image for Paid, Gemini 2.5 Flash Image for Free
    image: isPaid ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image',
    
    // TTS Tasks: Currently only Gemini 2.5 Flash TTS is available publicly. 
    // Logic is prepared for a Pro model if one becomes available in the future.
    tts: isPaid ? 'gemini-2.5-flash-preview-tts' : 'gemini-2.5-flash-preview-tts',
    
    // Analysis Tasks: Use Gemini 3 Pro for Paid, Gemini 3 Flash for Free
    analysis: isPaid ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview'
  };
};

const getModelTier = () => {
  const isPaid = localStorage.getItem('magic_storybook_is_paid') === 'true';
  
  return {
    // Text Tasks: 3.1 Pro for high-level creative storytelling; 3 Flash for speed/cost.
    text: isPaid ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview',
    
    // Image Tasks: Nano Banana Pro (3 Pro Image) for high-quality book art; 
    // Nano Banana 2 (3.1 Flash Image) for fast, consistent generation.
    image: isPaid ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image',
    
    // TTS Tasks: 2.5 Pro TTS offers higher fidelity for narration; 
    // 2.5 Flash TTS is optimized for low-latency interactive dialogue.
    tts: isPaid ? 'gemini-2.5-flash-preview-tts' : 'gemini-2.5-flash-preview-tts',
    
    // Analysis Tasks: 3.1 Pro for complex story logic/branching; 3 Flash for basic summaries.
    analysis: isPaid ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview'
  };
};

const parseDataUri = (dataUri: string) => {
  try {
    if (!dataUri.startsWith('data:')) {
      // Assume it's already a clean base64 string
      return { mimeType: 'image/png', data: dataUri.replace(/[\n\r\s]/g, '') };
    }
    const parts = dataUri.split(',');
    if (parts.length < 2) throw new Error("Invalid Data URI");
    
    const header = parts[0];
    const data = parts[1];
    
    const mimeMatch = header.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const cleanData = data.replace(/[\n\r\s]/g, '');
    
    return { mimeType, data: cleanData };
  } catch (e) {
    console.error("Error parsing data URI:", e);
    return { mimeType: 'image/png', data: '' };
  }
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const createWavBuffer = (pcmBase64: string): ArrayBuffer => {
  const binaryString = atob(pcmBase64);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  const bytes = new Uint8Array(buffer, 44);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return buffer;
};

export const generateStoryStructure = async (request: StoryRequest): Promise<Story> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const model = getModelTier().text;
  const pageCount = request.pageCount || 5;
  
  let systemPrompt = "";
  let userPrompt = "";

  if (request.mode === 'learning') {
      systemPrompt = `You are the "Magic Teacher," a creative AI specialized in writing engaging, educational picture books for children. Target Audience: ${request.ageGroup}. Generate a exactly ${pageCount}-page educational book. Detect the language of the topic and respond in that language. Respond strictly in JSON format. Ensure you provide a consistent character visual description for the main character.`;
      userPrompt = `Create an educational book about: ${request.topic}.`;
  } else {
      systemPrompt = `You are the "Magic Storybook Engine," a creative AI specialized in writing personalized stories for children. Target Audience: ${request.ageGroup}. Strictly G-rated. Detect the language used in the prompt and respond in that language. Respond strictly in JSON format. Generate exactly ${pageCount} pages. Ensure you provide a consistent character visual description for the main character.`;
      userPrompt = `Write a story about: ${request.topic}. \nMain Character: ${request.characterName}. \nCharacter Description: ${request.characterDescription}`;
  }

  const parts: any[] = [{ text: userPrompt }];
  
  if (request.characterImage && request.mode === 'story') {
    const { mimeType, data } = parseDataUri(request.characterImage);
    if (data) {
        parts.push({ inlineData: { mimeType, data } });
        parts.push({ text: "Use the attached image as a visual reference for the main character HERO." });
    }
  }

  try {
    const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        safetySettings: SAFETY_SETTINGS,
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                language: { type: Type.STRING, description: "BCP-47 language code of the story, e.g. 'en-US', 'es-ES'" },
                character_description: { type: Type.STRING, description: "A detailed visual description of the main character (clothing, colors, species, features) to be used for consistent image generation." },
                theme_colors: {
                    type: Type.OBJECT,
                    properties: { primary: { type: Type.STRING }, secondary: { type: Type.STRING } },
                    required: ["primary", "secondary"]
                },
                pages: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { page_number: { type: Type.INTEGER }, text: { type: Type.STRING }, image_prompt: { type: Type.STRING } },
                        required: ["page_number", "text", "image_prompt"]
                    }
                }
            },
            required: ["title", "theme_colors", "pages", "language", "character_description"]
        }
      }
    }));

    const rawStory = JSON.parse(response.text || '{}');
    const storyData: Story = {
        ...rawStory,
        characterDescription: rawStory.character_description // Map snake_case to camelCase
    };

    if (request.mode === 'story') storyData.characterImage = request.characterImage;
    storyData.ageGroup = request.ageGroup;
    storyData.voiceGender = request.voiceGender;
    storyData.voiceTone = request.voiceTone;
    return storyData;
  } catch (error: any) {
    console.error("Error in generateStoryStructure:", error);
    throw error;
  }
};

export const generateImageForPage = async (prompt: string, style: string, referenceImage?: string, characterDescription?: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const modelTier = getModelTier();
  const model = modelTier.image;
  
  // Prompt engineering to prevent cropping
  let enhancedPrompt = `Children's book illustration in ${style} style. ${prompt}. High quality, colorful, artistic. Wide shot, camera zoomed out, subject fully visible and centered with margin around edges, do not crop head.`;
  
  // Enforce consistent character description if available
  if (characterDescription) {
    enhancedPrompt += ` Main character details: ${characterDescription}. Maintain consistent character appearance throughout.`;
  }

  const parts: any[] = [{ text: enhancedPrompt }];

  if (referenceImage) {
     const { mimeType, data } = parseDataUri(referenceImage);
     if (data) {
        parts.push({ inlineData: { mimeType, data } });
        parts.push({ text: "Maintain strict character appearance based on the provided reference photo." });
     }
  }

  try {
    const isPro = model === 'gemini-3-pro-image-preview';
    const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        safetySettings: SAFETY_SETTINGS,
        ...(isPro ? {
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: "1K"
            }
        } : {})
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Image generation failed", error);
    return undefined;
  }
  return undefined;
};

export const generateColoringBookImages = async (topic: string, ageGroup: string, count: number = 5, referenceImage?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const modelTier = getModelTier();
  const model = modelTier.image;
  const textModel = modelTier.text;

  // Determine complexity based on age
  let complexityPrompt = "simple, bold lines, easy to color";
  if (ageGroup.includes("Toddler")) {
      complexityPrompt = "extremely simple, thick bold outlines, large main subject, no background clutter, high contrast, vast white space, designed for scribbling";
  } else if (ageGroup.includes("Preschool")) {
      complexityPrompt = "simple bold lines, cute friendly characters, minimal background details, easy to stay inside lines";
  } else if (ageGroup.includes("School")) {
      complexityPrompt = "storybook style, moderate detail, interesting background, clear outlines, fun patterns";
  } else if (ageGroup.includes("Big Kids") || ageGroup.includes("Teen")) {
      complexityPrompt = "complex, intricate details, zentangle patterns, fine lines, artistic, sophisticated composition";
  }

  // 1. Generate Scene descriptions
  let scenePrompts: string[] = [];
  try {
      const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: textModel,
          contents: [{ parts: [{ text: `List ${count} distinct, fun scenes for a coloring book about "${topic}" for kids aged ${ageGroup}. Respond strictly with a JSON array of strings.` }] }],
          config: { 
              responseMimeType: "application/json",
              responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
              safetySettings: SAFETY_SETTINGS
          }
      }));
      scenePrompts = JSON.parse(response.text || '[]');
  } catch (e) {
      console.warn("Scene generation failed, using defaults", e);
      for(let i=0; i<count; i++) scenePrompts.push(`${topic} scene ${i+1}`);
  }

  // 2. Generate Images
  const stylePrompt = `kids coloring book page, black and white line art, white background, no gray, no shading, vector style. ${complexityPrompt}`;
  
  const promises = scenePrompts.map(async (scene) => {
      const parts: any[] = [{ text: `${stylePrompt}. ${scene}.` }];
      
      // Add reference image if available
      if (referenceImage) {
         const { mimeType, data } = parseDataUri(referenceImage);
         if (data) {
            parts.push({ inlineData: { mimeType, data } });
            parts.push({ text: "Use this image as a visual reference for the main character in the coloring page." });
         }
      }

      try {
        const isPro = model === 'gemini-3-pro-image-preview';
        const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: { parts },
            config: { 
              safetySettings: SAFETY_SETTINGS,
              ...(isPro ? {
                  imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "1K"
                  }
              } : {})
            }
        }));
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
      } catch (e) {
          console.error("Coloring page generation failed", e);
          return null;
      }
      return null;
  });

  const results = await Promise.all(promises);
  return results.filter(img => img !== null) as string[];
};

export const generateSpeech = async (text: string, gender: 'male' | 'female' = 'male', tone: string = 'Cheerful'): Promise<string | undefined> => {
  if (!text || text.trim().length === 0) return undefined;
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const model = getModelTier().tts;
  
  const voiceName = gender === 'female' ? 'Kore' : 'Puck';
  
  let tonePrompt = `Read this in a ${tone.toLowerCase()} tone: ${text}`;
  const lowerTone = tone.toLowerCase();
  
  if (lowerTone === 'kid') {
      tonePrompt = `Read this in a high-pitched, enthusiastic, and youthful child's voice: ${text}`;
  } else if (lowerTone === 'baby') {
      tonePrompt = `Read this in a soft, gentle, and babbling baby-like voice: ${text}`;
  }

  try {
      const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: tonePrompt }] }],
        config: {
            // TTS usually doesn't need responseSchema but benefits from safetySettings if input text is unchecked
            safetySettings: SAFETY_SETTINGS,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
        },
      }));

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
          const wavBuffer = createWavBuffer(base64Audio);
          return URL.createObjectURL(new Blob([wavBuffer], { type: 'audio/wav' }));
      }
  } catch (error: any) {
      console.error("TTS generation failed", error);
  }
  return undefined;
};

export const analyzeImage = async (imageUri: string, ageGroup: string): Promise<{ hasHuman: boolean, heroDescription: string, suggestedPlot: string }> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const { mimeType, data } = parseDataUri(imageUri);
  const model = getModelTier().analysis;
  
  if (!data) {
    return { hasHuman: false, heroDescription: "A magical friend.", suggestedPlot: "A grand adventure." };
  }

  try {
    const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: `Analyze this image for a children's story (Target Audience: ${ageGroup}). 
          1. Is there a prominent human character? 
          2. If human: Provide a 1-sentence description for a character biography. 
          3. If NOT human: Identify the main object/animal and describe it as a main character hero.
          4. Based on the image and target age, suggest a 1-sentence story plot topic.
          Respond strictly in JSON format with keys: 'hasHuman' (boolean), 'heroDescription' (string), and 'suggestedPlot' (string).` }
        ]
      },
      config: {
        safetySettings: SAFETY_SETTINGS,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasHuman: { type: Type.BOOLEAN },
            heroDescription: { type: Type.STRING },
            suggestedPlot: { type: Type.STRING }
          },
          required: ["hasHuman", "heroDescription", "suggestedPlot"]
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Image analysis failed", error);
    return { hasHuman: false, heroDescription: "A mysterious magical friend.", suggestedPlot: "A grand adventure in a hidden land." };
  }
};

export const createChatSession = () => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const model = getModelTier().text;
    return ai.chats.create({
        model: model,
        config: { 
            safetySettings: SAFETY_SETTINGS,
            systemInstruction: "You are a friendly, helpful storybook assistant for kids. Keep answers short, fun, and magical." 
        }
    });
};

export const analyzePageReading = async (pageText: string, spokenWords: string[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const model = getModelTier().text;
    const prompt = `
      The child just read a page. 
      Original text: "${pageText}"
      Words correctly spoken: ${JSON.stringify(spokenWords)}
      Give a very short (max 1 sentence), extremely encouraging "Magic Tip" or praise for the child based on their effort.
    `;
    try {
        const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }],
            config: { safetySettings: SAFETY_SETTINGS }
        }));
        return response.text || "You're a reading superstar!";
    } catch (e) {
        return "Magical reading!";
    }
};

export const analyzeReadingPerformance = async (readingData: { pageText: string; spokenWords: string[] }[], coachLog?: string): Promise<{ summary: string; practiceTopic: string }> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const model = getModelTier().text;
  
    const prompt = `
      Analyze a child's reading performance.
      Reading Accuracy Data: ${JSON.stringify(readingData)}
      Coach Interaction History (Comprehension): ${coachLog || "No coach session used."}
      
      1. Identify patterns of missed words or pronunciation struggles.
      2. Analyze the comprehension conversations from the Coach logs. Did the child understand the "big words"?
      3. Write a short, encouraging summary for the parent highlighting both accuracy and understanding.
      4. Suggest a specific topic for a "Bonus Mini-Chapter" to practice these gaps.
      
      Respond strictly in JSON format: { "summary": "...", "practiceTopic": "..." }
    `;
  
    try {
      const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            safetySettings: SAFETY_SETTINGS,
            responseMimeType: "application/json" 
        }
      }));
      return JSON.parse(response.text || '{"summary": "Great job reading!", "practiceTopic": "A fun adventure"}');
    } catch (e) {
      console.error("Analysis failed", e);
      return { summary: "Great reading! Let's keep practicing.", practiceTopic: "A fun adventure" };
    }
  };

export const generateDailyProgressSummary = async (performance: { summary: string; practiceTopic: string }, history: ProgressEntry[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const model = getModelTier().text;
    
    const prompt = `
      Based on the child's latest reading performance and their historical progress, write a very short, encouraging summary for the parent.
      Latest Performance: ${performance.summary}
      Historical Progress: ${JSON.stringify(history.slice(-5))}
      Keep it to 1-2 sentences. Focus on growth and specific areas for future fun practice.
    `;

    try {
        const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }],
            config: { safetySettings: SAFETY_SETTINGS }
        }));
        return response.text || "Your child is do amazing on their reading journey!";
    } catch (e) {
        return "Great job practicing today!";
    }
};

export const explainWordInCharacter = async (word: string, storyContext: string, characterDescription: string, language: string = 'en-US', userQuestion?: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const model = getModelTier().text;
    
    let prompt = "";
    
    if (userQuestion) {
         prompt = `
            You are a character from a children's story.
            Character Personality: ${characterDescription}.
            The child clicked on the word "${word}" in the story and asked: "${userQuestion}".
            Answer the child's question in your character's voice.
            Keep it very short (1-2 sentences), friendly, and simple.
            Respond in the language: ${language}.
         `;
    } else {
        prompt = `
            You are a character from a children's story. 
            Character Personality: ${characterDescription}.
            The child clicked on the word "${word}" in this context: "${storyContext}".
            Explain what this word means or something fun about it in your character's voice.
            Keep it very short (1-2 sentences) and suitable for a child.
            Respond in the language: ${language}.
        `;
    }

    try {
        const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }],
            config: { safetySettings: SAFETY_SETTINGS }
        }));
        return response.text || "I'm not sure, but it sounds magical!";
    } catch (e) {
        return "It's a very special word!";
    }
};

export const generateRecommendations = async (storyHistory: string[], progressSummaries: string[]): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const model = getModelTier().text;
  
  const prompt = `
    Based on the following child's reading history and progress, recommend 3 new story topics they would love.
    Reading History: ${storyHistory.join(', ')}
    Recent Progress Summaries: ${progressSummaries.slice(-3).join('. ')}
    
    Make the topics imaginative, fun, and educational. 
    Respond strictly in JSON format as an array of 3 strings.
  `;

  try {
    const response = await callGenAIWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        safetySettings: SAFETY_SETTINGS,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }));
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Recommendations failed", e);
    return ["A robot that loves ice cream", "The squirrel's secret space rocket", "A dragon who wants to be a chef"];
  }
};
