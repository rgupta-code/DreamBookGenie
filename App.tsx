import React, { useState, useEffect, useMemo } from 'react';
import { Story, StoryRequest, AppState } from './types';
import { generateStoryStructure, generateImageForPage, generateSpeech, validateApiKey } from './services/geminiService';
import { getAllStories, deleteStory, isConfigured, getStoredUrl, configureDrive, disconnectDrive, testConnection, getCachedStories, hasCustomUrl, saveStoryToLibrary } from './services/storageService';
import { testFirebaseConnection, writeTestDocument } from './services/firebase';
import StoryForm from './components/StoryForm';
import StoryReader from './components/StoryReader';
import ChatWidget from './components/ChatWidget';
import BrainstormingScreen from './components/BrainstormingScreen';
import TrackingView from './components/TrackingView';
import ColoringBookGenerator from './components/ColoringBookGenerator';
import { Sparkles, Palette, Library, Trash2, BookOpen, Key, AlertCircle, Plus, GraduationCap, Search, X, Cloud, LogOut, Loader2, Link, Save, HelpCircle, AlertTriangle, Settings, LayoutGrid, List, Mic2, Volume2, Check, TrendingUp, ChevronRight, Zap, ShieldCheck, Castle, Rocket, Star, Rabbit, Moon, Crown, Telescope, Ghost, Heart, Balloon, Gem, Snowflake, Music, Sun, Feather, Home, Compass, Wand2, Globe, Fish, Coffee, Pizza, Bike, Plane, Tent, Umbrella, Gift, Shell, Anchor, Bird, Dog, Cat, IceCream, Pizza as PizzaIcon, Cookie, Cake, Smile } from 'lucide-react';

const TONES = [
  "Cheerful",
  "Calm",
  "Excited",
  "Dramatic",
  "Kind",
  "Mysterious",
  "Kid",
  "Baby"
];

