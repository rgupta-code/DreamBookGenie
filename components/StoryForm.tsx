
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StoryRequest } from '../types';
import { Sparkles, BookOpen, Wand2, X, User, GraduationCap, Loader2, Mic2, Volume2, ImagePlus, Palette, Settings, Layers, Lightbulb, Cloud, Check, AlertTriangle, Link, HelpCircle, Wand, Camera, RefreshCw, Mic, MicOff } from 'lucide-react';
import { getStoredUrl, configureDrive, testConnection } from '../services/storageService';
import { analyzeImage } from '../services/geminiService';

interface StoryFormProps {
  mode: 'story' | 'learning';
  onSubmit: (request: StoryRequest) => void;
  isLoading: boolean;
  initialTopic?: string;
  onStartBrainstorming: () => void;
  voiceGender: 'male' | 'female';
  voiceTone: string;
}

const STYLES = [
  "3D Cartoon",
  "Watercolor",
  "Crayon Drawing",
  "Pixel Art",
  "Claymation",
  "Pencil Art",
  "Realistic Photo",
  "Diagram/Technical",
  "Minimalist",
  "Rustic"
];

const AGE_GROUPS = [
  "Toddler (1-3 years)",
  "Preschool (3-5 years)",
  "School Age (5-8 years)",
  "Pre-teen (9-12 years)"
];

const AGE_APPROPRIATE_IDEAS: Record<string, { story: string[], learning: string[] }> = {
  "Toddler (1-3 years)": {
    story: [
      "The Soft Blue Blanket", "Puppy's Big Day", "The Squeaky Mouse", "Happy Little Cloud", "Duckling's First Swim", "The Sleepy Bear", "Funny Red Ball", "Kitten's Secret Hideout", "The Playful Bunny", "Baby Elephant's Bath", "The Magic Bubbles", "Panda's Bamboo Breakfast"
    ],
    learning: [
      "Red, Blue, and Yellow", "Big and Small", "Farm Animal Sounds", "The Happy Sun", "My Five Fingers", "Shapes All Around", "Counting 1 to 5", "Fruit Colors", "Wheels on the Bus", "Up and Down", "Fast and Slow", "Where is Nose?"
    ]
  },
  "Preschool (3-5 years)": {
    story: [
      "The Dinosaur's Picnic", "The Girl Who Could Fly", "The Magic Treehouse", "Sharing the Big Apple", "A Cat that Speaks Spanish", "The Kingdom of Candy Clouds", "Detective Bunny's Case", "The Star in a Jar", "The Dragon Who Was Afraid of Fire", "The Runaway Pancake", "A Rocket Built of Cardboard", "The Monster Under the Bed Means No Harm"
    ],
    learning: [
      "The Life of a Bee", "How Rain Happens", "Why We Eat Veggies", "The 5 Senses", "Day and Night", "Under the Deep Sea", "Different Kinds of Trucks", "How Seeds Grow", "What Are Shadows?", "Why We Brush Our Teeth", "The Seasons of the Year", "Jobs People Do"
    ]
  },
  "School Age (5-8 years)": {
    story: [
      "Island of Mechanical Toys", "The Secret of the Whispering Woods", "Detective Bunny's Big Case", "The Time-Traveling Toaster", "A Giraffe with a Short Neck", "The Robot's Garden", "Brave Toaster's Forest Hike", "The Invisible Castle", "The Boy Who Painted Dreams", "The Magic Skateboard", "The Lost City of Atlantis", "The Pirate Who Only Stole Books"
    ],
    learning: [
      "How Volcanoes Erupt", "The Solar System Journey", "Ancient Egyptian Pyramids", "The Secret Life of Trees", "What is Gravity?", "How Electricity Works", "The Cycle of Water", "How Planes Fly", "The History of Chocolate", "How the Internet Works", "The Human Skeleton", "Why Do Leaves Change Color?"
    ]
  },
  "Pre-teen (9-12 years)": {
    story: [
      "The Quantum Library", "Lost in the Digital Maze", "The Last Starship to Earth", "Mystery of the Clockwork Kingdom", "The Girl with the Bio-Arm", "Escape from Paradox City", "The AI that Wrote a Poem", "Echoes of the Void", "The Boy Who Remembered Tomorrow", "City of Floating Islands", "The Chrono-Thief", "The Code-Breakers of Mars"
    ],
    learning: [
      "Artificial Intelligence", "Deep Sea Creatures", "History of Video Games", "How DNA Works", "The Human Brain", "Black Holes Explained", "Renewable Energy", "The Renaissance", "The Industrial Revolution", "How Cryptography Works", "The Psychology of Habits", "The Space Race"
    ]
  }
};

