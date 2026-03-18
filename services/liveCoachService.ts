
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface CoachCallbacks {
    onVolumeUpdate: (inputVolume: number, outputVolume: number) => void;
    onTranscriptionUpdate: (role: 'user' | 'model', text: string, isFinal: boolean) => void;
    onError: (error: Error) => void;
}

// Helper functions as per guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export class LiveCoachSession {
    private sessionPromise: Promise<any> | null = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private inputSource: MediaStreamAudioSourceNode | null = null;
    private processor: ScriptProcessorNode | null = null;
    private nextStartTime: number = 0;
    private callbacks: CoachCallbacks;
    private sources = new Set<AudioBufferSourceNode>();
    
    private inputAnalyser: AnalyserNode | null = null;
    private outputAnalyser: AnalyserNode | null = null;
    private outputNode: GainNode | null = null;
    private animationFrame: number | null = null;

    private currentInputTranscription: string = '';
    private currentOutputTranscription: string = '';

    private lastInteractionTime: number = Date.now();
    private silenceTimer: any = null;
    private SILENCE_THRESHOLD = 12000; // 12 seconds of total silence before nudge

    constructor(callbacks: CoachCallbacks) {
        this.callbacks = callbacks;
    }

    private resetSilenceTimer() {
        this.lastInteractionTime = Date.now();
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
            // Only nudge if we aren't already talking
            const timeSinceLast = Date.now() - this.lastInteractionTime;
            if (timeSinceLast >= this.SILENCE_THRESHOLD) {
                this.updateContext("[SYSTEM NUDGE]: The child has been silent for a while. Gently check in with them or ask if they need help with the next sentence.");
            }
        }, this.SILENCE_THRESHOLD);
    }

    async connect(initialContext: string, systemInstruction: string, voiceName: string = 'Kore') {
        const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
        const client = new GoogleGenAI({ apiKey: apiKey });
        
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        this.outputNode = this.outputAudioContext.createGain();
        this.outputAnalyser = this.outputAudioContext.createAnalyser();
        this.outputNode.connect(this.outputAnalyser);
        this.outputAnalyser.connect(this.outputAudioContext.destination);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const sessionPromise = client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                // Safety settings are not currently supported in LiveConnectConfig
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
                },
                systemInstruction: systemInstruction,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => {
                    this.startAudioInput(stream, sessionPromise);
                    this.startPolling();
                    this.resetSilenceTimer();
                },
                onmessage: async (message: LiveServerMessage) => {
                    this.resetSilenceTimer();

                    // Handle Transcriptions
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        this.currentInputTranscription += text;
                        this.callbacks.onTranscriptionUpdate('user', this.currentInputTranscription, false);
                    } else if (message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        this.currentOutputTranscription += text;
                        this.callbacks.onTranscriptionUpdate('model', this.currentOutputTranscription, false);
                    }

                    if (message.serverContent?.turnComplete) {
                        this.callbacks.onTranscriptionUpdate('user', this.currentInputTranscription, true);
                        this.callbacks.onTranscriptionUpdate('model', this.currentOutputTranscription, true);
                        this.currentInputTranscription = '';
                        this.currentOutputTranscription = '';
                    }

                    // Handle Audio
                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData && this.outputAudioContext && this.outputNode) {
                        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                        const audioBuffer = await decodeAudioData(
                            decode(audioData),
                            this.outputAudioContext,
                            24000,
                            1
                        );
                        const source = this.outputAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(this.outputNode);
                        source.addEventListener('ended', () => this.sources.delete(source));
                        source.start(this.nextStartTime);
                        this.nextStartTime += audioBuffer.duration;
                        this.sources.add(source);
                    }

                    if (message.serverContent?.interrupted) {
                        this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
                        this.sources.clear();
                        this.nextStartTime = 0;
                        this.currentOutputTranscription = '';
                        this.callbacks.onTranscriptionUpdate('model', '', true);
                    }
                },
                onclose: () => {
                    this.stopPolling();
                    if (this.silenceTimer) clearTimeout(this.silenceTimer);
                },
                onerror: (e) => {
                    console.error("Live session error:", e);
                    this.callbacks.onError(new Error("Connection error"));
                }
            }
        });
        
        this.sessionPromise = sessionPromise;
        return sessionPromise;
    }

    private startAudioInput(stream: MediaStream, sessionPromise: Promise<any>) {
        if (!this.inputAudioContext) return;

        this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
        this.inputAnalyser = this.inputAudioContext.createAnalyser();
        this.inputSource.connect(this.inputAnalyser);

        this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Check for significant input to reset silence timer
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            if (rms > 0.01) this.resetSilenceTimer();

            const pcmBlob = createBlob(inputData);
            sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        };

        this.inputSource.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
    }

    private startPolling() {
        const inputData = new Float32Array(this.inputAnalyser?.fftSize || 2048);
        const outputData = new Float32Array(this.outputAnalyser?.fftSize || 2048);

        const poll = () => {
            let inputVol = 0;
            if (this.inputAnalyser) {
                this.inputAnalyser.getFloatTimeDomainData(inputData);
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                inputVol = Math.sqrt(sum / inputData.length);
            }

            let outputVol = 0;
            if (this.outputAnalyser) {
                this.outputAnalyser.getFloatTimeDomainData(outputData);
                let sum = 0;
                for (let i = 0; i < outputData.length; i++) sum += outputData[i] * outputData[i];
                outputVol = Math.sqrt(sum / outputData.length);
            }

            this.callbacks.onVolumeUpdate(inputVol, outputVol);
            this.animationFrame = requestAnimationFrame(poll);
        };

        this.animationFrame = requestAnimationFrame(poll);
    }

    private stopPolling() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    updateContext(message: string) {
        this.sessionPromise?.then(session => {
            session.sendRealtimeInput({ 
                text: message 
            });
        });
    }

    disconnect() {
        this.stopPolling();
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
        this.sources.clear();
        if (this.inputSource) this.inputSource.disconnect();
        if (this.processor) this.processor.disconnect();
        if (this.inputAudioContext) this.inputAudioContext.close().catch(() => {});
        if (this.outputAudioContext) this.outputAudioContext.close().catch(() => {});
        
        this.sessionPromise?.then(session => {
            try { session.close(); } catch (e) {}
        });
        this.sessionPromise = null;
    }
}