const FEATURES = [
    { title: "Multilingual Magic", desc: "Create stories in any language you speak!", gradient: "from-blue-400 to-indigo-500" },
    { title: "Magic Wand Tool", desc: "Click any word to instantly learn its meaning.", gradient: "from-amber-400 to-orange-500" },
    { title: "Reading Coach", desc: "A helpful friend listens and helps you read.", gradient: "from-fuchsia-400 to-pink-500" },
    { title: "Safe & Secure", desc: "Child-friendly content generated with care.", gradient: "from-emerald-400 to-teal-500" },
    { title: "Photo Heroes", desc: "Upload a selfie to become the main character!", gradient: "from-violet-400 to-purple-500" },
    { title: "Fun Voices", desc: "Listen to narrators with silly or calm voices.", gradient: "from-cyan-400 to-sky-500" },
    { title: "Topic Learning", desc: "Turn any educational topic into a fun book.", gradient: "from-rose-400 to-red-500" }
];

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [story, setStory] = useState<Story | null>(null);
  const [loadingState, setLoadingState] = useState<{status: string, progress: number} | null>(null);
  const [savedStories, setSavedStories] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'story' | 'learning' | 'coloring' | 'library' | 'tracking'>('home');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brainstormedIdea, setBrainstormedIdea] = useState('');
  const [libraryViewMode, setLibraryViewMode] = useState<'grid' | 'list'>('grid');
  
  // Settings & Drive State
  const [scriptUrl, setScriptUrl] = useState(hasCustomUrl() ? getStoredUrl() : "");
  const [isDriveConnected, setIsDriveConnected] = useState(isConfigured());
  const [isCustomUrl, setIsCustomUrl] = useState(hasCustomUrl());
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLibrarySettings, setShowLibrarySettings] = useState(false);
  
  // Global Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(() => {
    return (localStorage.getItem('magic_storybook_voice_gender') as 'male' | 'female') || 'female';
  });
  const [voiceTone, setVoiceTone] = useState(() => {
    return localStorage.getItem('magic_storybook_voice_tone') || 'Cheerful';
  });
  const [isPaidMode, setIsPaidMode] = useState(() => {
    return localStorage.getItem('magic_storybook_is_paid') === 'true';
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [autoSave, setAutoSave] = useState(() => {
    const stored = localStorage.getItem('magic_storybook_autosave');
    return stored === null ? true : stored === 'true';
  });

  // Manual Key Entry State
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [firebaseWriteStatus, setFirebaseWriteStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Feature Carousel State
  const [featureIndex, setFeatureIndex] = useState(0);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);

  // Check Firebase connection when settings open
  useEffect(() => {
      if (showSettings) {
          const checkFirebase = async () => {
              setFirebaseStatus('checking');
              const isConnected = await testFirebaseConnection();
              setFirebaseStatus(isConnected ? 'connected' : 'disconnected');
          };
          checkFirebase();
      }
  }, [showSettings]);

  const handleFirebaseWriteTest = async () => {
      setFirebaseWriteStatus('testing');
      const result = await writeTestDocument();
      if (result.success) {
          setFirebaseWriteStatus('success');
          setTimeout(() => setFirebaseWriteStatus('idle'), 3000);
      } else {
          setFirebaseWriteStatus('error');
          alert("Write failed: " + result.message);
      }
  };

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('magic_storybook_voice_gender', voiceGender);
  }, [voiceGender]);

  useEffect(() => {
    localStorage.setItem('magic_storybook_voice_tone', voiceTone);
  }, [voiceTone]);

  useEffect(() => {
    localStorage.setItem('magic_storybook_is_paid', String(isPaidMode));
  }, [isPaidMode]);

  useEffect(() => {
    localStorage.setItem('magic_storybook_autosave', String(autoSave));
  }, [autoSave]);

  useEffect(() => {
      const timer = setInterval(() => {
          setFeatureIndex((prev) => (prev + 1) % FEATURES.length);
      }, 4000);
      return () => clearInterval(timer);
  }, []);

  // Global Config Sync
  useEffect(() => {
    const handleConfigUpdate = () => {
        setScriptUrl(hasCustomUrl() ? getStoredUrl() : "");
        setIsDriveConnected(isConfigured());
        setIsCustomUrl(hasCustomUrl());
    };
    window.addEventListener('magic_drive_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('magic_drive_config_updated', handleConfigUpdate);
  }, []);

  useEffect(() => { 
      loadLibrary();
  }, [isDriveConnected, scriptUrl]);

  useEffect(() => {
      setShowLibrarySettings(false);
  }, [activeTab]);

  const loadLibrary = async () => {
      setIsLoadingLibrary(true); // Always start loading state
      
      // Helper to shuffle array
      const shuffle = (array: Story[]) => {
          return array.sort(() => Math.random() - 0.5);
      };

      // 1. Load cache first for immediate display
      const cached = getCachedStories();
      if (cached.length > 0) {
          setSavedStories(shuffle([...cached]));
          // Note: We keep isLoadingLibrary(true) to show the syncing indicator
      }
      
      try {
          // 2. Fetch fresh data from cloud
          const stories = await getAllStories();
          if (stories && stories.length > 0) {
             setSavedStories(shuffle([...stories]));
          } else if (cached.length === 0) {
             // If cloud returns empty and cache is empty, ensure list is empty
             setSavedStories([]);
          }
      } catch (e) { 
          // Silently handle fetch errors and rely on cache
      } finally { 
          setIsLoadingLibrary(false); 
      }
  };

  const handleConnectDrive = () => {
      try {
          configureDrive(scriptUrl);
      } catch (e: any) {
          alert(e.message || "Invalid URL. Please enter the Web App URL from Google Apps Script.");
      }
  };

  const handleDisconnectDrive = () => {
      disconnectDrive();
      setScriptUrl('');
  };

  const handleTestConnection = async () => {
    if (!scriptUrl) return;
    setTestStatus('testing');
    setTestMessage('');
    setShowTroubleshoot(false);
    try {
        const result = await testConnection(scriptUrl);
        if (result.success) {
            setTestStatus('success');
            setTestMessage('Connected!');
            configureDrive(scriptUrl);
        } else {
            setTestStatus('error');
            setTestMessage(result.message || 'Connection failed');
            if (result.message?.includes("Permission Denied")) {
                setShowTroubleshoot(true);
            }
        }
    } catch (e: any) {
        setTestStatus('error');
        setTestMessage(e.message);
    }
  };

  const handleSelectKey = () => {
    // Show input to allow user to enter or update key
    setShowKeyInput(true);
    setKeyError(null);
  };

  const handleVerifyAndSaveKey = async () => {
    if (!tempKey.trim()) return;
    setIsVerifyingKey(true);
    setKeyError(null);
    
    const isValid = await validateApiKey(tempKey);
    setIsVerifyingKey(false);
    
    if (isValid) {
        localStorage.setItem('gemini_api_key', tempKey);
        setIsPaidMode(true);
        setShowKeyInput(false);
        setTempKey('');
        setErrorStatus(null);
        if (errorStatus) {
            setAppState(AppState.HOME);
        }
    } else {
        setKeyError("Invalid API Key. Please check and try again.");
        // Revert to Lite mode if validation fails
        if (!isPaidMode) setIsPaidMode(false);
    }
  };

  const switchToLite = () => {
      setIsPaidMode(false);
      localStorage.removeItem('gemini_api_key');
      setShowKeyInput(false);
      setKeyError(null);
  };

  const handleCreateStory = async (request: StoryRequest) => {
    const isLearning = request.mode === 'learning';
    setErrorStatus(null);
    setLoadingState({ status: isLearning ? "Gathering information..." : "Writing the story...", progress: 10 });
    setAppState(AppState.GENERATING_STORY);

    try {
      const generatedStory = await generateStoryStructure(request);
      generatedStory.mode = request.mode;
      generatedStory.characterName = request.characterName;
      generatedStory.topic = request.topic;
      generatedStory.style = request.style;
      generatedStory.pageCount = request.pageCount;
      
      setLoadingState({ status: "Painting illustrations...", progress: 30 });
      
      const pagesWithAssets = [...generatedStory.pages];
      for (let i = 0; i < pagesWithAssets.length; i++) {
         setLoadingState({ status: `Painting page ${i + 1}...`, progress: 30 + Math.floor(((i + 1) / pagesWithAssets.length) * 60) });
         pagesWithAssets[i].imageUrl = await generateImageForPage(
             pagesWithAssets[i].image_prompt, 
             request.style, 
             generatedStory.characterImage,
             generatedStory.characterDescription || request.characterDescription
         );
         pagesWithAssets[i].audioUrl = await generateSpeech(pagesWithAssets[i].text, request.voiceGender, request.voiceTone);
      }
      generatedStory.pages = pagesWithAssets;
      setStory(generatedStory);
      
      // Auto-save if enabled
      if (autoSave) {
          saveStoryToLibrary(generatedStory).then(saved => {
              setSavedStories(prev => [saved, ...prev]);
          }).catch(e => console.error("Auto-save failed", e));
      }

      setAppState(AppState.READING);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('429') || error.status === 429) {
          setErrorStatus("QUOTA_EXHAUSTED");
      } else {
          alert("Magic failed. Try again!");
          setAppState(AppState.HOME);
      }
    } finally {
      setLoadingState(null);
    }
  };

  const handleCreateBonusStory = (topic: string) => {
      if (!story) return;
      const bonusRequest: StoryRequest = {
          topic: topic,
          characterName: "The Reader", 
          characterDescription: "A brave learner", 
          style: "3D Cartoon",
          ageGroup: story.ageGroup || "Preschool (3-5 years)",
          mode: 'learning',
          voiceGender: story.voiceGender || 'female',
          voiceTone: story.voiceTone || 'Cheerful',
          characterImage: story.characterImage,
          pageCount: 1
      };
      handleCreateStory(bonusRequest);
  };

  const handleFinishBrainstorming = (narration: string) => {
      setBrainstormedIdea(narration);
      setAppState(AppState.HOME);
      setActiveTab('story');
  };

  const handleGoHome = () => {
    setStory(null);
    setAppState(AppState.HOME);
    loadLibrary();
  };

  const filteredStories = useMemo(() => {
    if (!searchTerm.trim()) return savedStories;
    const term = searchTerm.toLowerCase();
    return savedStories.filter(s => {
      const inTitle = s.title.toLowerCase().includes(term);
      const inText = s.pages.some(p => p.text.toLowerCase().includes(term));
      return inTitle || inText;
    });
  }, [savedStories, searchTerm]);

  return (
    <div className="h-[100dvh] w-screen bg-[#f3f4f6] relative overflow-hidden font-comic selection:bg-indigo-300 selection:text-white">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-300 rounded-full opacity-30 blur-3xl pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-purple-400 rounded-full opacity-30 blur-3xl pointer-events-none mix-blend-multiply" />

      {/* Main Container with Safe Area Padding */}
      <div className="relative z-10 h-full flex flex-col p-2 md:p-3 lg:p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        {appState === AppState.BRAINSTORMING ? (
            <BrainstormingScreen 
                onFinish={handleFinishBrainstorming} 
                onCancel={() => setAppState(AppState.HOME)} 
            />
        ) : appState === AppState.GENERATING_STORY ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in z-50 relative">
             {/* Floating Icons Background for Loading Screen */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                 <Ghost className="absolute top-[10%] left-[10%] w-16 h-16 text-indigo-300/40 animate-slow-float" style={{ '--delay': '0s' } as any} />
                 <Cloud className="absolute top-[20%] right-[15%] w-20 h-20 text-sky-200/50 animate-slow-float-alt" style={{ '--delay': '-2s' } as any} />
                 <Star className="absolute bottom-[15%] left-[20%] w-12 h-12 text-yellow-300/50 animate-slow-float" style={{ '--delay': '-4s' } as any} />
                 <Sparkles className="absolute top-[40%] left-[50%] w-10 h-10 text-purple-300/40 animate-slow-float-alt" style={{ '--delay': '-1s' } as any} />
                 <Moon className="absolute bottom-[30%] right-[10%] w-16 h-16 text-indigo-200/40 animate-slow-float" style={{ '--delay': '-5s' } as any} />
                 <Rocket className="absolute top-[60%] left-[5%] w-14 h-14 text-rose-300/40 animate-slow-float-alt" style={{ '--delay': '-3s' } as any} />
                 <Music className="absolute bottom-[10%] right-[30%] w-10 h-10 text-pink-300/40 animate-slow-float" style={{ '--delay': '-6s' } as any} />
                 <Sun className="absolute top-[5%] right-[40%] w-16 h-16 text-amber-300/30 animate-slow-float-alt" style={{ '--delay': '-7s' } as any} />
                 <Balloon className="absolute top-[75%] left-[40%] w-12 h-12 text-sky-400/30 animate-slow-float" style={{ '--delay': '-1.5s' } as any} />
                 <Heart className="absolute top-[30%] left-[5%] w-10 h-10 text-rose-400/30 animate-slow-float-alt" style={{ '--delay': '-4.5s' } as any} />
                 <Rabbit className="absolute bottom-[40%] right-[25%] w-14 h-14 text-slate-300/30 animate-slow-float" style={{ '--delay': '-9s' } as any} />
                 <Gem className="absolute top-[15%] left-[30%] w-10 h-10 text-emerald-300/30 animate-slow-float-alt" style={{ '--delay': '-11s' } as any} />
                 <Snowflake className="absolute bottom-[5%] left-[10%] w-8 h-8 text-blue-200/30 animate-slow-float" style={{ '--delay': '-13s' } as any} />
                 <Fish className="absolute top-[50%] right-[5%] w-12 h-12 text-cyan-400/20 animate-slow-float-alt" style={{ '--delay': '-3.5s' } as any} />
                 <PizzaIcon className="absolute bottom-[20%] left-[50%] w-10 h-10 text-orange-400/20 animate-slow-float" style={{ '--delay': '-15s' } as any} />
                 <Plane className="absolute top-[10%] left-[60%] w-14 h-14 text-indigo-400/20 animate-slow-float-alt" style={{ '--delay': '-8s' } as any} />
                 <IceCream className="absolute top-[40%] left-[20%] w-12 h-12 text-pink-300/20 animate-slow-float" style={{ '--delay': '-10s' } as any} />
                 <Cookie className="absolute bottom-[40%] left-[60%] w-10 h-10 text-amber-400/20 animate-slow-float-alt" style={{ '--delay': '-12s' } as any} />
                 <Bird className="absolute top-[80%] right-[20%] w-14 h-14 text-sky-300/20 animate-slow-float" style={{ '--delay': '-5.5s' } as any} />
             </div>

             <div className="bg-white/90 backdrop-blur-md p-10 rounded-[3rem] shadow-2xl max-w-md w-full border-4 border-indigo-50 relative overflow-hidden z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg relative">
                        <Sparkles className="w-12 h-12 text-indigo-500 animate-spin-slow" />
                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20"></div>
                    </div>
                    
                    <h2 className="text-3xl font-black text-indigo-900 mb-2">Making Magic...</h2>
                    <p className="text-slate-500 font-bold mb-8 animate-pulse">{loadingState?.status || "Preparing your adventure..."}</p>
                    
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-4 border border-slate-200">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out relative"
                            style={{ width: `${loadingState?.progress || 0}%` }}
                        >
                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                    <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">{Math.round(loadingState?.progress || 0)}% Complete</p>
                </div>
             </div>
          </div>
        ) : errorStatus === "QUOTA_EXHAUSTED" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
             <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-lg relative overflow-hidden">
                <AlertCircle className="w-20 h-20 text-indigo-600 mx-auto mb-6" />
                <h2 className="text-5xl font-black text-indigo-900 mb-4">Magic Quota Full!</h2>
                <p className="text-indigo-600 font-bold text-xl mb-8 leading-relaxed">The magic wand needs a little break. Use your own key to keep the stories flowing!</p>
                <div className="flex flex-col gap-4">
                    <button onClick={() => { setShowSettings(true); setShowKeyInput(true); }} className="w-full py-5 bg-indigo-600 text-white text-2xl font-bold rounded-2xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-3 transition-colors">
                        <Key className="w-6 h-6" /> Use My Own Key
                    </button>
                    <button onClick={() => { setErrorStatus(null); setAppState(AppState.HOME); }} className="text-indigo-50 font-bold hover:text-indigo-700 underline decoration-2 underline-offset-4">Maybe Later</button>
                </div>
             </div>
          </div>
        ) : appState === AppState.HOME ? (
          <div className="flex-1 flex flex-col overflow-hidden w-full relative transition-all duration-500">
             
             {/* Settings Button - Positioned respecting safe area */}
             <button 
                onClick={() => setShowSettings(true)}
                className="absolute top-[max(0rem,env(safe-area-inset-top))] right-2 p-4 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white/50 text-indigo-400 hover:text-indigo-600 hover:scale-110 transition-all z-30"
                title="Magic Settings"
             >
                <Settings className={`w-6 h-6 ${showSettings ? 'animate-spin-slow' : ''}`} />
             </button>

             {/* Desktop Navigation */}
             <div className="hidden md:flex justify-center mb-3 z-20 shrink-0 mt-[max(1rem,env(safe-area-inset-top))] md:mt-0">
                 <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full flex gap-3 shadow-lg border border-white/50 overflow-x-auto no-scrollbar">
                     <button onClick={() => setActiveTab('home')} className={`px-6 py-4 rounded-full font-black text-xl transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-900/60 hover:bg-indigo-50 hover:text-indigo-900'}`}><Home className="w-6 h-6" /> Home</button>
                     <button onClick={() => setActiveTab('story')} className={`px-6 py-4 rounded-full font-black text-xl transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === 'story' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-900/60 hover:bg-indigo-50 hover:text-indigo-900'}`}><Sparkles className="w-6 h-6" /> Create Story</button>
                     <button onClick={() => setActiveTab('learning')} className={`px-6 py-4 rounded-full font-black text-xl transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === 'learning' ? 'bg-sky-600 text-white shadow-md' : 'text-indigo-900/60 hover:bg-indigo-50 hover:text-sky-700'}`}><GraduationCap className="w-6 h-6" /> Learn Topic</button>
                     <button onClick={() => setActiveTab('coloring')} className={`px-6 py-4 rounded-full font-black text-xl transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === 'coloring' ? 'bg-[#892b64] text-white shadow-[0_0_15px_rgba(137,43,100,0.4)]' : 'text-indigo-900/60 hover:bg-indigo-50 hover:text-[#892b64]'}`}><Palette className="w-6 h-6" /> Coloring Book</button>
                     <button onClick={() => setActiveTab('library')} className={`px-6 py-4 rounded-full font-black text-xl transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === 'library' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-900/60 hover:bg-indigo-50 hover:text-indigo-900'}`}><Library className="w-6 h-6" /> Library</button>
                     <button onClick={() => setActiveTab('tracking')} className={`px-6 py-4 rounded-full font-black text-xl transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === 'tracking' ? 'bg-green-600 text-white shadow-md' : 'text-indigo-900/60 hover:bg-indigo-50 hover:text-indigo-900'}`}><TrendingUp className="w-6 h-6" /> Journal</button>
                 </div>
             </div>

             {/* Mobile Bottom Navigation */}
             <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-indigo-100 z-50 pb-[max(0rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                 <div className="flex justify-around items-center p-2">
                     <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'home' ? 'text-indigo-600 scale-110' : 'text-indigo-300 hover:text-indigo-400'}`}>
                         <Home className="w-6 h-6 mb-1" />
                         <span className="text-[10px] font-bold">Home</span>
                     </button>
                     <button onClick={() => setActiveTab('story')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'story' ? 'text-indigo-600 scale-110' : 'text-indigo-300 hover:text-indigo-400'}`}>
                         <Sparkles className="w-6 h-6 mb-1" />
                         <span className="text-[10px] font-bold">Story</span>
                     </button>
                     <button onClick={() => setActiveTab('learning')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'learning' ? 'text-sky-600 scale-110' : 'text-sky-300 hover:text-sky-400'}`}>
                         <GraduationCap className="w-6 h-6 mb-1" />
                         <span className="text-[10px] font-bold">Learn</span>
                     </button>
                     <button onClick={() => setActiveTab('coloring')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'coloring' ? 'text-[#892b64] scale-110' : 'text-indigo-300 hover:text-[#892b64]'}`}>
                         <Palette className="w-6 h-6 mb-1" />
                         <span className="text-[10px] font-bold">Color</span>
                     </button>
                     <button onClick={() => setActiveTab('library')} className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === 'library' ? 'text-indigo-600 scale-110' : 'text-indigo-300 hover:text-indigo-400'}`}>
                         <Library className="w-6 h-6 mb-1" />
                         <span className="text-[10px] font-bold">Library</span>
                     </button>
                 </div>
             </div>

             <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col pb-[80px] md:pb-0">
                 {activeTab === 'home' ? (
                     <div className="flex-1 overflow-y-auto custom-scrollbar w-full animate-fade-in">
                        <div className="max-w-5xl mx-auto p-4 pb-20">
                            {/* Hero Section */}
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden mb-8 min-h-[450px] flex items-center">
                                {/* Background decorations */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400 opacity-20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
                                
                                {/* Hero Background - Abstract gradients since image is removed */}
                                <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-800">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/50 via-transparent to-transparent"></div>
                                </div>
                                
                                {/* Floating Icons - MULTI-DIRECTIONAL HERO COLLECTION */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                                    <Castle className="absolute top-[10%] right-[10%] w-16 h-16 text-white/20 animate-slow-float" style={{ '--delay': '0s' } as any} />
                                    <Rocket className="absolute bottom-[10%] left-[5%] w-12 h-12 text-white/20 animate-slow-float-alt" style={{ '--delay': '-2s' } as any} />
                                    <Star className="absolute top-[20%] left-[40%] w-8 h-8 text-yellow-300/40 animate-slow-float" style={{ '--delay': '-4s' } as any} />
                                    <Moon className="absolute bottom-[30%] right-[30%] w-10 h-10 text-purple-200/30 animate-slow-float-alt" style={{ '--delay': '-5s' } as any} />
                                    <Cloud className="absolute top-[15%] left-[10%] w-14 h-14 text-white/10 animate-slow-float" style={{ '--delay': '-1s' } as any} />
                                    <Heart className="absolute top-[40%] right-[40%] w-10 h-10 text-rose-300/20 animate-slow-float-alt" style={{ '--delay': '-3s' } as any} />
                                    <Balloon className="absolute bottom-[15%] left-[35%] w-12 h-12 text-sky-300/20 animate-slow-float" style={{ '--delay': '-6s' } as any} />
                                    <Rabbit className="absolute top-[60%] left-[15%] w-12 h-12 text-white/10 animate-slow-float-alt" style={{ '--delay': '-4.5s' } as any} />
                                    <Sparkles className="absolute bottom-[40%] right-[5%] w-8 h-8 text-yellow-200/30 animate-slow-float" style={{ '--delay': '-2.5s' } as any} />
                                    <Sun className="absolute top-[5%] left-[25%] w-14 h-14 text-amber-200/20 animate-slow-float-alt" style={{ '--delay': '-7.5s' } as any} />
                                    <Gem className="absolute bottom-[5%] right-[45%] w-8 h-8 text-emerald-200/20 animate-slow-float" style={{ '--delay': '-9s' } as any} />
                                    <Feather className="absolute top-[30%] right-[15%] w-10 h-10 text-slate-100/10 animate-slow-float-alt" style={{ '--delay': '-11s' } as any} />
                                    <Gift className="absolute bottom-[20%] left-[10%] w-10 h-10 text-pink-200/20 animate-slow-float" style={{ '--delay': '-14s' } as any} />
                                    <Umbrella className="absolute top-[50%] right-[25%] w-10 h-10 text-blue-200/15 animate-slow-float-alt" style={{ '--delay': '-5.5s' } as any} />
                                    <Dog className="absolute top-[70%] left-[50%] w-12 h-12 text-white/10 animate-slow-float" style={{ '--delay': '-13s' } as any} />
                                    <Anchor className="absolute bottom-[40%] left-[15%] w-10 h-10 text-sky-100/10 animate-slow-float-alt" style={{ '--delay': '-16s' } as any} />
                                    <Smile className="absolute top-[10%] right-[50%] w-8 h-8 text-yellow-400/20 animate-slow-float" style={{ '--delay': '-18s' } as any} />
                                </div>
                                
                                <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                                    <div className="max-w-2xl">
                                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold -mt-10 mb-14 border border-white/10 shadow-lg">
                                            <Sparkles className="w-4 h-4 text-yellow-300" />
                                            <span>The #1 Magical Storyteller for Kids</span>
                                        </div>
                                        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight drop-shadow-lg">
                                            Turn Ideas into <br/>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">Magic Stories</span>
                                        </h1>
                                        <p className="text-lg md:text-xl text-indigo-100 font-bold mb-20 leading-relaxed max-w-lg drop-shadow-md">
                                            Create personalized picture books, learn new topics, and practice reading with your very own AI coach.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button 
                                                onClick={() => setActiveTab('story')}
                                                className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xl shadow-xl hover:bg-indigo-50 hover:scale-105 transition-all flex items-center gap-3"
                                            >
                                                <Wand2 className="w-6 h-6" /> Start Creating
                                            </button>
                                            <button 
                                                onClick={() => setAppState(AppState.BRAINSTORMING)}
                                                className="px-8 py-4 bg-indigo-500/20 backdrop-blur-md text-white border-2 border-white/30 rounded-2xl font-black text-xl shadow-xl hover:bg-indigo-500/30 hover:scale-105 transition-all flex items-center gap-3"
                                            >
                                                <Sparkles className="w-6 h-6 text-yellow-300" /> Dreaming Chamber
                                            </button>
                                        </div>
                                    </div>

                                    {/* Feature Carousel Card - Phone Mockup Style */}
                                    <div className="hidden md:flex flex-col items-center justify-center w-[220px] h-[360px] relative shrink-0 perspective-1000 group">
                                         {/* 3D Depth Layers - Shadow */}
                                         <div className="absolute inset-0 bg-indigo-900/20 rounded-[2.5rem] transform translate-x-4 translate-y-4 blur-xl transition-all group-hover:translate-x-5 group-hover:translate-y-5"></div>
                                         
                                         <div className="relative w-full h-full rounded-[2.5rem] shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] bg-white flex flex-col items-center text-center transition-all duration-500 overflow-hidden transform group-hover:scale-[1.02] group-hover:-rotate-1 border-[6px] border-slate-50">
                                              
                                              {/* Floating Icons Background */}
                                              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                                 <Sparkles className="absolute top-[15%] left-[10%] w-6 h-6 text-yellow-400 animate-slow-float" style={{ '--delay': '0s' } as any} />
                                                 <Music className="absolute bottom-[20%] right-[10%] w-5 h-5 text-pink-400 animate-slow-float-alt" style={{ '--delay': '-2s' } as any} />
                                                 <Star className="absolute top-[40%] right-[15%] w-4 h-4 text-indigo-400 animate-slow-float" style={{ '--delay': '-4s' } as any} />
                                                 <Heart className="absolute bottom-[10%] left-[20%] w-5 h-5 text-rose-400 animate-slow-float-alt" style={{ '--delay': '-1s' } as any} />
                                                 <Cloud className="absolute top-[10%] right-[30%] w-8 h-8 text-sky-200 animate-slow-float" style={{ '--delay': '-3s' } as any} />
                                                 <Zap className="absolute top-[60%] left-[5%] w-4 h-4 text-amber-400 animate-slow-float-alt" style={{ '--delay': '-1.5s' } as any} />
                                              </div>

                                              {/* Notch */}
                                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-100 rounded-b-xl z-20"></div>

                                              <div 
                                                key={featureIndex} 
                                                className="flex-1 flex flex-col justify-center items-center gap-4 p-5 animate-slide-up-fade w-full z-10 relative"
                                              >
                                                  {/* Feature Icon Circle */}
                                                  <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br ${FEATURES[featureIndex].gradient} shadow-md mb-2`}>
                                                      <Sparkles className="w-8 h-8 text-white" />
                                                  </div>

                                                  <h3 className="text-2xl font-black text-slate-800 leading-tight">{FEATURES[featureIndex].title}</h3>
                                                  <p className="text-sm font-bold text-slate-500 leading-relaxed px-2">{FEATURES[featureIndex].desc}</p>
                                              </div>
                                              
                                              {/* Interactive Dots */}
                                              <div className="flex gap-1.5 mt-auto z-30 mb-6 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                                  {FEATURES.map((_, idx) => (
                                                      <button 
                                                        key={idx} 
                                                        onClick={() => setFeatureIndex(idx)}
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === featureIndex ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-300 hover:bg-indigo-300'}`} 
                                                      />
                                                  ))}
                                              </div>
                                         </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions Grid */}
                            <h2 className="text-2xl font-black text-indigo-900 mb-6 flex items-center gap-2 px-2">
                                <Compass className="w-6 h-6 text-indigo-500" /> Explore
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-12">
                                <div onClick={() => setActiveTab('story')} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl transition-all cursor-pointer group border border-indigo-50 hover:border-indigo-100 flex flex-col items-center md:items-start text-center md:text-left">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-100 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                                        <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" />
                                    </div>
                                    <h3 className="text-[15px] md:text-2xl font-black text-indigo-900 mb-1 md:mb-2">Create a Story</h3>
                                    <p className="hidden md:block text-slate-500 font-bold text-sm">Invent characters and go on magical adventures.</p>
                                </div>
                                
                                <div onClick={() => setActiveTab('learning')} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl transition-all cursor-pointer group border border-sky-50 hover:border-sky-100 flex flex-col items-center md:items-start text-center md:text-left">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-sky-100 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                                        <GraduationCap className="w-6 h-6 md:w-7 md:h-7 text-sky-600" />
                                    </div>
                                    <h3 className="text-[15px] md:text-2xl font-black text-sky-900 mb-1 md:mb-2">Learn a Topic</h3>
                                    <p className="hidden md:block text-slate-500 font-bold text-sm">Discover fun facts about space, animals, and more.</p>
                                </div>

                                <div onClick={() => setActiveTab('coloring')} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl transition-all cursor-pointer group border border-[#892b64]/20 hover:border-[#892b64]/40 flex flex-col items-center md:items-start text-center md:text-left">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#892b64]/10 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                                        <Palette className="w-6 h-6 md:w-7 md:h-7 text-[#892b64]" />
                                    </div>
                                    <h3 className="text-[15px] md:text-2xl font-black text-[#892b64] mb-1 md:mb-2">Coloring Books</h3>
                                    <p className="hidden md:block text-slate-500 font-bold text-sm">Print your own custom coloring pages.</p>
                                </div>

                                <div onClick={() => setActiveTab('tracking')} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl transition-all cursor-pointer group border border-green-50 hover:border-green-100 flex flex-col items-center md:items-start text-center md:text-left">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-green-100 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                                        <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
                                    </div>
                                    <h3 className="text-[15px] md:text-2xl font-black text-green-900 mb-1 md:mb-2">Reading Journal</h3>
                                    <p className="hidden md:block text-slate-500 font-bold text-sm">Track your progress and earn badges.</p>
                                </div>
                            </div>

                            {/* How it Works */}
                            <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-10 shadow-lg border border-indigo-50 mb-8 md:mb-12">
                                <h2 className="text-xl md:text-2xl font-black text-indigo-900 mb-5 md:mb-8 text-center">How Magic Happens</h2>
                                <div className="grid grid-cols-3 gap-2 md:gap-8 justify-between">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-10 h-10 md:w-16 md:h-16 bg-pink-100 rounded-full flex items-center justify-center mb-2 md:mb-4 text-lg md:text-2xl font-black text-pink-500">1</div>
                                        <h4 className="text-[12px] md:text-lg font-black text-indigo-900 mb-1 md:mb-2">Dream It</h4>
                                        <p className="hidden md:block text-slate-500 font-bold text-sm">Type a topic or use your voice to brainstorm ideas with our magic star.</p>
                                    </div>
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-10 h-10 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-2 md:mb-4 text-lg md:text-2xl font-black text-yellow-600">2</div>
                                        <h4 className="text-[12px] md:text-lg font-black text-indigo-900 mb-1 md:mb-2">Create It</h4>
                                        <p className="hidden md:block text-slate-500 font-bold text-sm">Watch as AI writes the story and paints beautiful pictures for every page.</p>
                                    </div>
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-10 h-10 md:w-16 md:h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-2 md:mb-4 text-lg md:text-2xl font-black text-indigo-600">3</div>
                                        <h4 className="text-[12px] md:text-lg font-black text-indigo-900 mb-1 md:mb-2">Read It</h4>
                                        <p className="hidden md:block text-slate-500 font-bold text-sm">Read along, click words for help, or listen to the story narrator.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Testimonial */}
                            <div className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-center relative overflow-hidden text-white mb-8">
                                <div className="relative z-10">
                                    <div className="flex justify-center mb-4">
                                        {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />)}
                                    </div>
                                    <p className="text-xl md:text-2xl font-bold italic mb-6">"This app made my son fall in love with reading! He loves seeing his own ideas come to life."</p>
                                    <p className="text-sm font-black text-indigo-300 uppercase tracking-widest">- Happy Parent</p>
                                </div>
                                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                            </div>
                        </div>
                     </div>
                 ) : activeTab === 'tracking' ? (
                     <TrackingView onSelectTopic={(t) => { setBrainstormedIdea(t); setActiveTab('story'); }} />
                 ) : activeTab === 'coloring' ? (
                     <ColoringBookGenerator />
                 ) : activeTab === 'library' ? (
                     <div className="h-full flex flex-col p-2 animate-fade-in relative">
                         {!isDriveConnected ? (
                             <div className="flex-1 flex flex-col items-center justify-center text-center p-4 md:p-8 bg-white/60 rounded-[3rem] border-4 border-dashed border-indigo-200 overflow-y-auto max-w-5xl mx-auto w-full">
                                 <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-float"><Cloud className="w-12 h-12 text-indigo-500" /></div>
                                 <h3 className="text-3xl font-black text-indigo-900 mb-2">Connect Your Cloud</h3>
                                 <p className="text-indigo-500 font-bold mb-6 text-lg max-w-md">Connect to Google Drive & Sheets to save your stories forever!</p>
                                 
                                 <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-lg border border-indigo-100 text-left relative">
                                     <button onClick={() => setShowHelp(!showHelp)} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-600"><HelpCircle className="w-6 h-6" /></button>
                                     <label className="block text-sm font-black text-indigo-900 mb-2 ml-1">Google Apps Script URL</label>
                                     <input 
                                        type="text" 
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        value={scriptUrl} 
                                        onChange={(e) => setScriptUrl(e.target.value)} 
                                        className="w-full p-4 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-bold text-slate-700 mb-4 text-xs"
                                     />
                                     <button 
                                        onClick={handleConnectDrive} 
                                        disabled={!scriptUrl}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                     >
                                         <Link className="w-5 h-5" /> Connect Now
                                     </button>

                                     {showHelp && (
                                         <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-2 border border-slate-200 animate-fade-in">
                                             <p className="font-bold text-indigo-900 uppercase tracking-wide mb-1">How to get the URL:</p>
                                             <ol className="list-decimal pl-4 space-y-1">
                                                 <li>Go to <b>script.google.com</b> and create a project.</li>
                                                 <li>Paste the backend code.</li>
                                                 <li>Click <b>Deploy &gt; New deployment</b>.</li>
                                                 <li>Type: <b>Web app</b>.</li>
                                                 <li className="text-red-500 font-black">Who has access: Anyone (Important!)</li>
                                                 <li>Copy the <b>Web App URL</b> (ends in /exec).</li>
                                             </ol>
                                         </div>
                                     )}
                                     {!showHelp && <p onClick={() => setShowHelp(true)} className="text-center text-xs font-bold text-indigo-400 mt-4 cursor-pointer hover:underline flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> Setup Instructions</p>}
                                 </div>
                             </div>
                         ) : (
                             <>
                                 <div className="mb-6 mt-4 md:mt-8 max-w-xl mx-auto w-full flex items-center gap-3 relative z-20">
                                     <div className="relative flex-1 group">
                                         <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors">
                                             <Search className="w-6 h-6" />
                                         </div>
                                         <input 
                                             type="text" 
                                             placeholder="Search by title..." 
                                             value={searchTerm}
                                             onChange={(e) => setSearchTerm(e.target.value)}
                                             className="w-full py-5 pl-16 pr-16 bg-white rounded-2xl border-2 border-slate-100 shadow-sm outline-none focus:border-indigo-500 focus:shadow-indigo-100 transition-all font-bold text-lg text-indigo-900 placeholder-slate-400"
                                         />
                                         {searchTerm && (
                                             <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                                         )}
                                     </div>

                                     <button 
                                        onClick={() => setLibraryViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
                                        className="p-5 rounded-2xl border-2 bg-white text-indigo-400 border-slate-100 hover:border-indigo-200 shadow-sm transition-all flex items-center justify-center"
                                        title={libraryViewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
                                     >
                                        {libraryViewMode === 'grid' ? <List className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}
                                     </button>
                                 </div>

                                 {isLoadingLibrary && savedStories.length > 0 && (
                                     <div className="w-full flex justify-center mb-4 animate-fade-in">
                                         <div className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-indigo-400 text-xs font-bold border border-indigo-50 shadow-sm">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>Syncing cloud library...</span>
                                         </div>
                                     </div>
                                 )}

                                 <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                                     {isLoadingLibrary && savedStories.length === 0 ? (
                                         <div className="flex flex-col items-center justify-center py-20 gap-4">
                                             <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                                             <p className="font-bold text-indigo-400">Fetching your stories...</p>
                                         </div>
                                     ) : filteredStories.length === 0 ? (
                                         <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                                             <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
                                             <h4 className="text-2xl font-black text-slate-400">Your library is empty</h4>
                                             <p className="text-slate-300 font-bold mb-6">Time to write a new adventure!</p>
                                             <button onClick={() => setActiveTab('story')} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Create Story</button>
                                         </div>
                                     ) : libraryViewMode === 'grid' ? (
                                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
                                             {filteredStories.map((s) => (
                                                 <div key={s.id} onClick={() => { setStory(s); setAppState(AppState.READING); }} className="bg-white rounded-[2.5rem] p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative border border-indigo-50 animate-fade-in">
                                                     <div className="aspect-[4/3] bg-indigo-50 relative overflow-hidden rounded-[2rem] mb-4 shadow-inner">
                                                         {s.pages[0]?.imageUrl ? (
                                                            <img src={s.pages[0].imageUrl} alt="cover" referrerPolicy="no-referrer" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                                                         ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                                                                <BookOpen className="w-16 h-16 text-indigo-300" />
                                                            </div>
                                                         )}
                                                         <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent flex items-end p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                             <span className="text-white font-black tracking-wide text-xl uppercase flex items-center gap-3"><BookOpen className="w-6 h-6" /> Read Now</span>
                                                         </div>
                                                     </div>
                                                     <div className="px-1 flex-1 flex flex-col">
                                                         <h3 className="text-2xl font-black text-indigo-900 mb-2 line-clamp-1 leading-tight">{s.title}</h3>
                                                         <p className="text-sm text-slate-500 font-bold line-clamp-1 mb-4 leading-relaxed">
                                                            {s.pages[0]?.text}
                                                         </p>
                                                         <div className="flex items-center justify-between mt-auto">
                                                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{s.pages.length} Pages</span>
                                                            <div className="flex items-center gap-2">
                                                                {/* Delete button hidden as requested */}
                                                            </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     ) : (
                                         <div className="flex flex-col gap-4 max-w-4xl mx-auto px-4">
                                             {filteredStories.map((s) => (
                                                 <div key={s.id} onClick={() => { setStory(s); setAppState(AppState.READING); }} className="bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group flex items-center gap-6 border border-slate-100 animate-fade-in">
                                                     <div className="w-24 h-24 bg-indigo-50 relative overflow-hidden rounded-2xl shadow-inner shrink-0">
                                                         {s.pages[0]?.imageUrl ? (
                                                            <img src={s.pages[0].imageUrl} alt="cover" referrerPolicy="no-referrer" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                                                         ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                                                                <BookOpen className="w-8 h-8 text-indigo-300" />
                                                            </div>
                                                         )}
                                                     </div>
                                                     <div className="flex-1 min-w-0">
                                                         <h3 className="text-2xl font-black text-indigo-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">{s.title}</h3>
                                                         <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-50/50 px-3 py-1 rounded-full uppercase tracking-widest">
                                                                {new Date(s.createdAt || Date.now()).toLocaleDateString()}
                                                            </span>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.pages.length} Pages</span>
                                                            {s.mode === 'learning' && (
                                                                <span className="text-[10px] font-black text-sky-500 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                                                    <GraduationCap className="w-3 h-3" /> Learning
                                                                </span>
                                                            )}
                                                         </div>
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                        {/* Delete button hidden as requested */}
                                                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            <ChevronRight className="w-6 h-6" />
                                                        </div>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             </>
                         )}
                     </div>
                 ) : (
                    <div className="h-full flex flex-col animate-fade-in max-w-5xl mx-auto w-full">
                        <StoryForm 
                            mode={activeTab as 'story' | 'learning'} 
                            onSubmit={handleCreateStory} 
                            isLoading={false} 
                            initialTopic={brainstormedIdea}
                            onStartBrainstorming={() => setAppState(AppState.BRAINSTORMING)}
                            voiceGender={voiceGender}
                            voiceTone={voiceTone}
                        />
                    </div>
                 )}
             </div>
          </div>
        ) : (story && <StoryReader story={story} onHome={handleGoHome} onCreateBonusStory={handleCreateBonusStory} />)}
      </div>
      
      {/* Settings Modal - Padding adjustments */}
      {showSettings && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-indigo-900/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-2xl w-full relative border-4 border-indigo-100 max-h-[85dvh] overflow-y-auto custom-scrollbar">
              <button 
                type="button" 
                onClick={() => { setShowSettings(false); setShowKeyInput(false); setKeyError(null); }} 
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h3 className="text-2xl font-black text-indigo-900 mb-6 flex items-center gap-3">
                <Settings className="w-6 h-6" /> Magic Settings
              </h3>

              <div className="flex flex-col gap-6">
                  {/* Voice Settings */}
                  <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="col-span-1">
                          <label className="flex items-center gap-2 text-base font-black text-indigo-900 mb-2 ml-2">
                              <Mic2 className="w-5 h-5 text-indigo-500" /> Storyteller Voice
                          </label>
                          <div className="flex bg-white rounded-xl p-1.5 shadow-sm gap-1.5 border border-indigo-100">
                              <button type="button" onClick={() => setVoiceGender('female')} className={`flex-1 py-3 rounded-lg text-base font-bold transition-all ${voiceGender === 'female' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-transparent text-indigo-400 hover:bg-indigo-50'}`}>Female</button>
                              <button type="button" onClick={() => setVoiceGender('male')} className={`flex-1 py-3 rounded-lg text-base font-bold transition-all ${voiceGender === 'male' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-transparent text-indigo-400 hover:bg-indigo-50'}`}>Male</button>
                          </div>
                      </div>
                      <div className="col-span-1">
                          <label className="flex items-center gap-2 text-base font-black text-indigo-900 mb-2 ml-2">
                              <Volume2 className="w-5 h-5 text-indigo-500" /> Reading Tone
                          </label>
                          <div className="relative bg-white rounded-xl shadow-sm border border-indigo-100">
                              <select className="w-full p-3 rounded-xl bg-transparent disabled:bg-slate-50 text-base focus:ring-2 focus:ring-indigo-500 focus:ring-inset outline-none text-indigo-900 font-bold appearance-none" value={voiceTone} onChange={(e) => setVoiceTone(e.target.value)}>
                                  {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-300">
                                  <Sparkles className="w-5 h-5" />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Model Performance Tier */}
                  <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col gap-4">
                      <div className="flex items-center justify-between px-2">
                        <label className="flex items-center gap-2 text-base font-black text-purple-900">
                            <Zap className="w-5 h-5 text-purple-500" /> Performance Tier
                        </label>
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] font-bold text-purple-400 hover:underline">Billing Docs</a>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button" 
                            onClick={switchToLite}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-1 items-start w-full ${!isPaidMode ? 'bg-white border-purple-500 shadow-md ring-2 ring-purple-100' : 'bg-white/50 border-slate-100 text-slate-400 hover:bg-white hover:border-purple-200'}`}
                          >
                              <span className="font-black text-sm">Magic Lite</span>
                              <span className="text-[10px] font-bold opacity-60">Standard Flash Models</span>

                          </button>
                          <button 
                            type="button" 
                            onClick={handleSelectKey}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-1 items-start w-full ${isPaidMode ? 'bg-white border-purple-500 shadow-md ring-2 ring-purple-100' : 'bg-white/50 border-slate-100 text-slate-400 hover:bg-white hover:border-purple-200'}`}
                          >
                              <span className="font-black text-sm flex items-center gap-1">Magical Pro <ShieldCheck className="w-3 h-3" /></span>
                              <span className="text-[10px] font-bold opacity-60">High-Quality Pro Models</span>

                          </button>
                      </div>

                      {showKeyInput && (
                          <div className="mt-2 bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-sm animate-fade-in">
                               <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-wide">Enter Gemini Pro API Key</label>
                               <div className="flex gap-2">
                                   <input 
                                        type="password" 
                                        value={tempKey}
                                        disabled={isVerifyingKey}
                                        onChange={(e) => { setTempKey(e.target.value); setKeyError(null); }}
                                        placeholder="AIzaSy..."
                                        className="flex-1 p-3 rounded-lg border-2 border-slate-100 bg-slate-50 text-sm font-bold focus:border-indigo-500 outline-none disabled:opacity-50"
                                   />
                                   <button 
                                        type="button"
                                        onClick={handleVerifyAndSaveKey}
                                        disabled={!tempKey || isVerifyingKey}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                                   >
                                       {isVerifyingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                   </button>
                               </div>
                               {keyError ? (
                                    <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {keyError}</p>
                               ) : (
                                    <p className="text-[10px] text-slate-400 font-bold mt-2">Key is stored locally in your browser.</p>
                                )}
                          </div>
                      )}
                      
                      {isPaidMode && !showKeyInput && (
                        <p className="text-[9px] text-purple-400 font-bold px-1 text-center animate-fade-in">
                           <Key className="w-3 h-3 inline mr-1" /> Paid API Key Active. You are using the most powerful magic!
                        </p>
                      )}
                      {!isPaidMode && !showKeyInput && (
                        <p className="text-[9px] text-slate-400 font-bold px-1 text-center">
                           Select Magical Pro to connect your own API Key for higher limits.
                        </p>
                      )}
                  </div>

                  {/* Cloud Library Config */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                         <label className="flex items-center gap-2 text-base font-black text-slate-700 ml-2">
                             <Cloud className="w-5 h-5 text-slate-500" /> Cloud Library Config
                         </label>
                         <button type="button" onClick={() => setShowTroubleshoot(!showTroubleshoot)} className="text-indigo-500 text-xs font-bold hover:underline">Need Help?</button>
                      </div>
                      <div className="flex gap-2">
                          <input type="text" placeholder={!isCustomUrl && isDriveConnected ? "Using Default Library (Enter URL to override)" : "https://script.google.com/macros/s/.../exec"} value={scriptUrl} onChange={(e) => { setScriptUrl(e.target.value); setTestStatus('idle'); setShowTroubleshoot(false); }} className="flex-1 p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-400" />
                          <button type="button" onClick={handleTestConnection} disabled={!scriptUrl || testStatus === 'testing'} className={`px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${testStatus === 'success' ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-50`}>
                              {testStatus === 'testing' ? <Loader2 className="w-5 h-5 animate-spin" /> : testStatus === 'success' ? <Check className="w-5 h-5" /> : "Test & Save"}
                          </button>
                          {isCustomUrl && (
                              <button type="button" onClick={() => disconnectDrive()} className="px-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-500" title="Reset to Default">
                                  <LogOut className="w-5 h-5" />
                              </button>
                          )}
                      </div>
                      {testStatus === 'error' && (
                          <div className="flex flex-col gap-2 animate-fade-in bg-red-50 p-3 rounded-xl border border-red-100">
                              <div className="flex items-center gap-2 text-red-500 text-xs font-bold"><AlertTriangle className="w-4 h-4 shrink-0" /> {testMessage}</div>
                              <button type="button" onClick={() => setShowTroubleshoot(true)} className="text-red-400 text-xs font-bold underline self-start ml-6">See fix guide</button>
                          </div>
                      )}
                      
                      {showTroubleshoot && (
                          <div className="mt-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-slate-600 animate-fade-in shadow-inner">
                              <h4 className="font-black text-indigo-900 mb-2 flex items-center gap-2"><HelpCircle className="w-3 h-3"/> Crucial Fix for "Permission Denied"</h4>
                              <p className="mb-2 font-bold text-red-600">If you get a permission error, it's 99% likely your script deployment settings are wrong.</p>
                              <ol className="list-decimal pl-4 space-y-1">
                                  <li>Open your project at <b>script.google.com</b>.</li>
                                  <li>Click <b>Deploy &gt; Manage deployments</b>.</li>
                                  <li>Click the pencil icon to edit.</li>
                                  <li className="text-indigo-900 font-black">Set 'Execute as' to: <b>Me</b>.</li>
                                  <li className="text-indigo-900 font-black bg-yellow-200 px-1">Set 'Who has access' to: <b className="underline">Anyone</b> (NOT 'Anyone with Google Account').</li>
                                  <li>Click <b>Deploy</b> and copy the <b className="underline">New URL</b>.</li>
                              </ol>
                          </div>
                      )}
                  </div>

                  {/* Auto-Save Toggle */}
                  <div className="p-5 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                      <div className="flex flex-col">
                          <label className="flex items-center gap-2 text-base font-black text-green-900">
                              <Save className="w-5 h-5 text-green-600" /> Auto-Save Stories
                          </label>
                          <p className="text-xs font-bold text-green-600/70 ml-7">Automatically save new books to your library.</p>
                      </div>
                      <button 
                          type="button"
                          onClick={() => setAutoSave(!autoSave)}
                          className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${autoSave ? 'bg-green-500' : 'bg-slate-300'}`}
                      >
                          <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${autoSave ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                  </div>


              </div>
            </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {storyToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 mb-2">Delete Story?</h3>
            <p className="text-slate-500 mb-6">Are you sure you want to delete this story? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStoryToDelete(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (storyToDelete) {
                    await deleteStory(storyToDelete);
                    loadLibrary();
                    setStoryToDelete(null);
                  }
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatWidget />
      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; } 
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e0e7ff; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #c7d2fe; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* MULTI-DIRECTIONAL FLOAT KEYFRAMES */
        @keyframes slow-float { 
          0% { transform: translate(0, 0) rotate(var(--rotate, 0deg)); }
          25% { transform: translate(60px, -40px) rotate(15deg); }
          50% { transform: translate(20px, 60px) rotate(-10deg); }
          75% { transform: translate(-50px, -30px) rotate(5deg); }
          100% { transform: translate(0, 0) rotate(var(--rotate, 0deg)); }
        } 
        @keyframes slow-float-alt { 
          0% { transform: translate(0, 0) rotate(var(--rotate, 0deg)); }
          25% { transform: translate(-50px, 40px) rotate(-15deg); }
          50% { transform: translate(60px, -30px) rotate(10deg); }
          75% { transform: translate(-30px, -50px) rotate(-5deg); }
          100% { transform: translate(0, 0) rotate(var(--rotate, 0deg)); }
        } 

        .animate-slow-float { animation: slow-float 18s ease-in-out infinite; animation-delay: var(--delay, 0s); }
        .animate-slow-float-alt { animation: slow-float-alt 22s ease-in-out infinite; animation-delay: var(--delay, 0s); }
        
        .perspective-1000 { perspective: 1000px; }
        .animate-slide-up-fade { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}