const StoryForm: React.FC<StoryFormProps> = ({ mode, onSubmit, isLoading, initialTopic = '', onStartBrainstorming, voiceGender, voiceTone }) => {
  const [topic, setTopic] = useState(initialTopic);
  const [characterName, setCharacterName] = useState('');
  const [characterDescription, setCharacterDescription] = useState('');
  const [style, setStyle] = useState('3D Cartoon');
  const [ageGroup, setAgeGroup] = useState('Preschool (3-5 years)');
  
  const [pageCount, setPageCount] = useState(2);
  const [characterImage, setCharacterImage] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [randomIdeas, setRandomIdeas] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Microphone State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  // Handle random ideas based on mode AND ageGroup
  const refreshIdeas = () => {
    const groupData = AGE_APPROPRIATE_IDEAS[ageGroup] || AGE_APPROPRIATE_IDEAS["Preschool (3-5 years)"];
    const source = mode === 'story' ? groupData.story : groupData.learning;
    const shuffled = [...source].sort(() => 0.5 - Math.random());
    setRandomIdeas(shuffled.slice(0, 4));
  };

  useEffect(() => {
    refreshIdeas();
  }, [mode, ageGroup]);

  // Fix: Ensure video stream is attached to the video element when it mounts
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
      setIsCameraOpen(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        alert("Camera permission denied. Please allow camera access in your browser settings to take photos.");
      } else {
        alert("Could not access camera.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        handleProcessedImage(dataUrl);
      }
      stopCamera();
    }
  };

  const handleProcessedImage = (dataUrl: string) => {
    setCharacterImage(dataUrl);
    setIsUploading(false);
  };

  const analyzeCurrentPhoto = async () => {
      if (!characterImage) return;
      setIsUploading(true);
      try {
        const analysis = await analyzeImage(characterImage, ageGroup);
        setCharacterDescription(analysis.heroDescription);
        if (analysis.suggestedPlot) {
            setTopic(analysis.suggestedPlot);
        }
        if (!analysis.hasHuman) {
            if (!characterName) setCharacterName("Our Hero");
        }
      } catch (e) {
        console.error("Analysis error", e);
        alert("Magic wand fizzled! Try again.");
      } finally {
        setIsUploading(false);
      }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const TARGET_SIZE = 512;
          if (width > height) {
            if (width > TARGET_SIZE) {
              height *= TARGET_SIZE / width;
              width = TARGET_SIZE;
            }
          } else {
            if (height > TARGET_SIZE) {
              width *= TARGET_SIZE / height;
              height = TARGET_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error("Canvas error")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const resizedImage = await resizeImage(file);
        handleProcessedImage(resizedImage);
      } catch (error) {
        alert("Could not process image.");
        setIsUploading(false);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const clearImage = () => {
    setCharacterImage(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isUploading) return;
    onSubmit({ 
      topic, 
      characterName, 
      characterDescription, 
      style, 
      characterImage, 
      ageGroup, 
      mode,
      voiceGender,
      voiceTone,
      pageCount
    });
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.interimResults = false; // Capture only final result for simplicity
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
           setTopic(prev => {
               const trailingSpace = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
               return prev + trailingSpace + transcript;
           });
      }
    };

    recognition.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        setIsListening(false);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    try {
        recognition.start();
        recognitionRef.current = recognition;
    } catch (e) {
        console.error("Speech Start Error", e);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center">
      <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] flex-1 flex flex-col overflow-hidden relative border border-slate-100">
        
        {isCameraOpen && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 animate-fade-in">
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-md rounded-3xl shadow-2xl mb-6 bg-slate-900" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-4">
              <button type="button" onClick={stopCamera} className="p-4 bg-white/20 text-white rounded-full hover:bg-white/30 transition-all"><X className="w-8 h-8" /></button>
              <button type="button" onClick={takePhoto} className="p-6 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all transform active:scale-90"><Camera className="w-10 h-10" /></button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 md:p-8 pb-40 md:pb-8 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            {mode === 'story' ? (
                <div className="flex flex-col md:flex-row gap-6 shrink-0">
                    <div className="md:w-1/4 flex flex-col gap-2">
                        <div className="flex items-center justify-between px-2">
                            <label className="font-black text-indigo-900 text-sm">Photo Hero</label>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); startCamera(); }}
                              className="p-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                              title="Take Photo"
                            >
                                <Camera className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div 
                            className={`w-full aspect-square md:aspect-auto md:flex-1 min-h-[110px] rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 transition-all cursor-pointer flex flex-col items-center justify-center group overflow-hidden relative ${isLoading ? 'pointer-events-none opacity-80' : ''}`}
                            onClick={() => !characterImage && !isUploading && fileInputRef.current?.click()}
                        >
                            {characterImage ? (
                                <>
                                    <img 
                                        src={characterImage} 
                                        alt="Character" 
                                        className={`w-full h-full object-cover transition-all duration-500 ${isUploading ? 'blur-sm scale-105 opacity-50' : ''}`} 
                                    />
                                    
                                    {isUploading && (
                                         <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-1" />
                                            <span className="text-indigo-800 text-[10px] font-black uppercase bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm"> analyzing...</span>
                                        </div>
                                    )}

                                    {!isUploading && !isLoading && (
                                        <>
                                            {/* X icon on top left as requested */}
                                            <button 
                                                type="button" 
                                                onClick={(e) => { e.stopPropagation(); clearImage(); }} 
                                                className="absolute top-2 left-2 p-1.5 bg-white/90 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-md z-20"
                                                title="Remove Image"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>

                                            {/* Wand on top right with transparent background as requested */}
                                            <button 
                                                type="button" 
                                                onClick={(e) => { e.stopPropagation(); analyzeCurrentPhoto(); }} 
                                                className="absolute top-2 right-2 p-2 bg-transparent text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] rounded-full hover:scale-125 transition-all z-20 animate-pulse-slow"
                                                title="Analyze Image with Magic"
                                            >
                                                <Wand2 className="w-6 h-6" />
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                isUploading ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-1" />
                                        <span className="text-indigo-600 text-[10px] font-bold uppercase">Processing...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <ImagePlus className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <span className="text-indigo-400 text-xs font-bold text-center px-3 leading-tight">Tap to Upload</span>
                                    </div>
                                )
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </div>
                    </div>

                    <div className="md:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                        <div className="col-span-1">
                            <label className="block text-sm font-black text-indigo-900 mb-1 ml-2">Hero's Name <span className="text-slate-400 font-normal text-xs">(Optional)</span></label>
                            <input type="text" disabled={isLoading} placeholder="e.g. Timmy" className="w-full p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-indigo-500 focus:bg-white outline-none disabled:bg-slate-100 transition-all text-indigo-900 placeholder-slate-400 font-bold text-base" value={characterName} onChange={(e) => setCharacterName(e.target.value)} />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-black text-indigo-900 mb-1 ml-2">Art Style</label>
                            <div className="relative">
                                <select disabled={isLoading} className="w-full p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-indigo-500 focus:bg-white outline-none disabled:bg-slate-100 text-indigo-900 appearance-none font-bold text-base" value={style} onChange={(e) => setStyle(e.target.value)}>
                                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                    <Palette className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-black text-indigo-900 mb-1 ml-2">Age Group</label>
                            <div className="relative">
                                <select disabled={isLoading} className="w-full p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-indigo-500 focus:bg-white outline-none disabled:bg-slate-100 text-indigo-900 appearance-none font-bold text-base" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                                    {AGE_GROUPS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                    <User className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-black text-indigo-900 mb-1 ml-2">Page Count</label>
                            <div className="relative">
                                <select disabled={isLoading} className="w-full p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-indigo-500 focus:bg-white outline-none disabled:bg-slate-100 text-indigo-900 appearance-none font-bold text-base" value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value))}>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} {v === 1 ? 'Page' : 'Pages'}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                    <Layers className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-black text-indigo-900 mb-1 ml-2">Describe the Hero <span className="text-slate-400 font-normal text-xs">(Optional)</span></label>
                            <textarea disabled={isLoading} placeholder="e.g. A happy girl with red glasses" className="w-full p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 resize-none disabled:bg-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-indigo-900 placeholder-slate-400 font-bold leading-snug text-base" rows={2} value={characterDescription} onChange={(e) => setCharacterDescription(e.target.value)} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
                    <div className="col-span-1">
                        <label className="block text-sm font-black text-indigo-900 mb-1 ml-2">Age Group</label>
                        <div className="relative">
                            <select disabled={isLoading} className="w-full p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 disabled:bg-slate-100 focus:border-sky-500 focus:bg-white outline-none text-indigo-900 font-bold appearance-none text-base" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                                {AGE_GROUPS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                <User className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-black text-indigo-900 mb-1 ml-2">Illustration Style</label>
                        <div className="relative">
                            <select disabled={isLoading} className="w-full p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 disabled:bg-slate-100 focus:border-sky-500 focus:bg-white outline-none text-indigo-900 font-bold appearance-none text-base" value={style} onChange={(e) => setStyle(e.target.value)}>
                                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                <Palette className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-black text-indigo-900 mb-1 ml-2">Page Count</label>
                        <div className="relative">
                            <select disabled={isLoading} className="w-full p-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-sky-500 focus:bg-white outline-none disabled:bg-slate-100 text-indigo-900 appearance-none font-bold text-base" value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value))}>
                                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} {v === 1 ? 'Page' : 'Pages'}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                                <Layers className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="shrink-0 flex flex-col gap-3">
                <label className="block text-base font-black text-indigo-900 mb-1 ml-2">{mode === 'story' ? "What is the story about?" : "What do you want to learn about?"}</label>
                
                <div className="relative flex gap-3">
                    <div className="relative flex-1">
                        <textarea 
                            disabled={isLoading} 
                            required 
                            placeholder={mode === 'story' ? "e.g. A space dinosaur who wants to dance" : "e.g. How volcanoes work"} 
                            className={`w-full p-5 pl-14 pr-32 rounded-xl border-2 border-slate-100 bg-slate-50 disabled:bg-slate-100 focus:bg-white outline-none transition-all text-indigo-900 placeholder-slate-400 font-bold text-lg resize-none min-h-[80px] ${mode === 'story' ? 'focus:border-indigo-500' : 'focus:border-sky-500'}`} 
                            value={topic} 
                            onChange={(e) => setTopic(e.target.value)} 
                        />
                        <div className="absolute left-5 top-6 pointer-events-none text-indigo-400">
                            {mode === 'story' ? <BookOpen className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                        </div>
                        
                        <div className="absolute right-4 top-4 flex gap-2">
                             <button 
                                type="button" 
                                onClick={toggleListening}
                                className={`p-2.5 rounded-lg transition-all shadow-sm group ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100'}`}
                                title="Speak"
                            >
                                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>

                            <button 
                                type="button" 
                                onClick={onStartBrainstorming}
                                className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
                                title="Magic Brainstorming"
                            >
                                <Wand className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Suggestions Section */}
                <div className="mt-2 animate-fade-in">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Lightbulb className="w-3 h-3 text-yellow-400" /> Magic Ideas ({ageGroup.split(' ')[0]})
                        </span>
                        <button 
                            type="button" 
                            onClick={refreshIdeas}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-indigo-500 border border-slate-100 hover:border-indigo-200"
                            title="More Ideas"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {randomIdeas.map((idea, idx) => (
                            <button
                                key={idea}
                                type="button"
                                onClick={() => setTopic(idea)}
                                className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-all transform hover:scale-105 active:scale-95 ${
                                    topic === idea 
                                    ? (mode === 'story' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-sky-600 border-sky-600 text-white shadow-md')
                                    : (mode === 'story' ? 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:border-indigo-300' : 'bg-sky-50 border-sky-100 text-sky-600 hover:border-sky-300')
                                }`}
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                {idea}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <button type="submit" disabled={isLoading || isUploading} className={`w-full py-2.5 mt-auto mb-6 md:mb-0 font-black text-lg rounded-2xl shadow-lg transition-all text-white flex items-center justify-center gap-3 transform active:scale-[0.98] group shrink-0 ${(isLoading || isUploading) ? 'bg-slate-300 cursor-not-allowed shadow-none' : (mode === 'story' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/30' : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 hover:shadow-sky-500/30')}`}>
                {isLoading ? <><Loader2 className="w-6 h-6 animate-spin" /> Creating Magic...</> : <><Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" /> {mode === 'story' ? "Create Story!" : "Create Learning Book!"}</>}
            </button>
        </form>
      </div>
      <style>{`.animate-spin-slow { animation: spin-slow 8s linear infinite; } @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }`}</style>
    </div>
  );
};

export default StoryForm;
