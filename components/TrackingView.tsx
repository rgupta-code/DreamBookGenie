import React, { useState, useEffect } from 'react';
import { TrendingUp, BookOpen, Star, Zap, Award, Sparkles, Wand2, Loader2, Info, CheckCircle2, ChevronRight, LayoutGrid, Calendar, History, Trophy, Rocket, FlaskConical, Anchor, Map, Trees } from 'lucide-react';
// Removed unused imports for data fetching to rely on mock data
// import { getAllStories, getAllProgress } from '../services/storageService';
// import { generateRecommendations } from '../services/geminiService';
import { Story, ProgressEntry } from '../types';

interface TrackingViewProps {
  onSelectTopic: (topic: string) => void;
}

const BADGES = [
  { id: 'first_story', label: 'First Story', icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50', description: 'Read your first magic book!' },
  { id: 'daily_reader', label: 'Daily Reader', icon: Star, color: 'text-sky-500', bg: 'bg-sky-50', description: 'Read a story 3 days in a row!' },
  { id: 'phonics_hero', label: 'Phonics Hero', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50', description: 'Mastered 50 difficult words!' },
  { id: 'explorer', label: 'Magic Explorer', icon: BookOpen, color: 'text-green-500', bg: 'bg-green-50', description: 'Explored 5 different art styles!' },
];

const SKILLS = [
  { name: 'Phonics', level: 4.2, color: 'from-pink-400 to-rose-500' },
  { name: 'Vocabulary', level: 3.8, color: 'from-indigo-400 to-violet-500' },
  { name: 'Fluency', level: 4.5, color: 'from-sky-400 to-blue-500' },
  { name: 'Curiosity', level: 4.9, color: 'from-amber-400 to-orange-500' },
];

const MOCK_TIMELINE_ENTRIES = [
    { date: 'June 12, 2024', title: 'The Brave Space Dog', type: 'Adventure', icon: Rocket, progress: '100%', accuracy: '98%', suggestion: 'A Mystery on the Moon' },
    { date: 'June 08, 2024', title: 'Deep Sea Wonders', type: 'Science', icon: Anchor, progress: '100%', accuracy: '94%', suggestion: 'The Talking Octopus' },
    { date: 'June 03, 2024', title: 'The Friendly Dragon', type: 'Fantasy', icon: Sparkles, progress: '80%', accuracy: '90%', suggestion: 'Baking with Fire' },
    { date: 'May 28, 2024', title: 'How Planes Fly', type: 'Learning', icon: FlaskConical, accuracy: '88%', progress: '100%', suggestion: 'The First Rocket Trip' },
    { date: 'May 22, 2024', title: 'Forest Friends Picnic', type: 'Nature', icon: Trees, progress: '100%', accuracy: '96%', suggestion: 'The Squirrel\'s Secret Map' },
    { date: 'May 15, 2024', title: 'The Robot\'s Garden', type: 'Adventure', icon: Zap, progress: '100%', accuracy: '92%', suggestion: 'A Robot in the Rain' },
    { date: 'May 10, 2024', title: 'Giant Dinosaur Quest', type: 'History', icon: Map, progress: '90%', accuracy: '85%', suggestion: 'Walking with Rexy' },
    { date: 'May 04, 2024', title: 'The Rainbow Whale', type: 'Fantasy', icon: Sparkles, progress: '100%', accuracy: '99%', suggestion: 'The Sky-High Fish' },
    { date: 'April 28, 2024', title: 'Why is the Sky Blue?', type: 'Science', icon: FlaskConical, progress: '100%', accuracy: '91%', suggestion: 'Why is the Grass Green?' },
    { date: 'April 22, 2024', title: 'My First Story', type: 'Adventure', icon: Award, progress: '100%', accuracy: '100%', suggestion: 'The Hero\'s Next Step' },
];

const TrackingView: React.FC<TrackingViewProps> = ({ onSelectTopic }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    // Disabled real data fetching for performance, using mock data instead.
    const loadMockData = () => {
        setIsDataLoading(false);
        setRecommendations(["The Star that Fell into a Cup", "A Squirrel's Rocket Adventure", "The Robot Who Learned to Dance"]);
    };
    
    loadMockData();
  }, []);

  const displayStoryCount = Math.max(stories.length, 12);
  const totalWords = Math.max(stories.reduce((acc, s) => acc + s.pages.reduce((pAcc, p) => pAcc + p.text.split(' ').length, 0), 0), 2450);
  const streak = Math.max(progress.length > 0 ? Math.min(progress.length, 7) : 0, 5);

  if (isDataLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in h-full">
        <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
        <p className="font-black text-indigo-900 text-xl">Opening your Reading Journal...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 animate-fade-in">
      <div className="max-w-[1500px] mx-auto flex flex-col gap-8 pb-32">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border-b-8 border-indigo-100 flex flex-col items-center text-center transform hover:scale-[1.02] transition-all">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-indigo-600" />
            </div>
            <span className="text-5xl font-black text-indigo-900">{displayStoryCount}</span>
            <span className="text-indigo-400 font-black uppercase tracking-widest text-sm mt-2">Books Read</span>
            </div>
            
            <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border-b-8 border-sky-100 flex flex-col items-center text-center transform hover:scale-[1.02] transition-all">
            <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-sky-600" />
            </div>
            <span className="text-5xl font-black text-sky-900">{totalWords}</span>
            <span className="text-sky-400 font-black uppercase tracking-widest text-sm mt-2">Words Mastered</span>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border-b-8 border-amber-100 flex flex-col items-center text-center transform hover:scale-[1.02] transition-all">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-amber-600" />
            </div>
            <span className="text-5xl font-black text-amber-900">{streak}</span>
            <span className="text-amber-400 font-black uppercase tracking-widest text-sm mt-2">Day Streak</span>
            </div>
        </div>

        {/* Middle Section: Skill Garden & Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Growth Garden */}
            <div className="bg-white/80 backdrop-blur-md rounded-[3rem] p-8 shadow-xl border-4 border-indigo-50 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" /> Growth Garden
                </h3>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active</span>
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-6 px-2">
                {SKILLS.map((skill, idx) => (
                <div key={skill.name} className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                    <span className="font-black text-indigo-700 text-sm uppercase tracking-widest">{skill.name}</span>
                    <span className="text-xs font-bold text-indigo-300">{Math.floor((skill.level / 5) * 100)}%</span>
                    </div>
                    <div className="h-7 bg-slate-100 rounded-full p-1.5 overflow-hidden shadow-inner border border-slate-50 relative">
                    <div 
                        className={`h-full rounded-full bg-gradient-to-r ${skill.color} transition-all duration-1000 ease-out relative`}
                        style={{ width: `${(skill.level / 5) * 100}%`, animationDelay: `${idx * 150}ms` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_3s_infinite]"></div>
                    </div>
                    </div>
                </div>
                ))}
            </div>
            </div>

            {/* Badge Collection */}
            <div className="bg-white/80 backdrop-blur-md rounded-[3rem] p-8 shadow-xl border-4 border-purple-50 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3">
                <Award className="w-6 h-6 text-purple-500" /> Badges
                </h3>
                <span className="text-xs font-black bg-purple-100 text-purple-600 px-3 py-1 rounded-full uppercase tracking-widest">3 / 4</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {BADGES.map((badge) => {
                const isEarned = badge.id !== 'phonics_hero' || stories.length > 20; 
                return (
                    <div 
                    key={badge.id}
                    className={`p-4 rounded-3xl border-2 flex flex-col items-center text-center gap-2 transition-all ${
                        isEarned ? `${badge.bg} border-indigo-100 shadow-md transform hover:scale-105` : 'bg-slate-50 border-slate-100 grayscale opacity-40'
                    }`}
                    >
                    <div className="p-3 rounded-2xl bg-white shadow-sm"><badge.icon className={`w-8 h-8 ${badge.color}`} /></div>
                    <h4 className="font-black text-indigo-900 text-xs leading-tight">{badge.label}</h4>
                    {isEarned && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 absolute top-2 right-2" />}
                    </div>
                );
                })}
            </div>
            </div>
        </div>

        {/* Adventure Timeline */}
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-4">
                <h3 className="text-3xl font-black text-indigo-900 flex items-center gap-3">
                    <History className="w-8 h-8 text-indigo-600" /> Adventure History
                </h3>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-[3.5rem] p-10 shadow-xl border-4 border-indigo-50">
                <div className="relative pl-8 pb-4 border-l-4 border-dashed border-indigo-100 ml-2 space-y-10">
                    {MOCK_TIMELINE_ENTRIES.map((entry, idx) => (
                        <div key={idx} className="relative animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="absolute -left-[30px] top-1 w-12 h-12 bg-white rounded-full border-4 border-indigo-100 flex items-center justify-center shadow-md z-10"><entry.icon className="w-6 h-6 text-indigo-500" /></div>
                            <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border-2 border-indigo-50 transform hover:scale-[1.01] transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{entry.date}</span>
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full uppercase">{entry.type}</span>
                                        </div>
                                        <h4 className="text-xl md:text-2xl font-black text-indigo-900">{entry.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Accuracy</span>
                                            <span className="text-2xl font-black text-sky-500">{entry.accuracy}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* AI Recommendations */}
        <div className="mt-4">
            <h3 className="text-3xl font-black text-indigo-900 flex items-center gap-3 px-4 mb-6">
                <Wand2 className="w-8 h-8 text-indigo-600 animate-pulse" /> Next Adventures
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
                {recommendations.map((rec, idx) => (
                    <button 
                        key={idx}
                        onClick={() => onSelectTopic(rec)}
                        className="group bg-white hover:bg-indigo-600 rounded-[2.5rem] p-8 shadow-lg border-2 border-indigo-50 transition-all text-left flex flex-col gap-4 transform hover:-translate-y-2 hover:shadow-2xl h-full"
                    >
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <Sparkles className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                        </div>
                        <p className="font-black text-2xl text-indigo-900 group-hover:text-white leading-snug line-clamp-2">{rec}</p>
                        <div className="mt-auto flex items-center gap-2 text-indigo-400 group-hover:text-white/80 font-black text-xs uppercase tracking-widest pt-4">Start Quest <ChevronRight className="w-4 h-4" /></div>
                    </button>
                ))}
            </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default TrackingView;