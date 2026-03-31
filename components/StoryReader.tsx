
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Story, StoryPage, ProgressEntry } from '../types';
import { ChevronLeft, ChevronRight, Home, Play, Pause, Mic, MicOff, Star, X, Check, Save, Download, Loader2, NotebookPen, BookOpen, RotateCcw, Wand2, Sparkles, Wand, UserCircle, Volume2, MessageSquareText, Minimize2, Maximize2, Bot, Cloud, Link, AlertTriangle } from 'lucide-react';
import { saveStoryToLibrary, isConfigured, getAllProgress, saveProgressToLibrary, configureDrive, getStoredUrl } from '../services/storageService';
import { generateStoryPDF } from '../services/pdfService';
import { analyzeReadingPerformance, analyzePageReading, generateSpeech, generateDailyProgressSummary, explainWordInCharacter } from '../services/geminiService';
import { LiveCoachSession } from '../services/liveCoachService';

interface StoryReaderProps {
  story: Story;
  onHome: () => void;
  onCreateBonusStory?: (topic: string) => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const WordStar: React.FC<{ count: number }> = ({ count }) => {
  const [animate, setAnimate] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 500);
      return () => clearTimeout(timer);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <div className="flex flex-col items-center justify-center animate-fade-in">
      <div className={`relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center transition-all duration-300 ${animate ? 'scale-125 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]' : 'drop-shadow-md'}`}>
        <svg viewBox="0 0 24 24" className={`w-full h-full text-yellow-400 fill-yellow-400 transition-colors ${animate ? 'text-yellow-300' : ''}`}>
           <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pt-1 text-xs md:text-sm font-black text-yellow-900">{count}</span>
      </div>
      <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mt-1">Stars</span>
    </div>
  );
};

const StarShower: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(false), 30000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const isMobile = window.innerWidth < 768;
        const stars: any[] = [];
        for (let i = 0; i < 100; i++) {
            stars.push({ 
                x: Math.random() * canvas.width, 
                y: Math.random() * canvas.height - canvas.height, 
                size: Math.random() * 5 + 2, 
                speed: (Math.random() * 4 + 2) * (isMobile ? 2 : 1), 
                color: `hsl(${Math.random() * 360}, 100%, 80%)` 
            });
        }
        let animationFrame: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
                s.y += s.speed;
                if (s.y > canvas.height) { s.y = -10; s.x = Math.random() * canvas.width; }
            });
            animationFrame = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animationFrame);
    }, [isVisible]);

    if (!isVisible) return null;
    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[3000]" />;
};

const Sheet: React.FC<{ frontContent: React.ReactNode; backContent: React.ReactNode; isFlipped: boolean; zIndex: number; }> = ({ frontContent, backContent, isFlipped, zIndex }) => (
    <div className="absolute top-0 right-0 w-1/2 h-full will-change-transform" style={{ zIndex: zIndex, transformStyle: 'preserve-3d', transformOrigin: 'left center', transform: isFlipped ? 'rotateY(-180deg) translateZ(1px)' : 'rotateY(0deg) translateZ(0px)', transition: `transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s ${isFlipped ? '0.6s' : '0s'}`, left: '50%' }}>
      <div className="absolute inset-0 w-full h-full bg-white shadow-xl overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'translate3d(0,0,0)' }}>{frontContent}</div>
      <div className="absolute inset-0 w-full h-full bg-white shadow-xl overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translate3d(0,0,0)' }}>{backContent}</div>
    </div>
);

const TeacherAvatar: React.FC<{ isTalking: boolean; volume: number; gender?: 'male' | 'female' }> = ({ isTalking, volume, gender = 'female' }) => {
    const [isBlinking, setIsBlinking] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => { setIsBlinking(true); setTimeout(() => setIsBlinking(false), 150); }, 3000 + Math.random() * 4000);
        return () => clearInterval(interval);
    }, []);
    const mouthScale = isTalking ? (0.1 + (volume * 1.2)) : 0.1;
    const isMale = gender === 'male';
    return (
        <div className="fixed bottom-24 right-8 z-[2000] w-32 h-32 md:w-48 md:h-48 animate-fade-in pointer-events-none drop-shadow-2xl flex flex-col items-center">
            <div className="relative w-full h-full animate-float">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                    <path d="M40 190 Q100 140 160 190 L160 200 L40 200 Z" fill={isMale ? "#0369a1" : "#0284c7"} />
                    {!isMale && <circle cx="100" cy="75" r="65" fill="#4a3728" />}
                    {isMale && <path d="M45 90 Q100 20 155 90" fill="#2d1e12" />}
                    <circle cx="100" cy="90" r="60" fill="#ffdbac" />
                    <path d="M40 50 L100 20 L160 50 L100 80 Z" fill="#1e293b" />
                    <rect x="85" y="45" width="30" height="20" fill="#1e293b" />
                    <path d="M160 50 L160 70" stroke="#facc15" strokeWidth="4" />
                    <circle cx="75" cy="95" r="18" fill="none" stroke="#334155" strokeWidth="3" /><circle cx="125" cy="95" r="18" fill="none" stroke="#334155" strokeWidth="3" />
                    <path d="M93 95 L107 95" stroke="#334155" strokeWidth="3" />
                    {isBlinking ? (<><path d="M65 95 Q75 92 85 95" stroke="#334155" strokeWidth="2" fill="none" /><path d="M115 95 Q125 92 135 95" stroke="#334155" strokeWidth="2" fill="none" /></>) : (<><circle cx="75" cy="95" r="4" fill="#1e293b" /><circle cx="125" cy="95" r="4" fill="#1e293b" /></>)}
                    <ellipse cx="100" cy="125" rx="12" ry={Math.max(2, 20 * mouthScale)} fill="#991b1b" style={{ transition: 'ry 0.05s ease-out' }} />
                </svg>
                {isTalking && <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] md:text-[10px] font-black px-2 py-1 rounded-full border-2 border-white animate-pulse flex items-center gap-1 whitespace-nowrap"><Volume2 className="w-2.5 h-2.5" /> COACH TALKING...</div>}
            </div>
        </div>
    );
};

