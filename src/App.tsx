import React, { useState, useEffect, useCallback } from 'react';
import { 
  auth, db, 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  addDoc
} from 'firebase/firestore';
import { 
  UserProfile, 
  Template, 
  Poster 
} from './types';
import { 
  Layout, 
  LayoutDashboard, 
  User as UserIcon, 
  Plus, 
  Download, 
  Share2, 
  LogOut, 
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TemplateCard } from './components/TemplateCard';
import { ProfileForm } from './components/ProfileForm';
import { PosterCanvas } from './components/PosterCanvas';
import { removeBackground, generateCustomTemplate } from './services/gemini';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [processedPhoto, setProcessedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'templates' | 'profile' | 'editor' | 'ai-gen'>('templates');
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check for API Key
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback for environments where aistudio is not defined
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            name: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            role: 'user'
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Templates Listener
  useEffect(() => {
    const q = query(collection(db, 'templates'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template));
      setTemplates(docs);
      
      if (user) {
        seedTemplates(docs);
      }
    });
    return unsubscribe;
  }, [user]);

  const seedTemplates = async (currentTemplates: Template[]) => {
    const initialTemplates: Omit<Template, 'id'>[] = [
      {
        title: 'Diwali Celebration',
        category: 'Festivals',
        imageURL: 'https://res.cloudinary.com/dnwty33c3/image/upload/v1773952992/Diwali_Template_wsigyy.png',
        placeholders: [
          { type: 'image', x: 700, y: 900, width: 300, height: 400, label: 'Your Photo', key: 'userPhoto' },
          { type: 'text', x: 50, y: 1100, width: 600, height: 50, fontSize: 48, color: '#FFFFFF', label: 'Your Name', key: 'name' },
          { type: 'text', x: 50, y: 1160, width: 600, height: 30, fontSize: 24, color: '#FFD700', label: 'Designation', key: 'designation' }
        ]
      },
      {
        title: 'Political Campaign',
        category: 'Political',
        imageURL: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=1080&h=1350',
        placeholders: [
          { type: 'image', x: 50, y: 800, width: 400, height: 500, label: 'Your Photo', key: 'userPhoto' },
          { type: 'text', x: 500, y: 1100, width: 500, height: 60, fontSize: 52, color: '#FF6321', label: 'Your Name', key: 'name' },
          { type: 'text', x: 500, y: 1170, width: 500, height: 30, fontSize: 28, color: '#000000', label: 'Designation', key: 'designation' }
        ]
      },
      {
        title: 'Independence Day',
        category: 'National',
        imageURL: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=1080&h=1350',
        placeholders: [
          { type: 'image', x: 750, y: 950, width: 250, height: 350, label: 'Your Photo', key: 'userPhoto' },
          { type: 'text', x: 50, y: 1200, width: 600, height: 40, fontSize: 36, color: '#06038D', label: 'Your Name', key: 'name' }
        ]
      }
    ];

    for (const t of initialTemplates) {
      const existing = currentTemplates.find(temp => temp.title === t.title);
      if (existing) {
        if (existing.imageURL !== t.imageURL) {
          await setDoc(doc(db, 'templates', existing.id), t);
        }
      } else {
        await addDoc(collection(db, 'templates'), t);
      }
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => auth.signOut();

  const handleSaveProfile = async (newProfile: UserProfile) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), newProfile);
    setProfile(newProfile);
    setActiveTab('templates');
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setActiveTab('editor');
  };

  const handleGenerateTemplate = async () => {
    if (!customPrompt.trim()) return;

    // Check if key is selected before proceeding
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
        // We proceed after opening the key selector as per guidelines
      }
    }

    setIsGeneratingTemplate(true);
    try {
      const newTemplate = await generateCustomTemplate(customPrompt);
      const docRef = await addDoc(collection(db, 'templates'), newTemplate);
      const templateWithId = { ...newTemplate, id: docRef.id } as Template;
      setSelectedTemplate(templateWithId);
      setActiveTab('editor');
      setCustomPrompt('');
    } catch (error: any) {
      console.error('Template generation failed:', error);
      if (error?.message?.includes('403') || error?.message?.includes('PERMISSION_DENIED')) {
        setHasApiKey(false);
        alert('API Key permission denied. Please select a valid paid API key to use the AI Template Generator.');
      }
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const handleProcessPhoto = async () => {
    if (!profile?.photoURL) return;
    setIsProcessing(true);
    try {
      const processed = await removeBackground(profile.photoURL);
      setProcessedPhoto(processed);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPoster = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `poster-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md"
        >
          <div className="w-24 h-24 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">Greetings</h1>
            <p className="text-white/60">Create professional posters in under 30 seconds with AI.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-white text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-bottom border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Greetings</span>
        </div>
        <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <LogOut size={20} className="text-white/60" />
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Choose a Template</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('ai-gen')}
                    className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all"
                  >
                    <Wand2 size={14} /> AI Generate
                  </button>
                  {['All', 'Festivals', 'Political', 'National'].map(cat => (
                    <button key={cat} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 transition-colors">
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {templates.map(template => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    isSelected={selectedTemplate?.id === template.id}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'ai-gen' && (
            <motion.div
              key="ai-gen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-xl mx-auto space-y-8 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold">AI Template Generator</h2>
                <p className="text-white/60">Describe the theme, colors, and occasion. Our AI will build a custom template for you.</p>
                {!hasApiKey && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-sm">
                    <p className="mb-2">A paid Gemini API key is required for high-quality image generation.</p>
                    <button 
                      onClick={async () => {
                        await window.aistudio.openSelectKey();
                        setHasApiKey(true);
                      }}
                      className="underline font-bold"
                    >
                      Select API Key
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. A vibrant orange and yellow Holi festival poster with traditional patterns and space for a photo on the left..."
                  className="w-full h-32 bg-white/10 border border-white/20 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none"
                />
                <button
                  onClick={handleGenerateTemplate}
                  disabled={isGeneratingTemplate || !customPrompt.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  {isGeneratingTemplate ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Designing your template...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate Template
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('templates')}
                  className="w-full text-white/40 text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'editor' && selectedTemplate && profile && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setActiveTab('templates')}
                  className="text-white/60 hover:text-white flex items-center gap-2 text-sm"
                >
                  ← Back to Templates
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={handleProcessPhoto}
                    disabled={isProcessing || !profile.photoURL}
                    className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    AI Background Removal
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <PosterCanvas 
                    template={selectedTemplate} 
                    userProfile={profile} 
                    userPhoto={processedPhoto || profile.photoURL}
                  />
                </div>

                <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10 h-fit">
                  <h3 className="text-xl font-semibold">Customize Poster</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-sm text-white/60 mb-2">Current Profile Data</p>
                      <p className="font-medium">{profile.name}</p>
                      <p className="text-xs text-white/40">{profile.designation || 'No designation set'}</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="w-full py-3 rounded-xl border border-white/20 text-sm font-medium hover:bg-white/5 transition-all"
                    >
                      Edit Profile Details
                    </button>
                  </div>

                  <div className="pt-6 border-t border-white/10 space-y-3">
                    <button 
                      onClick={downloadPoster}
                      className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-all"
                    >
                      <Download size={20} /> Download Poster
                    </button>
                    <button className="w-full py-4 rounded-xl border border-white/20 font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
                      <Share2 size={20} /> Share to WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#151515]/90 backdrop-blur-2xl border border-white/10 rounded-2xl px-2 py-2 flex gap-1 shadow-2xl z-50">
        <button 
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${activeTab === 'templates' ? 'bg-emerald-500 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-sm font-medium">Templates</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-emerald-500 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          <UserIcon size={20} />
          <span className="text-sm font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
}
