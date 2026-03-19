
import React, { useState, useEffect, useRef } from 'react';
import { LiveCoachSession } from '../services/liveCoachService';
import { Sparkles, X, Wand2, Mic, Volume2, Star, Loader2, Rocket, Castle, Cloud, Moon, Ship, Crown, Telescope, Ghost, Rabbit, Heart, Balloon, Gem, Snowflake, AlertCircle, Info, Minus, HelpCircle } from 'lucide-react';

interface BrainstormingScreenProps {
  onFinish: (narration: string) => void;
  onCancel: () => void;
}

const StorySparkAvatar: React.FC<{ isTalking: boolean; volume: number; isListening: boolean; hasError?: boolean; text?: string; className?: string }> = ({ isTalking, volume, isListening, hasError, text, className }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Detect emotion for "laughing" state
  const isLaughing = text ? /haha|laugh|funny|great|yay|wow|fun|happy/i.test(text) : false;

  // Blink Timer
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200); 
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Smooth Volume Transition
  const [smoothVol, setSmoothVol] = useState(0);
  useEffect(() => {
    if (isTalking) {
        // Interpolate upwards
        setSmoothVol(prev => prev + (volume - prev) * 0.3);
    } else {
        // Decay downwards
        setSmoothVol(prev => prev * 0.8); 
    }
  }, [volume, isTalking]);

  // Mouth Shape Calculations
  const mouthW = 20 + (smoothVol * 25);
  const mouthH = isTalking ? Math.max(8, smoothVol * 40) : 0;
  
  return (
    <div className={`relative flex items-center justify-center animate-float ${className || "w-64 h-64 md:w-80 md:h-80"}`}>
      
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-yellow-400/30 blur-[50px] rounded-full animate-pulse-slow"></div>

      {/* --- AVATAR SVG --- */}
      <svg viewBox="0 0 400 400" className="w-full h-full absolute inset-0 z-10 drop-shadow-2xl">
        <defs>
            <linearGradient id="starGradient" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="#FDE047" /> {/* Yellow-300 */}
                <stop offset="100%" stopColor="#EAB308" /> {/* Yellow-500 */}
            </linearGradient>
            <filter id="blushBlur">
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
            </filter>
            <filter id="softGlow">
                <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#FDE047" floodOpacity="0.5"/>
            </filter>
        </defs>

        {/* Global Scale Group for Size Reduction: Scale 0.6 makes it small and cute */}
        <g transform="translate(200, 200) scale(0.6) translate(-200, -200)">

            {/* Star Body - "Lullaby" Shape with Rounded Tips */}
            <g transform="translate(200, 215)">
                {/* 
                   Path Construction for Rounded/Chubby Star:
                   Uses Q curves at the tips instead of sharp points.
                   Coordinates are relative to center (0,0) of this group.
                */}
                <path 
                    d="
                      M -20,-140 
                      Q 0,-180 20,-140      
                      L 55,-55             
                      L 140,-50            
                      Q 180,-40 145,-15    
                      L 75,45              
                      L 100,130            
                      Q 90,170 60,140      
                      L 0,85               
                      L -60,140            
                      Q -90,170 -100,130   
                      L -75,45             
                      L -145,-15           
                      Q -180,-40 -140,-50  
                      L -55,-55            
                      Z
                    "
                    fill="url(#starGradient)" 
                    stroke="#EAB308" 
                    strokeWidth="8" 
                    strokeLinejoin="round" 
                    strokeLinecap="round"
                    filter="url(#softGlow)"
                />
                
                {/* Inner highlight for 3D Puffy effect - Adjusted to new shape */}
                <path 
                    d="
                      M -10,-110
                      Q 0,-130 10,-110
                      L 35,-50
                      L 100,-40
                      L 50,20
                      L 70,90
                      L 0,55
                      L -70,90
                      L -50,20
                      L -100,-40
                      L -35,-50
                      Z
                    "
                    fill="#FEF9C3" 
                    opacity="0.4"
                    stroke="none"
                />
            </g>

            {/* Face Container */}
            <g transform="translate(200, 215)">
                
                {/* Blush */}
                <ellipse cx="-60" cy="30" rx="25" ry="15" fill="#F472B6" opacity="0.6" filter="url(#blushBlur)" />
                <ellipse cx="60" cy="30" rx="25" ry="15" fill="#F472B6" opacity="0.6" filter="url(#blushBlur)" />

                {/* Eyes */}
                <g transform="translate(0, -10)">
                    {/* Left Eye */}
                    <g transform="translate(-50, 0)">
                        {isBlinking ? (
                             <path d="M-18,0 Q0,8 18,0" stroke="#713F12" strokeWidth="5" fill="none" strokeLinecap="round" />
                        ) : (
                            <g>
                                <circle r="16" fill="#422006" />
                                <circle cx="-5" cy="-5" r="6" fill="white" opacity="0.95" />
                                <circle cx="6" cy="6" r="3" fill="white" opacity="0.7" />
                            </g>
                        )}
                    </g>

                    {/* Right Eye */}
                    <g transform="translate(50, 0)">
                        {isBlinking ? (
                             <path d="M-18,0 Q0,8 18,0" stroke="#713F12" strokeWidth="5" fill="none" strokeLinecap="round" />
                        ) : (
                            <g>
                                <circle r="16" fill="#422006" />
                                <circle cx="-5" cy="-5" r="6" fill="white" opacity="0.95" />
                                <circle cx="6" cy="6" r="3" fill="white" opacity="0.7" />
                            </g>
                        )}
                    </g>
                </g>

                {/* Mouth */}
                <g transform="translate(0, 45)">
                     {isTalking ? (
                         isLaughing ? (
                             // Happy Open Mouth (Laughing)
                             <path 
                                d={`M -${mouthW/1.5} -5 Q 0 ${mouthH + 15} ${mouthW/1.5} -5 Z`} 
                                fill="#BE185D" 
                                style={{ transition: 'd 0.1s ease-out' }}
                             />
                         ) : (
                             // Normal Speaking (Cute rounded rect/oval shape)
                             <rect
                                x={-mouthW/2} y={-5} width={mouthW} height={mouthH} rx={mouthW/2}
                                fill="#BE185D"
                                style={{ transition: 'all 0.1s ease-out' }}
                             />
                         )
                     ) : (
                         // Idle Smile (Tiny and cute)
                         <path d="M -10 -5 Q 0 5 10 -5" stroke="#713F12" strokeWidth="4" fill="none" strokeLinecap="round" style={{ transition: 'd 0.3s ease' }} />
                     )}
                </g>
            </g>
        </g>
      </svg>

      {/* Status Indicators */}
      {isListening && !isTalking && (
         <div className="absolute top-4 right-8 animate-bounce z-30">
            <div className="bg-white p-2.5 rounded-full shadow-lg border-2 border-indigo-100 flex items-center justify-center">
                <Mic className="w-5 h-5 text-indigo-500" />
            </div>
         </div>
      )}
    </div>
  );
};

