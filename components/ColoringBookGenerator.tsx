import React, { useState, useEffect, useRef } from 'react';
import { Palette, Loader2, Download, RefreshCw, ChevronRight, Check, Sparkles, Paintbrush, Layers, Lightbulb, Type, X, Maximize2, ImagePlus, Camera } from 'lucide-react';
import { generateColoringBookImages } from '../services/geminiService';
import { generateColoringBookPDF } from '../services/pdfService';

const AGE_GROUPS = [
    "Toddler (1-3)",
    "Preschool (3-5)",
    "School Age (5-8)",
    "Big Kids (9+)"
];

const IDEAS_BY_AGE: Record<string, string[]> = {
    "Toddler (1-3)": [
        "A happy sun smiling",
        "A big red ball",
        "A cute puppy sitting",
        "A yummy apple",
        "A little yellow duck",
        "A fluffy sheep",
        "A smiling star",
        "A toy train"
    ],
    "Preschool (3-5)": [
        "A mermaid in a castle",
        "A dinosaur playing tag",
        "A rocket ship in space",
        "A unicorn on a rainbow",
        "A fairy in the garden",
        "A pirate finding treasure",
        "A robot eating pizza",
        "A kitten birthday party"
    ],
    "School Age (5-8)": [
        "A treehouse city in the jungle",
        "Deep sea divers finding gold",
        "A dragon guarding a crystal",
        "Superheroes saving the city",
        "A magical wizard school",
        "Animals playing sports",
        "A camping trip under the stars",
        "Monster trucks crushing cars"
    ],
    "Big Kids (9+)": [
        "Intricate geometric mandala",
        "Steampunk flying machine",
        "Detailed fantasy forest landscape",
        "Japanese anime style character",
        "Cyberpunk city street",
        "Realistic wildlife portrait",
        "Abstract pattern design",
        "Mythical creatures encyclopedia"
    ]
};

const ColoringBookGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [ageGroup, setAgeGroup] = useState('Preschool (3-5)');
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [viewState, setViewState] = useState<'form' | 'preview'>('form');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      refreshIdeas();
  }, [ageGroup]);

  const refreshIdeas = () => {
      const source = IDEAS_BY_AGE[ageGroup] || IDEAS_BY_AGE["Preschool (3-5)"];
      const shuffled = [...source].sort(() => 0.5 - Math.random());
      setIdeas(shuffled.slice(0, 5));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             setCharacterImage(canvas.toDataURL('image/png'));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !title) return;
    
    setIsLoading(true);
    setGeneratedImages([]);
    
    try {
        const images = await generateColoringBookImages(topic, ageGroup, pageCount, characterImage || undefined);
        if (images.length > 0) {
            setGeneratedImages(images);
            setViewState('preview');
        } else {
            alert("Failed to generate coloring pages. Please try again.");
        }
    } catch (e) {
        console.error(e);
        alert("Something went wrong.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
      generateColoringBookPDF(title, generatedImages);
  };

  const handleReset = () => {
      setViewState('form');
      setTopic('');
      setTitle('');
      setGeneratedImages([]);
      setPageCount(1);
      setSelectedImage(null);
      setCharacterImage(null);
  };

  if (viewState === 'form') {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 md:p-4 bg-white relative overflow-hidden rounded-[2rem]">
               {/* Background Decor - Theme #892b64 */}
              <div className="absolute top-[-10%] left-[-10%] w-[25rem] h-[25rem] bg-[#892b64]/10 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[25rem] h-[25rem] bg-[#892b64]/10 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-xl w-full max-w-4xl relative flex flex-col max-h-full overflow-hidden">
                  
                  <div className="absolute top-0 left-0 w-full h-2 bg-[#892b64] z-20"></div>

                  <div className="overflow-y-auto custom-scrollbar p-6 md:p-10 w-full">
                      <form onSubmit={handleGenerate} className="flex flex-col gap-6 relative z-10 w-full mt-2">
                          
                          <div className="flex flex-col md:flex-row gap-8">
                              
                              {/* Left Column: Photo Upload */}
                              <div className="w-full md:w-[35%] flex flex-col shrink-0">
                                  <label className="block text-xs font-black text-[#892b64] uppercase tracking-widest mb-2 ml-1">Photo Hero (Optional)</label>
                                  <div 
                                      className={`flex-1 min-h-[220px] rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group relative overflow-hidden shadow-sm ${characterImage ? 'border-[#892b64] bg-white' : 'border-[#892b64]/20 hover:border-[#892b64]/50 bg-slate-50/50 hover:bg-white'}`}
                                      onClick={() => !characterImage && fileInputRef.current?.click()}
                                  >
                                      {characterImage ? (
                                          <>
                                              <img src={characterImage} alt="Character" className="w-full h-full object-cover" />
                                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur-sm border-t border-[#892b64]/10">
                                                  <div className="flex items-center gap-2 justify-center">
                                                      <span className="text-xs font-black text-[#892b64]">Photo Added</span>
                                                  </div>
                                              </div>
                                              <button 
                                                  type="button" 
                                                  onClick={(e) => { e.stopPropagation(); setCharacterImage(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                                                  className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-md backdrop-blur-sm"
                                                  title="Remove photo"
                                              >
                                                  <X className="w-4 h-4" />
                                              </button>
                                          </>
                                      ) : (
                                          <>
                                              <div className="w-16 h-16 bg-[#892b64]/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                                  <ImagePlus className="w-8 h-8 text-[#892b64]" />
                                              </div>
                                              <div className="flex flex-col items-center text-center px-4">
                                                  <span className="text-sm font-black text-slate-700 group-hover:text-[#892b64] transition-colors">Upload Photo</span>
                                                  <span className="text-[10px] font-bold text-slate-400 mt-1">We'll turn it into a coloring page!</span>
                                              </div>
                                          </>
                                      )}
                                      <input 
                                          ref={fileInputRef} 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={handleImageUpload} 
                                          disabled={isLoading}
                                      />
                                  </div>
                              </div>

                              {/* Right Column: Configuration */}
                              <div className="flex-1 flex flex-col gap-5">
                                  {/* Title Input */}
                                  <div className="group">
                                      <label className="block text-xs font-black text-[#892b64] uppercase tracking-widest mb-2 ml-1">Book Title</label>
                                      <input 
                                          type="text" 
                                          required
                                          placeholder="e.g. Leo's Coloring Adventure" 
                                          value={title}
                                          onChange={(e) => setTitle(e.target.value)}
                                          disabled={isLoading}
                                          className="w-full p-4 rounded-2xl border-2 border-[#892b64]/20 bg-white text-slate-800 placeholder-slate-300 font-bold text-lg focus:border-[#892b64] focus:shadow-[#892b64]/10 outline-none transition-all shadow-sm"
                                      />
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-4">
                                      {/* Age Group Selector */}
                                      <div className="group flex-1">
                                          <label className="block text-xs font-black text-[#892b64] uppercase tracking-widest mb-2 ml-1">Age Group</label>
                                          <div className="relative">
                                              <select 
                                                  value={ageGroup}
                                                  onChange={(e) => setAgeGroup(e.target.value)}
                                                  disabled={isLoading}
                                                  className="w-full p-4 rounded-2xl border-2 border-[#892b64]/20 bg-white text-slate-700 font-bold text-sm focus:border-[#892b64] outline-none appearance-none"
                                              >
                                                  {AGE_GROUPS.map(age => <option key={age} value={age}>{age}</option>)}
                                              </select>
                                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-[#892b64] w-4 h-4 rotate-90 pointer-events-none" />
                                          </div>
                                      </div>

                                      {/* Page Count Selector */}
                                      <div className="group flex-1">
                                          <label className="block text-xs font-black text-[#892b64] uppercase tracking-widest mb-2 ml-1">Pages</label>
                                          <div className="flex gap-1 h-[54px]">
                                              {[1, 2, 3, 4, 5].map((num) => (
                                                  <button
                                                      key={num}
                                                      type="button"
                                                      disabled={isLoading}
                                                      onClick={() => setPageCount(num)}
                                                      className={`h-full flex-1 rounded-xl font-black text-sm border-2 transition-all flex items-center justify-center ${
                                                          pageCount === num 
                                                          ? 'bg-[#892b64] border-[#892b64] text-white shadow-md transform scale-105 z-10' 
                                                          : 'bg-white border-[#892b64]/20 text-[#892b64]/60 hover:border-[#892b64] hover:text-[#892b64]'
                                                      }`}
                                                  >
                                                      {num}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Topic Input */}
                                  <div className="group">
                                      <label className="block text-xs font-black text-[#892b64] uppercase tracking-widest ml-1 mb-2">Theme</label>
                                      <div className="relative mb-3">
                                          <input 
                                              type="text" 
                                              required
                                              placeholder={`e.g. ${ideas[0] || 'Magical forest'}`}
                                              value={topic}
                                              onChange={(e) => setTopic(e.target.value)}
                                              disabled={isLoading}
                                              className="w-full p-4 rounded-2xl border-2 border-[#892b64]/20 bg-white text-slate-800 placeholder-slate-300 font-bold text-lg focus:border-[#892b64] focus:shadow-[#892b64]/10 outline-none transition-all shadow-sm focus:shadow-lg"
                                          />
                                          <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-[#892b64]/40 w-5 h-5 pointer-events-none" />
                                      </div>
                                      
                                      {/* Idea Cards */}
                                      <div className="flex items-center gap-2">
                                          <div className="flex flex-wrap gap-2 flex-1">
                                              {ideas.slice(0, 3).map((idea) => (
                                                  <button
                                                      key={idea}
                                                      type="button"
                                                      onClick={() => setTopic(idea)}
                                                      disabled={isLoading}
                                                      className="px-3 py-1.5 bg-white border border-slate-100 text-slate-500 rounded-lg text-[10px] font-bold hover:bg-[#892b64]/5 hover:text-[#892b64] hover:border-[#892b64]/30 transition-all shadow-sm truncate max-w-[150px]"
                                                  >
                                                      {idea}
                                                  </button>
                                              ))}
                                          </div>
                                          <button 
                                              type="button" 
                                              onClick={refreshIdeas} 
                                              className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
                                              title="Shuffle Ideas"
                                          >
                                              <RefreshCw className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <button 
                              type="submit" 
                              disabled={isLoading || !topic || !title}
                              className="mt-4 w-full py-4 md:py-5 bg-[#892b64] text-white rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-[#892b64]/20 hover:shadow-2xl hover:shadow-[#892b64]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white/20 shrink-0"
                          >
                              {isLoading ? <><Loader2 className="w-6 h-6 animate-spin" /> Sketching...</> : <><Palette className="w-6 h-6" /> Create Book</>}
                          </button>
                          {/* Add extra padding at bottom for safe area / scrolling comfort */}
                          <div className="h-4 md:h-0"></div>
                      </form>
                  </div>
              </div>
          </div>
      );
  }

  return (
      <div className="w-full h-full flex flex-col p-4 animate-fade-in overflow-hidden bg-white rounded-[2rem] relative">
          
          {/* Lightbox / Modal for Full Image */}
          {selectedImage && (
              <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-fade-in" onClick={() => setSelectedImage(null)}>
                  <button 
                    onClick={() => setSelectedImage(null)} 
                    className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[1001]"
                  >
                      <X className="w-8 h-8" />
                  </button>
                  <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                    <img 
                        src={selectedImage} 
                        alt="Coloring Page Full Size" 
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl bg-white" 
                    />
                  </div>
              </div>
          )}

          <div className="absolute inset-0 pointer-events-none opacity-30">
              {/* Radial gradient with theme color #892b64 (approx 137,43,100) */}
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(137,43,100,0.1),transparent_70%)]"></div>
          </div>

          <div className="flex items-center justify-between mb-6 shrink-0 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-100 z-10">
              <div className="flex items-center gap-4">
                  <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors border border-slate-200"><ChevronRight className="w-6 h-6 rotate-180" /></button>
                  <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
                      <p className="text-xs font-bold text-[#892b64] uppercase tracking-widest">{generatedImages.length} Pages • {topic}</p>
                  </div>
              </div>
              <div className="flex gap-3">
                  <button onClick={handleReset} className="hidden md:flex p-3 bg-white text-slate-500 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-700 transition-colors items-center gap-2 text-sm border border-slate-100 shadow-sm">
                      <RefreshCw className="w-4 h-4" /> New
                  </button>
                  <button onClick={handleDownload} className="py-3 px-6 bg-[#892b64] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[#892b64]/30 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 border border-white/20">
                      <Download className="w-5 h-5" /> Download PDF
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 z-10">
              {/* Reduced max-width and increased grid columns for thumbnail look */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                  {generatedImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedImage(img)}
                        className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 group hover:border-[#892b64]/30 transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer relative"
                      >
                          <div className="aspect-[3/4] bg-slate-50 rounded-xl overflow-hidden mb-2 relative shadow-inner border border-slate-100">
                              <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-contain mix-blend-multiply" />
                              
                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full p-2 shadow-sm transform scale-50 group-hover:scale-100 transition-all">
                                      <Maximize2 className="w-4 h-4 text-slate-700" />
                                  </div>
                              </div>

                              <div className="absolute top-2 left-2 w-6 h-6 bg-white text-[#892b64] rounded-full flex items-center justify-center shadow-sm font-black text-[10px] border border-[#892b64]/20">
                                  {idx + 1}
                              </div>
                          </div>
                          <div className="flex justify-between items-center px-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Page {idx + 1}</span>
                              <div className="h-1.5 w-1.5 rounded-full bg-[#892b64]"></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );
};

export default ColoringBookGenerator;