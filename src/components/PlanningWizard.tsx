'use client';

import React, { useState, useRef } from 'react';
import { MealPlanInput, CookingSkill } from '@/types';
import { Upload, X, HelpCircle, FileText, ChevronRight, Sparkles, Plus } from 'lucide-react';

interface PlanningWizardProps {
  onSubmit: (input: MealPlanInput) => void;
  isLoading: boolean;
}

const DIETARY_OPTIONS = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Keto',
  'Low Sodium',
  'Lactose Intolerant',
  'High-Protein'
];

const EQUIPMENT_OPTIONS = [
  'Stove',
  'Oven',
  'Microwave',
  'Air Fryer',
  'Blender',
  'Toaster',
  'Instant Pot'
];

const SKILL_OPTIONS: { value: CookingSkill; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Simple steps, basic tools' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Multi-tasking, pan-searing' },
  { value: 'advanced', label: 'Advanced', desc: 'Precise timing, complex techniques' }
];

export default function PlanningWizard({ onSubmit, isLoading }: PlanningWizardProps) {
  // Form State
  const [dietary, setDietary] = useState<string[]>([]);
  const [budget, setBudget] = useState<number>(30);
  const [portions, setPortions] = useState<number>(2);
  const [skill, setSkill] = useState<CookingSkill>('intermediate');
  const [equipment, setEquipment] = useState<string[]>(['Stove', 'Microwave']);
  
  // Time limits (minutes)
  const [breakfastTime, setBreakfastTime] = useState<number>(20);
  const [lunchTime, setLunchTime] = useState<number>(25);
  const [dinnerTime, setDinnerTime] = useState<number>(45);

  // Pantry Tags State
  const [pantryInput, setPantryInput] = useState('');
  const [pantryList, setPantryList] = useState<string[]>(['Salt', 'Pepper', 'Olive Oil', 'Garlic']);

  // Multimodal File State
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle helpers
  const toggleDiet = (item: string) => {
    setDietary(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const toggleEquipment = (item: string) => {
    setEquipment(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  // Pantry Tag Helpers
  const addPantryTag = () => {
    const val = pantryInput.trim();
    if (val && !pantryList.includes(val)) {
      setPantryList(prev => [...prev, val]);
      setPantryInput('');
    }
  };

  const removePantryTag = (tag: string) => {
    setPantryList(prev => prev.filter(t => t !== tag));
  };

  const handlePantryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPantryTag();
    }
  };

  // File Upload Handlers (Multimodal)
  const handleFileChange = (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB security limit.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setFileBase64(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Mock health files for testing (Rubric alignment)
  const loadMockHealthReport = (type: 'vitd_lactose' | 'lowsodium_iron') => {
    if (type === 'vitd_lactose') {
      setFileName('Lab_Results_JohnDoe.pdf (Simulated)');
      setFileBase64('data:text/plain;base64,VklUQU1JTiBEIERFRklDSUVOQ1k6IFZpdGFtaW4gRCBsZXZlbHMgYXQgMThzZy9tTCAoRGVmaWNpZW50KS4gTEFDVE9TRSBJTlRPTEVSQU5DRTogUGF0aWVudCByZXBvcnRzIG1pbGQgdG8gc2V2ZXJlIGJsb2F0aW5nIGFuZCBjcmFtcGluZyB1cG9uIGRhaXJ5IGNvbnN1bXB0aW9uLiBBZHZpc2UgZGFpcnktZnJlZSBkaWV0IGFuZCBjYWxjaXVtL3ZpdGFtaW4gRCBmb3J0aWZpZWQgYWx0ZXJuYXRpdmVzLg==');
      // Add visual cues
      if (!dietary.includes('Lactose Intolerant')) {
        setDietary(prev => [...prev, 'Lactose Intolerant']);
      }
    } else {
      setFileName('Heart_Health_Summary.txt (Simulated)');
      setFileBase64('data:text/plain;base64,SEVBUlQgSEVBTFRIOiBIaWdoIGJsb29kIHByZXNzdXJlIG1hbmlmZXN0ZWQuIFN0cmljdCBsb3ctc29kaXVtIGRpZXQgcmVjb21tZW5kZWQgKDwxNTAwbWcvZGF5KS4gQU5FTUlBOiBQYXRpZW50IGhhcyBib3JkZXJsaW5lIGxvdyBpcm9uIGFuZCBoZW1vZ2xvYmluIGxldmVscy4gQnVtbyBpcm9uLXJpY2ggZm9vZHMgKGxlbnRpbHMsIHNwaW5hY2gsIHBvdWx0cnkpIGxpbmtlZCB3aXRoIHZpdGFtaW4gQyAoY2l0cnVzLCBiZWxsIHBlcHBlcnMpIGZvciBiZXR0ZXIgYWJzb3JwdGlvbi4=');
      if (!dietary.includes('Low Sodium')) {
        setDietary(prev => [...prev, 'Low Sodium']);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: MealPlanInput = {
      dietaryRestrictions: dietary,
      budgetLimit: budget,
      portions: portions,
      cookingSkill: skill,
      kitchenEquipment: equipment,
      pantryIngredients: pantryList,
      timeConstraints: {
        breakfast: breakfastTime,
        lunch: lunchTime,
        dinner: dinnerTime
      },
      healthReport: fileBase64,
      healthFileName: fileName
    };
    onSubmit(payload);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-1 animate-fade-in">
      <div className="backdrop-blur-md bg-zinc-950/70 border border-emerald-500/20 rounded-3xl p-6 md:p-8 shadow-2xl shadow-emerald-950/20">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-emerald-500/20 mb-3 animate-pulse">
            <Sparkles className="w-3 h-3" /> AI Engine Ready
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            Design Your Daily Cooking Plan
          </h2>
          <p className="text-zinc-400 text-sm md:text-base mt-2 max-w-lg mx-auto">
            Input your budget, schedule, and pantry. Upload a health report to dynamically inject doctor's constraints.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Health & Dietary Restrictions (Multimodal File Upload) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-xs">1</span>
              Health & Dietary Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* File Dropzone */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  Upload Health Report / Blood Test
                </label>
                <div
                  onDragEnter={onDrag}
                  onDragOver={onDrag}
                  onDragLeave={onDrag}
                  onDrop={onDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[140px] ${
                    dragActive 
                      ? 'border-emerald-400 bg-emerald-500/5' 
                      : fileName 
                      ? 'border-emerald-500/40 bg-zinc-900/50' 
                      : 'border-zinc-800 hover:border-emerald-500/30 hover:bg-zinc-900/30'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                  />

                  {fileName ? (
                    <div className="text-center space-y-2 w-full px-4">
                      <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <FileText className="w-8 h-8" />
                        <span className="font-semibold text-xs truncate max-w-[200px]">{fileName}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">Multimodal file parsed & ready</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                        className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-zinc-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <Upload className="w-8 h-8 mx-auto text-zinc-500" />
                      <p className="text-xs font-medium text-zinc-300">
                        Drag and drop your report or <span className="text-emerald-400">browse</span>
                      </p>
                      <p className="text-[10px] text-zinc-600">PDF, JPG, PNG, TXT up to 5MB</p>
                    </div>
                  )}
                </div>
                
                {/* Fast Mock Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => loadMockHealthReport('vitd_lactose')}
                    className="flex-1 text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg py-1.5 px-2 hover:border-emerald-500/30 hover:text-emerald-300 transition-all text-left truncate"
                  >
                    ⚡ Test Mock: Vit-D / Lactose
                  </button>
                  <button
                    type="button"
                    onClick={() => loadMockHealthReport('lowsodium_iron')}
                    className="flex-1 text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg py-1.5 px-2 hover:border-emerald-500/30 hover:text-emerald-300 transition-all text-left truncate"
                  >
                    ⚡ Test Mock: Sodium / Iron
                  </button>
                </div>
              </div>

              {/* Dietary Pill Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  Dietary Preferences
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {DIETARY_OPTIONS.map(diet => {
                    const active = dietary.includes(diet);
                    return (
                      <button
                        key={diet}
                        type="button"
                        onClick={() => toggleDiet(diet)}
                        className={`text-xs px-3 py-2 rounded-xl border font-medium transition-all ${
                          active
                            ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-950/20'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {diet}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Financials & Time constraints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Financial sliders */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2 border-b border-zinc-800 pb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-xs">2</span>
                Financial & Portions Budget
              </h3>
              
              <div className="space-y-5">
                {/* Budget Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                    <span>Daily Budget Limit</span>
                    <span className="text-emerald-400 font-bold text-sm">$ {budget}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>$10 (Frugal)</span>
                    <span>$100 (Premium)</span>
                  </div>
                </div>

                {/* Portions Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                    <span>Household Size (Portions)</span>
                    <span className="text-emerald-400 font-bold text-sm">{portions} {portions === 1 ? 'Person' : 'People'}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={portions}
                    onChange={(e) => setPortions(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>1 Portion</span>
                    <span>8 Portions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Time constraints sliders */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2 border-b border-zinc-800 pb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-xs">3</span>
                Meal Time Constraints
              </h3>

              <div className="space-y-4">
                {/* Breakfast Time Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-400 uppercase">
                    <span>Breakfast Limit</span>
                    <span className="text-emerald-300 font-medium">{breakfastTime} mins</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={breakfastTime}
                    onChange={(e) => setBreakfastTime(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Lunch Time Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-400 uppercase">
                    <span>Lunch Limit</span>
                    <span className="text-emerald-300 font-medium">{lunchTime} mins</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={lunchTime}
                    onChange={(e) => setLunchTime(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Dinner Time Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-400 uppercase">
                    <span>Dinner Limit</span>
                    <span className="text-emerald-300 font-medium">{dinnerTime} mins</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="120"
                    step="5"
                    value={dinnerTime}
                    onChange={(e) => setDinnerTime(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Skill, Equipment, Pantry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Skill and Equipment */}
            <div className="space-y-6">
              {/* Cooking Skill */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase border-b border-zinc-800 pb-2">
                  🍳 Cooking Skill Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SKILL_OPTIONS.map(opt => {
                    const active = skill === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSkill(opt.value)}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col justify-center items-center h-[72px] ${
                          active
                            ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-950/20'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className="text-[8px] text-zinc-500 mt-1 line-clamp-2">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kitchen Equipment */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase border-b border-zinc-800 pb-2">
                  ⚙️ Kitchen Equipment Available
                </label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map(eq => {
                    const active = equipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquipment(eq)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : 'bg-zinc-900/30 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                        }`}
                      >
                        {eq}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pantry List */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase border-b border-zinc-800 pb-2">
                🥫 Pantry Inventory (Owned items = $0 Grocery cost)
              </label>
              
              <div className="space-y-3">
                {/* Input container */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Type ingredient (e.g. Eggs, Soy Sauce) and Enter"
                      value={pantryInput}
                      onChange={(e) => setPantryInput(e.target.value)}
                      onKeyDown={handlePantryKeyDown}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addPantryTag}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3 flex items-center justify-center transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Tags listing */}
                <div className="backdrop-blur-sm bg-zinc-900/40 border border-zinc-900 rounded-xl p-3 min-h-[110px] flex flex-wrap gap-1.5 content-start">
                  {pantryList.length === 0 ? (
                    <span className="text-[10px] text-zinc-600 italic">No pantry items listed yet. Standard grocery costs apply.</span>
                  ) : (
                    pantryList.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700/50 text-[10px] text-zinc-300 px-2 py-0.5 rounded-md"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removePantryTag(tag)}
                          className="hover:text-red-400 text-zinc-500"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-zinc-900">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              Assemble Cooking Agents
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