const BrainstormingScreen: React.FC<BrainstormingScreenProps> = ({ onFinish, onCancel }) => {
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [botResponse, setBotResponse] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInfoMinimized, setIsInfoMinimized] = useState(false);
  const sessionRef = useRef<LiveCoachSession | null>(null);

  useEffect(() => {
    const startSession = async () => {
      const savedGender = localStorage.getItem('magic_storybook_voice_gender') || 'female';
      const savedTone = localStorage.getItem('magic_storybook_voice_tone') || 'Cheerful';
      const voiceName = savedGender === 'female' ? 'Kore' : 'Puck';

      const session = new LiveCoachSession({
        onVolumeUpdate: (inputVol, outputVol) => {
          setVolume(Math.max(inputVol, outputVol));
          setIsTalking(outputVol > 0.05);
          setIsListening(inputVol > 0.05);
        },
        onTranscriptionUpdate: (role, text, isFinal) => {
          if (role === 'user' && isFinal) {
            setTranscription(prev => prev + ' ' + text);
          }
          if (role === 'model') {
            setBotResponse(text);
          }
        },
        onError: (e: any) => {
          console.error("Brainstorming error:", e);
          if (e.message?.includes("HTTPS") || e.message?.includes("Microphone access is blocked")) {
              setErrorMessage(e.message);
          } else if (e.message?.includes("Permission denied")) {
              setErrorMessage("The Dreaming Chamber needs to hear your story ideas! Please enable your microphone in the browser settings.");
          } else {
              setErrorMessage("Something went wrong with the magic. Please try again!");
          }
          setIsConnecting(false);
        }
      });

      const instruction = `
        You are the "Story Spark," a friendly magical talking star guide.
        Your goal is to help a child come up with a story idea.
        IMPORTANT: Your personality and voice should be ${savedTone.toLowerCase()}.
        1. Greet the child warmly and magically in a ${savedTone.toLowerCase()} way.
        2. Ask them 1-2 fun questions like "Who is your hero?" or "Where does our adventure take place?".
        3. Encourage them to talk as much as they want!
        4. When the child seems finished or says they are ready, summarize the entire story idea in one concise magical sentence.
        Keep your responses very short, energetic, and magical. 
        DO NOT use technical tags.
      `;

      try {
        await session.connect("Let's invent a story together!", instruction, voiceName);
        sessionRef.current = session;
        session.updateContext(`Please greet the child in a ${savedTone.toLowerCase()} way and ask what kind of adventure they want to go on today!`);
        setIsConnecting(false);
      } catch (e: any) {
        if (e.name === 'NotAllowedError' || e.message?.includes("Permission denied")) {
            setErrorMessage("Microphone permission was denied. The Dreaming Chamber needs your voice to cast the story spell!");
        } else {
            setErrorMessage("Failed to wake up the Magic Chamber. Please try again.");
        }
        setIsConnecting(false);
      }
    };

    startSession();

    return () => {
      sessionRef.current?.disconnect();
    };
  }, []);

  const handleCastSpell = () => {
    onFinish(transcription.trim() || "A magical surprise adventure!");
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-white flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[30rem] h-[30rem] bg-indigo-100/50 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[10%] right-[20%] w-[25rem] h-[25rem] bg-pink-100/50 rounded-full blur-[100px]"></div>
          <div className="absolute top-[40%] right-[10%] w-[20rem] h-[20rem] bg-yellow-100/40 rounded-full blur-[80px]"></div>
      </div>

      <button onClick={onCancel} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-all z-20 shadow-sm border border-white"><X className="w-6 h-6" /></button>

      <div className="relative w-full max-w-2xl flex flex-col items-center border-4 border-dotted border-indigo-200 rounded-[3rem] bg-white px-8 pb-10 pt-12 shadow-inner overflow-hidden max-h-[90vh]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.18]">
            <Castle className="absolute top-10 left-10 w-24 h-24 text-indigo-300 animate-slow-float" style={{ '--delay': '0s', '--rotate': '-12deg' } as any} />
            <Rocket className="absolute bottom-20 right-10 w-20 h-20 text-pink-300 animate-slow-float" style={{ '--delay': '-4s', '--rotate': '12deg' } as any} />
            <Star className="absolute top-20 right-20 w-12 h-12 text-yellow-300 animate-slow-float" style={{ '--delay': '-8s' } as any} />
            <Rabbit className="absolute bottom-10 left-20 w-16 h-16 text-sky-300 animate-slow-float" style={{ '--delay': '-2s' } as any} />
            <Moon className="absolute top-40 right-5 w-14 h-14 text-purple-300 animate-slow-float" style={{ '--delay': '-10s', '--rotate': '-45deg' } as any} />
            <Crown className="absolute top-5 right-40 w-10 h-10 text-amber-300 animate-slow-float" style={{ '--delay': '-6s' } as any} />
            <Telescope className="absolute bottom-40 right-24 w-12 h-12 text-slate-300 animate-slow-float" style={{ '--delay': '-12s', '--rotate': '25deg' } as any} />
            <Ghost className="absolute top-1/2 left-5 w-12 h-12 text-indigo-100 animate-slow-float" style={{ '--delay': '-14s' } as any} />
            <Heart className="absolute top-[15%] left-[45%] w-10 h-10 text-rose-300 animate-slow-float" style={{ '--delay': '-3s' } as any} />
            <Balloon className="absolute bottom-[30%] left-[10%] w-14 h-14 text-sky-400 animate-slow-float" style={{ '--delay': '-7s', '--rotate': '5deg' } as any} />
            <Gem className="absolute top-[60%] right-[15%] w-10 h-10 text-emerald-300 animate-slow-float" style={{ '--delay': '-5s' } as any} />
            <Snowflake className="absolute top-[35%] left-[25%] w-8 h-8 text-blue-200 animate-slow-float" style={{ '--delay': '-11s' } as any} />
            <Star className="absolute bottom-[15%] right-[45%] w-8 h-8 text-yellow-200 animate-slow-float" style={{ '--delay': '-1s' } as any} />
            <Heart className="absolute bottom-[45%] right-[5%] w-6 h-6 text-pink-200 animate-slow-float" style={{ '--delay': '-9s' } as any} />
        </div>

        <div className="relative flex flex-col items-center w-full gap-2 z-10">
            <h2 className="text-3xl md:text-4xl font-black text-indigo-900 mb-1 flex items-center justify-center gap-3 text-center w-full"><Sparkles className="text-yellow-400 w-8 h-8 animate-pulse" /> Dreaming Chamber</h2>
            
            <div className="mb-2 shrink-0">
                <StorySparkAvatar 
                    isTalking={isTalking} 
                    volume={volume} 
                    isListening={isListening} 
                    hasError={!!errorMessage} 
                    text={botResponse} 
                    className="w-48 h-48 md:w-56 md:h-56"
                />
            </div>
            
            <div className="flex flex-row items-center justify-center gap-4 mb-4 w-full">
                {!errorMessage ? (
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg border-2 border-indigo-50 text-indigo-900 font-black text-xs md:text-sm uppercase tracking-widest animate-fade-in transition-all whitespace-nowrap">
                        {isConnecting ? (
                            <><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Waking Magic...</>
                        ) : isTalking ? (
                            <><Volume2 className="w-4 h-4 text-indigo-600 animate-bounce" /> I'm Speaking...</>
                        ) : (
                            <><Mic className={`w-4 h-4 text-rose-500 ${isListening ? 'animate-pulse' : ''}`} /> I'm Listening...</>
                        )}
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-red-50 text-red-600 rounded-full border border-red-100 font-bold text-xs animate-fade-in">
                        <AlertCircle className="w-4 h-4" /> Magic Blocked
                    </div>
                )}

                {!errorMessage && (
                    <button onClick={handleCastSpell} disabled={isConnecting} className="group relative px-6 py-3 bg-indigo-600 text-white rounded-full font-black text-sm md:text-base shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_40px_rgba(79,70,229,0.4)] transition-all transform hover:scale-[1.03] active:scale-95 disabled:opacity-50 flex items-center gap-2 overflow-visible whitespace-nowrap">
                        <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Create Book
                    </button>
                )}
            </div>

            <div className={`bg-slate-50 rounded-[1.5rem] p-6 border shadow-lg shadow-indigo-100/10 w-full mb-4 min-h-[100px] flex items-center justify-center transition-all ${errorMessage ? 'border-red-100 bg-red-50/30' : 'border-indigo-50 bg-slate-50'}`}>
                {errorMessage ? (
                    <p className="text-sm md:text-base text-red-700 font-bold leading-relaxed text-center">{errorMessage}</p>
                ) : botResponse ? (
                    <p className="text-xl md:text-2xl text-indigo-800 font-bold leading-relaxed italic animate-fade-in text-center">"{botResponse}"</p>
                ) : (
                    <p className="text-indigo-300 font-bold text-lg animate-pulse text-center">Tell me what happens in our adventure!</p>
                )}
            </div>

            {errorMessage && (
                <div className="flex gap-4">
                    <button onClick={onCancel} className="px-12 py-5 bg-slate-200 text-slate-700 rounded-[1.5rem] font-black text-xl hover:bg-slate-300 transition-all transform active:scale-95">
                        Go Back
                    </button>
                </div>
            )}
        </div>
      </div>
      
      {/* Information Box */}
      <div className={`absolute bottom-6 left-6 z-30 transition-all duration-300 ${isInfoMinimized ? 'w-auto' : 'max-w-[300px]'} hidden md:block animate-fade-in`} style={{ animationDelay: '0.5s' }}>
          {isInfoMinimized ? (
              <button 
                  onClick={() => setIsInfoMinimized(false)}
                  className="bg-white/90 backdrop-blur-md p-4 rounded-full shadow-xl border-2 border-indigo-100 hover:scale-110 transition-transform group"
                  title="Need help?"
              >
                  <HelpCircle className="w-8 h-8 text-indigo-600 group-hover:rotate-12 transition-transform" />
              </button>
          ) : (
              <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-2xl border-2 border-indigo-100 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"></div>
                  
                  {/* Minimize Button */}
                  <button 
                      onClick={() => setIsInfoMinimized(true)}
                      className="absolute top-4 right-4 p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                      title="Minimize"
                  >
                      <Minus className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col gap-3">
                      <div>
                          <h4 className="font-black text-indigo-900 text-lg mb-2">Need help with your story?</h4>
                          <p className="text-slate-600 text-xs font-bold leading-relaxed mb-4">
                              The <span className="text-indigo-600">Story Spark</span> is listening! Use your voice to invent a new adventure together.
                          </p>
                          <ul className="text-xs font-bold text-slate-500 space-y-2">
                              <li className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                                  Say "Hello" or answer the question.
                              </li>
                              <li className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                                  Describe your hero or setting.
                              </li>
                              <li className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                                  Click <b>Cast Story Spell</b> when ready!
                              </li>
                          </ul>
                      </div>
                  </div>
              </div>
          )}
      </div>

      <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } } .animate-float { animation: float 4s ease-in-out infinite; } @keyframes slow-float { 0%, 100% { transform: translate(0, 0) rotate(var(--rotate, 0deg)); } 33% { transform: translate(12px, -18px) rotate(calc(var(--rotate, 0deg) + 5deg)); } 66% { transform: translate(-12px, 12px) rotate(calc(var(--rotate, 0deg) - 5deg)); } } .animate-slow-float { animation: slow-float 15s ease-in-out infinite; animation-delay: var(--delay, 0s); } .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default BrainstormingScreen;