const FairyAvatar: React.FC<{ isTalking: boolean; volume: number }> = ({ isTalking, volume }) => {
    const [isBlinking, setIsBlinking] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => { setIsBlinking(true); setTimeout(() => setIsBlinking(false), 150); }, 3500 + Math.random() * 4000);
        return () => clearInterval(interval);
    }, []);
    const mouthScale = isTalking ? (0.1 + (volume * 0.5)) : 0.1;
    return (
        <div className="fixed bottom-24 right-8 z-[2000] w-32 h-32 md:w-48 md:h-48 animate-fade-in pointer-events-none drop-shadow-2xl flex flex-col items-center">
            <div className="relative w-full h-full animate-float">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                    <path d="M100 80 Q60 20 20 80 Q60 140 100 100" fill="#e879f9" opacity="0.6" className="animate-pulse" />
                    <path d="M100 80 Q140 20 180 80 Q140 140 100 100" fill="#e879f9" opacity="0.6" className="animate-pulse" />
                    <path d="M70 180 L130 180 L115 110 L85 110 Z" fill="#818cf8" />
                    <circle cx="100" cy="80" r="35" fill="#fecaca" />
                    {isBlinking ? (<><path d="M85 85 Q92 82 95 85" stroke="#1e293b" strokeWidth="2" fill="none" /><path d="M105 85 Q112 82 115 85" stroke="#1e293b" strokeWidth="2" fill="none" /></>) : (<><circle cx="90" cy="85" r="3" fill="#1e293b" /><circle cx="110" cy="85" r="3" fill="#1e293b" /></>)}
                    <ellipse cx="100" cy="100" rx="8" ry={Math.max(2, 8 * mouthScale)} fill="#991b1b" style={{ transition: 'ry 0.05s ease-out' }} />
                    <g className="animate-wand-swing origin-[130px_100px]">
                        <rect x="135" y="80" width="4" height="70" rx="2" fill="#d1d5db" />
                        <path d="M137 80 L155 60 L137 40 L119 60 Z" fill="#facc15" className={isTalking ? 'animate-pulse' : ''} />
                    </g>
                </svg>
                {isTalking && <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] md:text-[10px] font-black px-2 py-1 rounded-full border-2 border-white animate-pulse flex items-center gap-1 whitespace-nowrap"><Sparkles className="w-2.5 h-2.5" /> FAIRY TALKING...</div>}
            </div>
        </div>
    );
};

const PageContent: React.FC<any> = ({ page, type, storyTitle, pageNumber, active, ageGroup, onFlipCorner, isLeftPage, mode, isWandMode, onWordClick, analysis, onHome, onReadAgain, onSave, isSaving, hasSaved, onCreateBonusStory, isSinglePage, correctIndices = [], missedCounts = {}, isListening = false, watermarkImage, hideContent }) => {
    
    const getFontSizeClass = () => {
        if (ageGroup?.includes("Toddler")) return 'text-xl md:text-2xl font-bold';
        if (ageGroup?.includes("Preschool")) return 'text-lg md:text-xl';
        return 'text-sm md:text-base';
    };

    if (type === 'title') return (
        <div className={`w-full h-full flex items-center justify-center p-8 border-4 relative overflow-hidden ${mode === 'learning' ? 'bg-sky-50 text-sky-800 border-sky-100' : 'bg-indigo-50 text-indigo-800 border-indigo-100'}`}>
            {watermarkImage && (
                <div className="absolute inset-0 z-0 opacity-[0.08] grayscale-[0.2] blur-[2px]">
                    <img src={watermarkImage} alt="" className="w-full h-full object-cover" />
                </div>
            )}
            {!hideContent && (
                <div className="text-center flex flex-col items-center relative z-10">
                    {mode === 'learning' ? <NotebookPen className="w-16 h-16 mb-6 text-sky-500" /> : <BookOpen className="w-16 h-16 mb-6 text-indigo-500" />}
                    <h1 className="text-2xl md:text-5xl font-comic font-bold mb-4">{storyTitle}</h1>
                    <p className="font-bold text-lg">{mode === 'learning' ? "A Magic Discovery Book" : "A Magic Story"}</p>
                </div>
            )}
        </div>
    );
    if (type === 'the-end') return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white p-10 text-center relative z-10">
            <Star className="w-16 h-16 text-yellow-400 mb-6 animate-spin-slow" />
            <h2 className="text-4xl md:text-6xl font-comic font-bold text-indigo-600">The End</h2>
        </div>
    );
    if (type === 'end') return <div className="w-full h-full flex flex-col items-center justify-center bg-white p-6 md:p-10 text-center overflow-y-auto custom-scrollbar relative z-10">{analysis ? (<div className="my-4 text-left bg-indigo-50 p-4 md:p-6 rounded-[1.5rem] border-2 border-indigo-100 w-full animate-fade-in shadow-sm"><h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5" /> Reading Journey</h3><p className="text-slate-800 text-xs md:text-base mb-4 leading-relaxed font-bold">{analysis.summary}</p>{onCreateBonusStory && (<button onClick={() => onCreateBonusStory(analysis.practiceTopic)} className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all text-xs"><Wand2 className="w-4 h-4" /> Magic Bonus Chapter</button>)}</div>) : (<div className="my-10 flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-indigo-300" /><p className="text-slate-400 font-bold text-sm">Brewing Wisdom...</p></div>)}<div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-full mt-auto pt-6"><button onClick={onReadAgain} className="py-3 px-4 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 text-xs hover:bg-indigo-50 transition-colors shadow-sm"><RotateCcw className="w-4 h-4" /> Read Again</button>{!hasSaved && <button onClick={onSave} disabled={isSaving} className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all shadow-sm bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50`}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save to Library</button>}<button onClick={onHome} className={`${hasSaved ? 'md:col-span-1' : 'md:col-span-2'} py-3 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors shadow-lg`}>Go Home</button></div></div>;
    if (!page) return <div className="bg-white w-full h-full" />;

    const words = page.text.split(' ');

    return (
        <div className="w-full h-full flex flex-col relative bg-white">
            <div className="h-[45%] md:h-[55%] w-full relative bg-white p-4 flex items-center justify-center">
                {page.imageUrl ? (
                    <div className="w-full h-full relative shadow-sm rounded-xl overflow-hidden bg-white">
                        <img src={page.imageUrl} alt="Illustration" className="w-full h-full object-contain" />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-white rounded-xl border-2 border-dashed border-slate-50">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Painting...</span>
                    </div>
                )}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 text-center custom-scrollbar">
                    <div className={`font-comic leading-relaxed text-slate-800 ${getFontSizeClass()}`}>
                        {words.map((word, idx) => {
                            const isCorrect = correctIndices.includes(idx);
                            const isMissedTwice = (missedCounts[idx] || 0) >= 2;
                            return (
                                <span 
                                    key={idx} 
                                    onClick={() => isWandMode && active && onWordClick?.(word, page.text)} 
                                    className={`inline-block mr-1 transition-all rounded px-1 
                                        ${isCorrect ? 'bg-green-300 text-green-900 scale-110 font-bold' : ''} 
                                        ${isMissedTwice ? 'bg-red-100 text-red-600' : ''}
                                        ${isWandMode && active ? 'hover:bg-yellow-100 cursor-pointer border-b-2 border-yellow-200' : ''}`}
                                >
                                    {word}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
            {onFlipCorner && active && !isSinglePage && (<div onClick={(e) => { e.stopPropagation(); onFlipCorner(); }} className={`absolute bottom-0 ${isLeftPage ? 'left-0' : 'right-0'} w-16 h-16 cursor-pointer z-50 group overflow-hidden`}><div className={`absolute bottom-0 ${isLeftPage ? 'left-0 border-r-transparent border-l-indigo-200' : 'right-0 border-l-transparent border-r-indigo-200'} w-0 h-0 border-solid border-t-transparent transition-all group-hover:border-b-[40px] ${isLeftPage ? 'group-hover:border-r-[40px]' : 'group-hover:border-l-[40px]'} opacity-0 group-hover:opacity-100 border-b-indigo-200`}></div></div>)}
            {pageNumber && <div className={`absolute top-2 ${isLeftPage ? 'left-2' : 'right-2'} text-slate-200 font-bold text-[10px] bg-white/80 px-2 rounded-full`}>{pageNumber}</div>}
        </div>
    );
};

const StoryReader: React.FC<StoryReaderProps> = ({ story, onHome, onCreateBonusStory }) => {
  const [flippedIndex, setFlippedIndex] = useState(-1);
  const [singlePageIndex, setSinglePageIndex] = useState(0); 
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoReading, setIsAutoReading] = useState(false);
  const isAutoReadingRef = useRef(false);
  const [lastReadIndex, setLastReadIndex] = useState(-1);

  // Follow-along logic states
  const [listeningIdx, setListeningIdx] = useState<number | null>(null);
  const [correctIndices, setCorrectIndices] = useState<number[]>([]);
  const [missedCounts, setMissedCounts] = useState<Record<number, number>>({});
  const [cursorIdx, setCursorIdx] = useState(-1);

  useEffect(() => {
    isAutoReadingRef.current = isAutoReading;
  }, [isAutoReading]);

  const [isWandMode, setIsWandMode] = useState(false);
  const [wandSettings, setWandSettings] = useState({ meaning: true, use: true, pronunciation: true });
  const [isCoachMode, setIsCoachMode] = useState(false);
  const [isCoachConnecting, setIsCoachConnecting] = useState(false);
  const [isCoachMinimized, setIsCoachMinimized] = useState(true);
  const [coachMouthVolume, setCoachMouthVolume] = useState(0);
  const [wandMouthVolume, setWandMouthVolume] = useState(0);
  const [simulatedWandVolume, setSimulatedWandVolume] = useState(0);
  const [coachConversation, setCoachConversation] = useState<{role: 'user' | 'model', text: string, id: string}[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<number, { text: string, spoken: number[] }>>({});
  const [analysis, setAnalysis] = useState<{summary: string, practiceTopic: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasSaved, setHasSaved] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);
  const [explainingWord, setExplainingWord] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const [wordCache, setWordCache] = useState<Record<string, { explanation: string, audioUrl: string | null }>>({});

  const [showCloudSetup, setShowCloudSetup] = useState(false);
  const [cloudUrlInput, setCloudUrlInput] = useState(getStoredUrl());
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wandAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const coachRef = useRef<LiveCoachSession | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const [swipeDirection, setSwipeDirection] = useState<'left'|'right'>('right');

  const handleTouchStart = (e: React.TouchEvent) => { 
      touchStartX.current = e.touches[0].clientX; 
      touchStartY.current = e.touches[0].clientY; 
  };
  const handleTouchMove = (e: React.TouchEvent) => { 
      touchEndX.current = e.touches[0].clientX; 
      touchEndY.current = e.touches[0].clientY; 
  };
  const handleTouchEnd = () => {
      if (touchStartX.current === null || touchEndX.current === null) return;
      const distX = touchStartX.current - touchEndX.current;
      const distY = (touchStartY.current || 0) - (touchEndY.current || 0);
      
      // Ensure horizontal swipe is dominant and significant
      if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > 40) {
          if (distX > 0) goNext(); 
          else goPrev();
      }
      touchStartX.current = null;
      touchEndX.current = null;
      touchStartY.current = null;
      touchEndY.current = null;
  };

  const isSinglePage = windowWidth < 1024;
  const allLinearPages = [{ type: 'title', title: story.title }, ...story.pages.map(p => ({ ...p, type: 'story' })), { type: 'the-end', text: '' }, { type: 'end' }];
  
  const pagesForBook = [...story.pages];
  if (pagesForBook.length % 2 === 0) {
      pagesForBook.push(null as any); 
  }
  const allPagesForSheets = [...pagesForBook, { type: 'the-end', text: '' } as any];
  
  const sheets = [];
  for (let i = 0; i < allPagesForSheets.length; i += 2) { sheets.push({ front: allPagesForSheets[i], back: allPagesForSheets[i+1] }); }

  const currentPageText = useMemo(() => {
    if (isSinglePage) {
        return singlePageIndex > 0 && singlePageIndex <= story.pages.length ? story.pages[singlePageIndex - 1].text : "";
    } else {
        const left = flippedIndex * 2 + 1;
        const right = flippedIndex * 2 + 2;
        return [story.pages[left]?.text, story.pages[right]?.text].filter(Boolean).join(" ");
    }
  }, [singlePageIndex, flippedIndex, isSinglePage, story.pages]);
  
  const hasCurrentAudio = useMemo(() => {
    if (isSinglePage) {
        const idx = singlePageIndex > 0 && singlePageIndex <= story.pages.length ? singlePageIndex - 1 : -1;
        if (idx === -1) return false;
        const p = story.pages[idx];
        return !!(p?.audioUrl || p?.audioBase64);
    } else {
        if (flippedIndex === -1) { // Title page
            const p = story.pages[0];
            return !!(p?.audioUrl || p?.audioBase64);
        }
        const left = flippedIndex * 2 + 1;
        const right = flippedIndex * 2 + 2;
        const leftP = story.pages[left];
        const rightP = story.pages[right];
        return !!(leftP?.audioUrl || leftP?.audioBase64 || rightP?.audioUrl || rightP?.audioBase64);
    }
  }, [singlePageIndex, flippedIndex, isSinglePage, story.pages]);

  useEffect(() => {
    if (isCoachMode && coachRef.current && currentPageText) {
        coachRef.current.updateContext(`The child has moved to a new part of the story. They are now reading this text: "${currentPageText}". Please listen and intervene as requested.`);
    }
  }, [currentPageText, isCoachMode]);

  useEffect(() => {
    setCorrectIndices([]);
    setMissedCounts({});
    setCursorIdx(-1);
  }, [singlePageIndex, flippedIndex]);

  const goNext = () => {
      setSwipeDirection('right');
      if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
      }
      if (isSinglePage) {
          if (singlePageIndex < allLinearPages.length - 1) setSinglePageIndex(p => p + 1);
      } else {
          if (flippedIndex < sheets.length - 1) setFlippedIndex(p => p + 1);
      }
  };

  const goPrev = () => {
      setSwipeDirection('left');
      if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
      }
      if (isSinglePage) {
          if (singlePageIndex > 0) setSinglePageIndex(p => p - 1);
      } else {
          if (flippedIndex >= -1) setFlippedIndex(p => p - 1);
      }
  };

  const goNextRef = useRef(goNext);
  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  const handleAutoPageTurn = (index: number) => {
    if (isSinglePage) {
        goNext();
    } else {
        if (flippedIndex === -1) {
            if (index === 0) goNext();
        } else {
            const rightPageIdx = flippedIndex * 2 + 2;
            if (index === rightPageIdx) goNext();
        }
    }
  };

  const handleAutoPageTurnRef = useRef(handleAutoPageTurn);
  useEffect(() => {
    handleAutoPageTurnRef.current = handleAutoPageTurn;
  }, [flippedIndex, isSinglePage]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => { 
        window.removeEventListener('resize', handleResize); 
        coachRef.current?.disconnect(); 
        recognitionRef.current?.stop(); 
        if (audioRef.current) audioRef.current.pause();
        if (wandAudioRef.current) wandAudioRef.current.pause();
    };
  }, []);

  useEffect(() => {
      if (conversationEndRef.current && !isCoachMinimized) {
          conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [coachConversation, isCoachMinimized]);

  const atTheEnd = useMemo(() => {
    return isSinglePage ? singlePageIndex >= allLinearPages.length - 1 : flippedIndex === sheets.length - 1;
  }, [isSinglePage, singlePageIndex, allLinearPages.length, flippedIndex, sheets.length]);

  useEffect(() => {
      if (atTheEnd && !analysis && !isAnalyzing) {
          const runAnalysis = async () => {
              setIsAnalyzing(true);
              const readingData = Object.values(sessionStats).map((s: any) => ({ pageText: s.text, spokenWords: s.spoken.map((idx: number) => s.text.split(' ')[idx]) }));
              const coachLog = coachConversation.map(m => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n');
              
              if (readingData.length > 0 || coachConversation.length > 0) {
                  const result = await analyzeReadingPerformance(readingData, coachLog);
                  setAnalysis(result);
                  if (isConfigured()) {
                      try {
                          const history = await getAllProgress();
                          const progress: ProgressEntry = { id: crypto.randomUUID(), date: Date.now(), summary: await generateDailyProgressSummary(result, history), practiceTopic: result.practiceTopic, booksRead: [story.title] };
                          await saveProgressToLibrary(progress);
                      } catch (e) {}
                  }
              } else { setAnalysis({ summary: "You explored every page! Great curiosity.", practiceTopic: "New vocabulary" }); }
              setIsAnalyzing(false);
          };
          runAnalysis();
      }
  }, [atTheEnd, analysis, isAnalyzing, sessionStats, coachConversation]);

  useEffect(() => {
    if (isAutoReading && !isPlaying && !atTheEnd) {
      const timeout = setTimeout(() => {
        let targetPageIdx = -1;
        let isAfterLastStoryPage = false;

        if (isSinglePage) {
            if (singlePageIndex > 0 && singlePageIndex <= story.pages.length) {
                targetPageIdx = singlePageIndex - 1;
            } else if (singlePageIndex > story.pages.length) {
                isAfterLastStoryPage = true;
            }
        } else {
            if (flippedIndex === -1) {
                targetPageIdx = 0;
            } else {
                const left = flippedIndex * 2 + 1;
                const right = flippedIndex * 2 + 2;
                if (lastReadIndex === left) {
                    targetPageIdx = right;
                } else {
                    targetPageIdx = left;
                }
                if (targetPageIdx >= story.pages.length) {
                    isAfterLastStoryPage = true;
                }
            }
        }
          
        if (targetPageIdx >= 0 && targetPageIdx < story.pages.length) {
             const p = story.pages[targetPageIdx];
             if (p?.audioUrl || p?.audioBase64) {
                 playAudio(p.audioUrl, targetPageIdx, p.audioBase64);
             } else {
                 setLastReadIndex(targetPageIdx);
                 handleAutoPageTurnRef.current(targetPageIdx);
             }
        } else if (isAfterLastStoryPage) {
            const autoFlipTimeout = setTimeout(() => {
                if (isAutoReadingRef.current) {
                    goNext();
                }
            }, 3000);
            return () => clearTimeout(autoFlipTimeout);
        } else {
            setIsAutoReading(false);
        }
      }, 500); 
      return () => clearTimeout(timeout);
    }
  }, [isAutoReading, isPlaying, atTheEnd, singlePageIndex, flippedIndex, isSinglePage, story.pages, lastReadIndex]);

  useEffect(() => {
    let interval: any;
    if (explainingWord) {
        interval = setInterval(() => {
            setSimulatedWandVolume(0.1 + Math.random() * 0.4);
        }, 80);
    } else {
        setSimulatedWandVolume(0);
        if (wandAudioRef.current) {
            wandAudioRef.current.pause();
            wandAudioRef.current = null;
        }
    }
    return () => clearInterval(interval);
  }, [explainingWord]);

  const toggleListening = (pageIdx: number) => {
      if (listeningIdx === pageIdx) { 
        setListeningIdx(null); 
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
            recognitionRef.current = null;
        }
        return; 
      }
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
          return;
      }
      
      const rec = new SpeechRecognition();
      rec.continuous = true; 
      rec.interimResults = true; 
      rec.lang = story.language || 'en-US';
      
      const pageText = story.pages[pageIdx]?.text || '';
      const pageWordsRaw = pageText.toLowerCase().split(/\s+/);
      const pageWords = pageWordsRaw.map(w => w.replace(/[.,!?;:]/g, ''));
      
      let localCursor = -1;
      let localCorrect: number[] = [];
      let localMissed: Record<number, number> = {};

      rec.onresult = (e: any) => { 
          let transcript = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            transcript += e.results[i][0].transcript;
          }
          const spokenWords = transcript.toLowerCase().trim().split(/\s+/).filter(w => w).map(w => w.replace(/[.,!?;:]/g, ''));
          
          spokenWords.forEach(spokenWord => {
            const lookAheadLimit = Math.min(localCursor + 6, pageWords.length);
            for (let i = localCursor + 1; i < lookAheadLimit; i++) {
                if (pageWords[i] === spokenWord) {
                    for (let j = localCursor + 1; j < i; j++) {
                        if (!localCorrect.includes(j)) {
                            localMissed[j] = (localMissed[j] || 0) + 1;
                        }
                    }
                    
                    if (!localCorrect.includes(i)) {
                        localCorrect.push(i);
                    }
                    localCursor = i;
                    break;
                }
            }
          });

          setCursorIdx(localCursor);
          setCorrectIndices([...localCorrect]);
          setMissedCounts({...localMissed});
          setSessionStats(ps => ({ 
            ...ps, 
            [pageIdx]: { text: pageText, spoken: [...localCorrect] } 
          }));
      };

      rec.onerror = (e: any) => {
          console.error("Recognition Error:", e.error);
          if (e.error === 'not-allowed') {
              alert("Microphone access was denied. Please check your browser permissions.");
          }
          setListeningIdx(null);
          recognitionRef.current = null;
      };
      
      try {
        rec.start(); 
        recognitionRef.current = rec; 
        setListeningIdx(pageIdx);
        localCursor = -1;
        localCorrect = [];
        localMissed = {};
      } catch (err) {
        console.error("Speech recognition failed to start", err);
      }
  };

  const playAudio = (url: string | undefined, pageIdx: number, base64?: string) => {
      if (audioRef.current) audioRef.current.pause();

      let targetUrl = url;
      
      // If we don't have a temporary Blob URL (common for library books),
      // we must recreate it from the persistent base64 data.
      if (!targetUrl && base64) {
          try {
              const byteCharacters = atob(base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'audio/wav' });
              targetUrl = URL.createObjectURL(blob);
          } catch (e) {
              console.error("Base64 audio reconstruction failed", e);
          }
      }

      if (!targetUrl) {
          console.warn("No audio available for this page");
          setIsPlaying(false);
          setIsAutoReading(false);
          return;
      }

      const a = new Audio(targetUrl);
      audioRef.current = a;
      a.onended = () => { 
          setIsPlaying(false); 
          setLastReadIndex(pageIdx);
          if (isAutoReadingRef.current) {
              handleAutoPageTurnRef.current(pageIdx);
          }
      };
      a.play().catch(e => {
        console.error("Playback failed", e);
        setIsPlaying(false);
        setIsAutoReading(false);
      });
      setIsPlaying(true);
  };

  const togglePlay = () => {
      if (isPlaying) { 
          audioRef.current?.pause(); 
          setIsPlaying(false); 
          setIsAutoReading(false);
          isAutoReadingRef.current = false;
      } 
      else {
          setIsAutoReading(true);
          isAutoReadingRef.current = true;
          
          if (isSinglePage) {
              if (singlePageIndex === 0) {
                  goNext();
                  return;
              }
              const idx = singlePageIndex > 0 && singlePageIndex <= story.pages.length ? singlePageIndex - 1 : 0;
              const page = story.pages[idx];
              if (page?.audioUrl || page?.audioBase64) {
                  playAudio(page.audioUrl, idx, page.audioBase64);
              }
          } else {
              let idx = 0;
              if (flippedIndex === -1) idx = 0;
              else idx = flippedIndex * 2 + 1; 
              
              const page = story.pages[idx];
              if (page?.audioUrl || page?.audioBase64) {
                  playAudio(page.audioUrl, idx, page.audioBase64);
              }
          }
      }
  };

  const toggleWand = () => {
    if (!isWandMode) {
      if (isCoachMode) {
        coachRef.current?.disconnect();
        setIsCoachMode(false);
        setCoachConversation([]);
      }
    }
    setIsWandMode(!isWandMode);
  };

  const toggleCoach = async () => {
    if (isCoachMode) { 
      coachRef.current?.disconnect(); 
      setIsCoachMode(false); 
      setCoachConversation([]); 
    } else {
        if (isWandMode) setIsWandMode(false);
        setIsCoachConnecting(true);
        try {
            const coach = new LiveCoachSession({ 
                onVolumeUpdate: (iv, ov) => setCoachMouthVolume(ov), 
                onTranscriptionUpdate: (role, text, isFinal) => {
                    if (isFinal && text.trim()) {
                        setCoachConversation(prev => [...prev, { role, text, id: crypto.randomUUID() }]);
                        
                        // Detect exit intent
                        if (role === 'user') {
                            const lowText = text.toLowerCase();
                            const exitWords = ["bye", "goodbye", "done", "end", "finished", "stop"];
                            if (exitWords.some(w => lowText.includes(w))) {
                                coachRef.current?.updateContext("The child wants to stop reading for now. Say 'Okay, talk to you later, goodbye!' or something similar and warm, then stop.");
                                // Automatically disconnect after a short delay for the coach to say goodbye
                                setTimeout(() => {
                                    if (coachRef.current) {
                                        coachRef.current.disconnect();
                                        setIsCoachMode(false);
                                        setCoachConversation([]);
                                    }
                                }, 3500);
                            }
                        }
                    }
                }, 
                onError: (err) => {
                    setIsCoachMode(false);
                    setIsCoachConnecting(false);
                    if (err.message.includes("Permission denied")) {
                        alert("Microphone permission is required for the Reading Coach.");
                    }
                } 
            });

            const socraticInstruction = `
                You are a "Socratic Reading Coach" for a ${story.ageGroup || "young child"}.
                The child is reading a story titled "${story.title}".
                
                Your role is "Interventional Listening":
                1. Listen to the child's audio input as they read.
                2. If they struggle or pause on a word, give a gentle hint or encouragement.
                3. PROACTIVITY: If the child has stopped talking for a while, gently initiate a conversation. Ask if they want to read the next sentence or what they think of the picture.
                4. EXIT STRATEGY: If the child says they are done, finished, or says goodbye, respond with a very warm closing like "Okay, talk to you later, goodbye!" and end your response.
                5. Keep the conversation short.
                6. Current Page Text: "${currentPageText}"
                7. Personality: Be warm and encouraging. Use a ${story.voiceTone || "Kind"} tone.
            `;

            await coach.connect("Hi there! I'm your Reading Coach.", socraticInstruction, story.voiceGender === 'female' ? 'Kore' : 'Puck');
            coachRef.current = coach; 
            setIsCoachMode(true);
            setIsCoachConnecting(false);
        } catch (e: any) {
            setIsCoachMode(false);
            setIsCoachConnecting(false);
        }
    }
  };

  const playMagicChime = () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playNote(880, now, 0.8); 
    playNote(1108.73, now + 0.15, 0.8); 
    playNote(1318.51, now + 0.3, 0.8); 
    playNote(1760, now + 0.45, 0.8); 
  };

  const handleWordClick = async (word: string, context: string) => {
    const cacheKey = `${word.toLowerCase()}_${wandSettings.meaning}_${wandSettings.use}_${wandSettings.pronunciation}`;
    
    if (wordCache[cacheKey]) {
        playMagicChime();
        setExplainingWord(word);
        setExplanation(wordCache[cacheKey].explanation);
        const speech = wordCache[cacheKey].audioUrl;
        if (speech) {
            if (wandAudioRef.current) wandAudioRef.current.pause();
            const a = new Audio(speech);
            wandAudioRef.current = a;
            a.play().catch(e => console.error("Cached wand speech failed", e));
        }
        return;
    }

    playMagicChime();
    setExplainingWord(word); 
    setExplanation("Sparkling thoughts..."); 
    
    const parts = [];
    if (wandSettings.meaning) parts.push("explain its meaning");
    if (wandSettings.use) parts.push("show how to use it in a fun sentence");
    if (wandSettings.pronunciation) parts.push("describe how it sounds");
    
    const specificTask = parts.length > 0 ? `Please ${parts.join(', ')}.` : "Say something magical about it.";
    const characterTask = `You are a wise magical helper. ${specificTask}`;

    try {
        const result = await explainWordInCharacter(word, context, characterTask, story.language);
        let speech;
        try {
             speech = await generateSpeech(result, story.voiceGender, story.voiceTone);
        } catch (speechError) {
             console.warn("Speech generation failed", speechError);
        }
        setExplanation(result);
        setWordCache(prev => ({
            ...prev,
            [cacheKey]: { explanation: result, audioUrl: speech || null }
        }));
        if (speech) {
            if (wandAudioRef.current) wandAudioRef.current.pause();
            const a = new Audio(speech);
            wandAudioRef.current = a;
            a.play().catch(e => console.error("Wand speech failed", e));
        }
    } catch (e) { 
        setExplanation("Oops! My magic missed."); 
    }
  };

  const handleSave = async (forceUrl?: string) => { 
    if (isSaving || hasSaved) return; 

    if (forceUrl) {
      try {
        configureDrive(forceUrl);
      } catch (e: any) {
        alert(e.message || "Invalid URL.");
        return;
      }
    }

    // Allow saving even if not configured (will use Firestore)
    setIsSaving(true); 
    try { 
        await saveStoryToLibrary(story, false); 
        setHasSaved(true); 
        setShowCloudSetup(false);
    } catch (e: any) { 
        alert(e.message || "Save failed."); 
    } finally { 
        setIsSaving(false); 
    } 
  };

  const handleReadAgain = () => { setFlippedIndex(-1); setSinglePageIndex(0); setSessionStats({}); setAnalysis(null); };

  const btnClass = "transition-all duration-200 hover:scale-110 active:scale-95 hover:-translate-y-1 shadow-lg";

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-[#f3f4f6]">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-300 rounded-full opacity-30 blur-3xl pointer-events-none mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-purple-400 rounded-full opacity-30 blur-3xl pointer-events-none mix-blend-multiply" />
        
        {atTheEnd && <StarShower />}
        
        {/* Top Controls - Positioned within safe area */}
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] inset-x-4 z-[1100] flex justify-between items-center pointer-events-none">
            <div className="flex gap-3 pointer-events-auto">
                <button onClick={onHome} className={`p-3.5 bg-white rounded-full text-slate-700 border border-slate-100 ${btnClass}`} title="Go Home">
                    <Home className="w-6 h-6" />
                </button>
            </div>
            
            <div className="flex gap-2 pointer-events-auto">
                <button 
                    onClick={toggleWand} 
                    className={`p-3.5 rounded-full transition-all border ${isWandMode ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] border-amber-600' : 'bg-white text-slate-700 border-slate-100'} ${btnClass}`}
                    title="Magic Wand"
                >
                    <Wand className="w-6 h-6" />
                </button>
                <button 
                    onClick={toggleCoach} 
                    disabled={isCoachConnecting}
                    className={`p-3.5 rounded-full transition-all border ${isCoachMode ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-100'} ${btnClass} disabled:opacity-50`}
                    title="Socratic Reading Coach"
                >
                    {isCoachConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserCircle className="w-6 h-6" />}
                </button>
                {!hasSaved && (
                  <button 
                      onClick={() => handleSave()} 
                      disabled={isSaving}
                      className={`p-3.5 rounded-full transition-all border bg-white text-slate-700 border-slate-100 disabled:opacity-50 ${btnClass}`}
                      title="Save to Library"
                  >
                      {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                )}
                <button 
                    onClick={() => generateStoryPDF(story)} 
                    className={`p-3.5 bg-white rounded-full text-slate-700 border border-slate-100 ${btnClass}`}
                    title="Download PDF"
                >
                    <Download className="w-6 h-6" />
                </button>
            </div>
        </div>

        {showCloudSetup && (
            <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-indigo-900/20 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl max-w-lg w-full relative border-4 border-indigo-100 animate-slide-up">
                    <button onClick={() => setShowCloudSetup(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner"><Cloud className="w-10 h-10 text-indigo-600" /></div>
                        <h3 className="text-3xl font-black text-indigo-900 mb-3">Connect Your Cloud</h3>
                        <p className="text-slate-600 font-bold mb-8 text-lg">Enter your Google Apps Script URL to save your magical stories forever!</p>
                        
                        <div className="w-full text-left bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Script URL (ends in /exec)</label>
                            <input 
                                type="text" 
                                value={cloudUrlInput}
                                onChange={(e) => setCloudUrlInput(e.target.value)}
                                placeholder="https://script.google.com/macros/s/.../exec"
                                className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-700 text-sm bg-white"
                            />
                            <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400 font-bold leading-tight">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                <span>Deployment must have 'Who has access' set to 'Anyone'.</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleSave(cloudUrlInput)}
                            disabled={isSaving || !cloudUrlInput.includes('/exec')}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-7 h-7 animate-spin" /> : <><Link className="w-7 h-7" /> Save & Connect</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {explainingWord && (<div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-[2rem] p-8 shadow-2xl max-w-sm w-full text-center relative border-4 border-amber-400 animate-slide-up"><button onClick={() => setExplainingWord(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button><Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-bounce" /><h3 className="text-2xl font-black text-indigo-900 mb-2 uppercase tracking-wide">{explainingWord}</h3><p className="text-slate-700 font-bold leading-relaxed">{explanation}</p></div></div>)}

        <div className="flex-1 w-full flex items-center justify-center py-10 px-4 overflow-hidden relative z-10 pt-[max(4rem,calc(env(safe-area-inset-top)+3rem))]">
            
            {isCoachMode && !isCoachMinimized && (
                <div className="fixed left-8 top-[25%] z-[2500] w-[260px] h-[360px] animate-fade-in pointer-events-auto">
                    <div className="bg-blue-50/95 backdrop-blur-sm rounded-3xl shadow-2xl border-4 border-blue-200 flex flex-col h-full overflow-hidden">
                        <div className="bg-blue-600 p-2.5 flex items-center justify-between text-white shrink-0 shadow-md">
                            <div className="flex items-center gap-2">
                                <MessageSquareText className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Coach Chat</span>
                            </div>
                            <button onClick={() => setIsCoachMinimized(true)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                <Minimize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                            {coachConversation.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                    <Bot className="w-6 h-6 text-blue-300 mb-2" />
                                    <p className="text-[10px] font-bold text-blue-400">Start reading!</p>
                                </div>
                            ) : (
                                coachConversation.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-2.5 rounded-2xl text-[10px] font-bold shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-blue-50'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={conversationEndRef} />
                        </div>
                    </div>
                </div>
            )}

            {isSinglePage ? (
                <div 
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-full max-w-lg aspect-[4/5] bg-white rounded-r-xl rounded-l shadow-2xl relative border border-slate-100 flex flex-col ml-3 mr-0 pointer-events-auto shrink-0"
                >
                    {/* Spiral Binding */}
                    <div className="absolute top-0 bottom-0 left-[-12px] w-[24px] z-[60] flex flex-col justify-evenly py-4 pointer-events-none">
                        {Array.from({length: 16}).map((_, i) => (
                            <div key={i} className="flex items-center w-full relative h-[8px] opacity-90">
                                <div className="absolute left-[2px] w-[8px] h-[8px] rounded-full shadow-inner bg-slate-800"></div>
                                <div className="absolute left-[6px] right-[6px] h-[5px] top-[1.5px] bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 rounded-full shadow-md z-10 border border-slate-400"></div>
                                <div className="absolute right-[2px] w-[8px] h-[8px] rounded-full shadow-inner bg-slate-800"></div>
                            </div>
                        ))}
                    </div>
                    {/* Content Layer */}
                    <div className="w-full h-full overflow-hidden relative rounded-r-xl z-10 bg-white">
                        <div key={singlePageIndex} className={`w-full h-full ${swipeDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
                            {singlePageIndex === 0 && <PageContent type="title" storyTitle={story.title} active={true} mode={story.mode} isSinglePage={true} watermarkImage={story.pages[0]?.imageUrl} />}
                            {singlePageIndex > 0 && singlePageIndex <= story.pages.length && (<PageContent type="story" page={story.pages[singlePageIndex-1]} pageNumber={singlePageIndex} active={true} ageGroup={story.ageGroup} mode={story.mode} isListening={listeningIdx === (singlePageIndex-1)} correctIndices={correctIndices} missedCounts={missedCounts} onToggleListening={() => toggleListening(singlePageIndex-1)} isSinglePage={true} isWandMode={isWandMode} onWordClick={handleWordClick} />)}
                            {singlePageIndex === story.pages.length + 1 && <PageContent type="the-end" active={true} isSinglePage={true} />}
                            {singlePageIndex === story.pages.length + 2 && (<PageContent type="end" active={true} analysis={analysis} onHome={onHome} onReadAgain={handleReadAgain} onSave={() => handleSave()} isSaving={isSaving} hasSaved={hasSaved} onCreateBonusStory={onCreateBonusStory} isSinglePage={true} />)}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative w-full max-7xl aspect-[1.8/1] transition-transform duration-500 scale-[0.85] drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]" style={{ perspective: '3500px' }}>
                    <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-white rounded-l-2xl overflow-hidden shadow-inner border-r border-slate-100">
                        <PageContent type="title" storyTitle={story.title} active={false} mode={story.mode} isLeftPage={true} watermarkImage={story.pages[0]?.imageUrl} hideContent={flippedIndex > -1} />
                    </div>
                    <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-white rounded-r-2xl overflow-hidden shadow-inner border-l border-slate-100">
                        <PageContent type="end" active={flippedIndex === sheets.length - 1} isLeftPage={false} analysis={analysis} onHome={onHome} onReadAgain={handleReadAgain} onSave={() => handleSave()} isSaving={isSaving} hasSaved={hasSaved} onCreateBonusStory={onCreateBonusStory} />
                    </div>
                    {sheets.map((sheet, index) => (
                        <Sheet key={index} isFlipped={index <= flippedIndex} zIndex={index <= flippedIndex ? index + 1 : (sheets.length - index) + 50}
                            frontContent={<PageContent type={sheet.front?.type || 'story'} page={sheet.front} pageNumber={sheet.front?.page_number} actualIndex={index * 2} active={index === flippedIndex + 1} ageGroup={story.ageGroup} mode={story.mode} isListening={listeningIdx === (index * 2)} correctIndices={correctIndices} missedCounts={missedCounts} onToggleListening={() => toggleListening(index * 2)} onFlipCorner={index === flippedIndex + 1 ? goNext : undefined} isLeftPage={false} isWandMode={isWandMode} onWordClick={handleWordClick} />}
                            backContent={sheet.back ? <PageContent type={sheet.back?.type || 'story'} page={sheet.back} pageNumber={sheet.back?.page_number} actualIndex={index * 2 + 1} active={index === flippedIndex} ageGroup={story.ageGroup} mode={story.mode} isListening={listeningIdx === (index * 2 + 1)} correctIndices={correctIndices} missedCounts={missedCounts} onToggleListening={() => toggleListening(index * 2 + 1)} onFlipCorner={index === flippedIndex ? goPrev : undefined} isLeftPage={true} isWandMode={isWandMode} onWordClick={handleWordClick} /> : <div className="w-full h-full bg-white"></div>}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Bottom Bar - Respect Safe Area */}
        <div className="h-auto min-h-[5rem] bg-white/90 backdrop-blur-md border-t flex items-center px-4 md:px-8 shadow-md shrink-0 relative z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
            
            <div className="flex-1 flex items-center gap-4">
                {isWandMode && (
                    <div className="flex gap-4 items-center bg-indigo-50/50 px-5 py-2.5 rounded-2xl border border-indigo-100 animate-fade-in">
                        <div className="flex items-center gap-2 text-indigo-600 mr-2">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline whitespace-nowrap">Click a word for:</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={wandSettings.meaning} 
                                onChange={(e) => setWandSettings({...wandSettings, meaning: e.target.checked})}
                                className="w-3.5 h-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] font-black text-slate-700 group-hover:text-indigo-600 transition-colors">Meaning</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={wandSettings.use} 
                                onChange={(e) => setWandSettings({...wandSettings, use: e.target.checked})}
                                className="w-3.5 h-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] font-black text-slate-700 group-hover:text-indigo-600 transition-colors">Usage</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={wandSettings.pronunciation} 
                                onChange={(e) => setWandSettings({...wandSettings, pronunciation: e.target.checked})}
                                className="w-3.5 h-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] font-black text-slate-700 group-hover:text-indigo-600 transition-colors">Sounds Like</span>
                        </label>
                    </div>
                )}
                
                {isCoachMode && (
                    <button 
                        onClick={() => setIsCoachMinimized(!isCoachMinimized)}
                        className={`p-3.5 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 animate-fade-in flex items-center justify-center border-2 border-white ${isCoachMinimized ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-blue-600 border-blue-100'}`}
                        title={isCoachMinimized ? "Show Coach Chat" : "Hide Coach Chat"}
                    >
                        <MessageSquareText className="w-6 h-6" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-4">
                <button 
                    onClick={goPrev} 
                    disabled={isSinglePage ? singlePageIndex === 0 : flippedIndex === -1} 
                    className={`p-3 rounded-xl bg-white border border-slate-100 text-indigo-600 disabled:opacity-20 hover:bg-slate-50 ${btnClass}`}
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                
                <button 
                    onClick={togglePlay}
                    disabled={atTheEnd || (!isPlaying && !hasCurrentAudio)}
                    className={`p-4 rounded-full transition-all ${isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white'} ${btnClass} ${(atTheEnd || (!isPlaying && !hasCurrentAudio)) ? 'opacity-20 grayscale-50 cursor-not-allowed' : ''}`}
                    title={atTheEnd ? "The End" : (!hasCurrentAudio ? "Audio not available for this page" : (isPlaying ? "Pause" : "Play Story"))}
                >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <button 
                    onClick={goNext} 
                    disabled={isSinglePage ? singlePageIndex === allLinearPages.length - 1 : flippedIndex === sheets.length - 1} 
                    className={`p-3 rounded-xl bg-white border border-slate-100 text-indigo-600 disabled:opacity-20 hover:bg-slate-50 ${btnClass}`}
                >
                    <ChevronRight className="w-6 h-6" />
                </button>

                <button 
                    onClick={() => { const idx = isSinglePage ? (singlePageIndex > 0 ? singlePageIndex - 1 : 0) : ((flippedIndex + 1) * 2); toggleListening(idx); }} 
                    disabled={isCoachMode} 
                    className={`group flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs md:text-sm transition-all border-2 ${listeningIdx !== null ? 'bg-red-50 text-red-600 border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white text-indigo-600 border-indigo-100 hover:border-indigo-400'} ${btnClass}`}
                >
                    {listeningIdx !== null ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 group-hover:scale-110" />}
                    {listeningIdx !== null ? "I'm Listening!" : "Let's Read!"}
                </button>

                {listeningIdx !== null && (
                    <div className="flex gap-3 animate-slide-up border-l-2 border-slate-100 pl-4 items-center">
                        <WordStar count={correctIndices.length} />
                    </div>
                )}
            </div>

            <div className="flex-1 flex justify-end items-center mr-4">
            </div>
        </div>

        {isCoachMode && <TeacherAvatar isTalking={coachMouthVolume > 0.05} volume={coachMouthVolume} gender={story.voiceGender} />}
        {(isWandMode || explainingWord) && <FairyAvatar isTalking={!!explainingWord || wandMouthVolume > 0.05} volume={explainingWord ? simulatedWandVolume : wandMouthVolume} />}
        
        <style>{`
            .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } 
            .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; } 
            .animate-slide-in-right { animation: slideInRight 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
            .animate-slide-in-left { animation: slideInLeft 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } 
            @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } 
            @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideInLeft { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e0e7ff; border-radius: 10px; } 
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } } 
            .animate-float { animation: float 3.5s ease-in-out infinite; } 
            @keyframes wand-swing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(15deg); } } 
            .animate-wand-swing { animation: wand-swing 1.5s ease-in-out infinite; }
            .animate-spin-slow { animation: spin-slow 8s linear infinite; } 
            @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
    </div>
  );
};

export default StoryReader;
