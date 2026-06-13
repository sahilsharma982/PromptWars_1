'use client';

import React, { useState, useMemo } from 'react';
import { MealPlanResponse, GroceryItem, CookingTask } from '@/types';
import { 
  CheckSquare, Square, ShoppingBag, TrendingDown, Clock, 
  ChefHat, AlertTriangle, Lightbulb, RefreshCw, ChevronDown, 
  ChevronUp, Heart, ShieldAlert, BadgeInfo
} from 'lucide-react';

interface RecipeDashboardProps {
  plan: MealPlanResponse;
  isMock: boolean;
  onReset: () => void;
  portions: number;
}

export default function RecipeDashboard({ plan, isMock, onReset, portions }: RecipeDashboardProps) {
  // Local states to handle interactive checklists
  const [groceryList, setGroceryList] = useState<GroceryItem[]>(() => 
    plan.groceryList.map(item => ({ ...item, isCompleted: item.isPantryItem }))
  );

  const [breakfastTasks, setBreakfastTasks] = useState<CookingTask[]>(plan.breakfast.tasks);
  const [lunchTasks, setLunchTasks] = useState<CookingTask[]>(plan.lunch.tasks);
  const [dinnerTasks, setDinnerTasks] = useState<CookingTask[]>(plan.dinner.tasks);

  // Accordion and Tips states
  const [showTips, setShowTips] = useState(false);
  const [swappedItems, setSwappedItems] = useState<Record<string, boolean>>({});

  // Recalculate total grocery cost dynamically
  const totalCost = useMemo(() => {
    return groceryList.reduce((sum, item) => {
      // Pantry items have zero cost
      if (item.isPantryItem) return sum;
      return sum + item.estimatedCost;
    }, 0);
  }, [groceryList]);

  // Budget comparison
  const budgetLimit = plan.budgetAnalysis.budgetLimit;
  const budgetPercentage = Math.min(Math.round((totalCost / budgetLimit) * 100), 200);

  // Status mapping
  const budgetStatus = useMemo(() => {
    if (totalCost > budgetLimit) return 'over';
    if (totalCost >= budgetLimit * 0.85) return 'borderline';
    return 'under';
  }, [totalCost, budgetLimit]);

  const progressColor = {
    under: 'stroke-emerald-400',
    borderline: 'stroke-amber-400',
    over: 'stroke-rose-500'
  }[budgetStatus];

  const bgStatusColor = {
    under: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    borderline: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    over: 'bg-rose-500/10 border-rose-500/20 text-rose-400'
  }[budgetStatus];

  // Handlers for lists
  const toggleGrocery = (id: string) => {
    setGroceryList(prev => prev.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const toggleTask = (meal: 'breakfast' | 'lunch' | 'dinner', id: string) => {
    const updater = (prev: CookingTask[]) => prev.map(t => 
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    );

    if (meal === 'breakfast') setBreakfastTasks(updater);
    if (meal === 'lunch') setLunchTasks(updater);
    if (meal === 'dinner') setDinnerTasks(updater);
  };

  // Substitution handler (Real-time update)
  const handleSwapItem = (itemId: string) => {
    setGroceryList(prev => prev.map(item => {
      if (item.id !== itemId || !item.swapOptions) return item;

      const isCurrentlySwapped = swappedItems[itemId] || false;
      const nextSwappedState = !isCurrentlySwapped;
      
      // Update swapped tracker
      setSwappedItems(s => ({ ...s, [itemId]: nextSwappedState }));

      if (nextSwappedState) {
        // Apply swap
        return {
          ...item,
          originalName: item.originalName || item.name,
          originalCost: item.originalCost !== undefined ? item.originalCost : item.estimatedCost,
          name: `${item.swapOptions.name} (Swapped)`,
          estimatedCost: item.swapOptions.estimatedCost
        };
      } else {
        // Revert swap
        return {
          ...item,
          name: item.originalName || item.name,
          estimatedCost: item.originalCost !== undefined ? item.originalCost : item.estimatedCost
        };
      }
    }));
  };

  // Task count helpers
  const getProgress = (tasks: CookingTask[]) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.isCompleted).length;
    return Math.round((completed / tasks.length) * 100);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-1 space-y-8 animate-fade-in">
      
      {/* Overview Header Card */}
      <div className="backdrop-blur-md bg-zinc-950/70 border border-emerald-500/20 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              Your Daily Cooking Dashboard
            </h2>
            {isMock && (
              <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase">
                Offline Simulation
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-xs">
            Personalized meal timeline and shopping checklist for <span className="text-emerald-400 font-semibold">{portions} portion(s)</span>.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Replan Day
          </button>
        </div>
      </div>

      {/* Health Rules Panel */}
      {plan.healthRules && plan.healthRules.length > 0 && (
        <div className="backdrop-blur-md bg-emerald-950/5 border border-emerald-500/10 rounded-2xl p-4 flex items-start gap-3 shadow-lg shadow-rose-950/5">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl mt-0.5">
            <Heart className="w-4 h-4 fill-rose-500/20" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold tracking-wider text-rose-400 uppercase">
              Active Health & Dietary Regulations
            </h4>
            <div className="flex flex-wrap gap-2 pt-1.5">
              {plan.healthRules.map((rule, idx) => (
                <span 
                  key={idx} 
                  className={`text-[10px] px-2.5 py-1 rounded-md border font-medium ${
                    rule.startsWith('Extracted') 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 flex items-center gap-1.5' 
                      : 'bg-rose-500/5 border-rose-500/15 text-rose-300'
                  }`}
                >
                  {rule.startsWith('Extracted') && <BadgeInfo className="w-3.5 h-3.5 text-zinc-500" />}
                  {rule}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid (Left: Timeline / Right: Financials + Groceries) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: The chronological prep and cook checklist (2 cols width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="backdrop-blur-md bg-zinc-950/50 border border-zinc-950 rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-6">
              <h3 className="text-base font-bold text-zinc-200 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-emerald-400" /> Daily Timeline Checklist
              </h3>
              <span className="text-[10px] text-zinc-500 italic">Complete steps as you cook</span>
            </div>

            {/* Meals timeline mapping */}
            <div className="space-y-8">
              {[
                { type: 'breakfast' as const, name: 'Breakfast Plan', desc: plan.breakfast.name, summary: plan.breakfast.description, tasks: breakfastTasks },
                { type: 'lunch' as const, name: 'Lunch Plan', desc: plan.lunch.name, summary: plan.lunch.description, tasks: lunchTasks },
                { type: 'dinner' as const, name: 'Dinner Plan', desc: plan.dinner.name, summary: plan.dinner.description, tasks: dinnerTasks }
              ].map(meal => {
                const pct = getProgress(meal.tasks);
                const prepTime = meal.tasks.filter(t => t.type === 'prep').reduce((sum, t) => sum + t.durationMinutes, 0);
                const cookTime = meal.tasks.filter(t => t.type === 'cook').reduce((sum, t) => sum + t.durationMinutes, 0);

                return (
                  <div key={meal.type} className="relative group space-y-3">
                    
                    {/* Meal Header */}
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                            {meal.name}
                          </span>
                          <h4 className="text-sm font-extrabold text-zinc-100 mt-1.5">{meal.desc}</h4>
                        </div>
                        <div className="flex gap-2 text-[10px] text-zinc-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-600" /> Prep: {prepTime}m</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-600" /> Cook: {cookTime}m</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{meal.summary}</p>
                      
                      {/* Progress bar */}
                      <div className="pt-2">
                        <div className="flex justify-between text-[9px] text-zinc-500 font-mono mb-1">
                          <span>Timeline progress</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-1">
                          <div 
                            className="bg-emerald-500 h-1 rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step Tasks Checklists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                      {/* Prep Phase */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5 border-l border-zinc-800 pl-2">
                          ✂️ Preparation Stage
                        </h5>
                        <div className="space-y-1.5">
                          {meal.tasks.filter(t => t.type === 'prep').map(task => {
                            const isDone = task.isCompleted;
                            return (
                              <button
                                key={task.id}
                                onClick={() => toggleTask(meal.type, task.id)}
                                className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                                  isDone 
                                    ? 'bg-zinc-950/20 border-zinc-900 text-zinc-600 line-through' 
                                    : 'bg-zinc-950/50 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                                }`}
                              >
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-700 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="text-xs">
                                  <span>{task.description}</span>
                                  <span className="text-[9px] text-zinc-500 font-semibold ml-1.5">({task.durationMinutes}m)</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cook Phase */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5 border-l border-zinc-800 pl-2">
                          🔥 Fire-Cooking Stage
                        </h5>
                        <div className="space-y-1.5">
                          {meal.tasks.filter(t => t.type === 'cook').map(task => {
                            const isDone = task.isCompleted;
                            return (
                              <button
                                key={task.id}
                                onClick={() => toggleTask(meal.type, task.id)}
                                className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                                  isDone 
                                    ? 'bg-zinc-950/20 border-zinc-900 text-zinc-600 line-through' 
                                    : 'bg-zinc-950/50 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                                }`}
                              >
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-700 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="text-xs">
                                  <span>{task.description}</span>
                                  <span className="text-[9px] text-zinc-500 font-semibold ml-1.5">({task.durationMinutes}m)</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Budget feasibility widget & Grocery list */}
        <div className="space-y-6">
          
          {/* Budget Feasibility & Cost Ring Widget */}
          <div className="backdrop-blur-md bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-6">
            
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" /> Budget Feasibility
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bgStatusColor}`}>
                {budgetStatus.toUpperCase()} BUDGET
              </span>
            </div>

            {/* Radial Cost Tracker Ring */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background track */}
                  <circle
                    className="stroke-zinc-900"
                    strokeWidth="10"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  {/* Animated Cost arc */}
                  <circle
                    className={`transition-all duration-700 ${progressColor}`}
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - Math.min(budgetPercentage, 100) / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
                {/* Cost values nested */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-zinc-100">$ {totalCost.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500 mt-1">Limit: $ {budgetLimit}</span>
                </div>
              </div>
            </div>

            {/* Cost Status Warning Banner */}
            {budgetStatus === 'over' && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3 flex items-start gap-2.5 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0 animate-bounce" />
                <span>
                  <strong>Over budget!</strong> Recalculate your ingredients. Use the green <strong>Swap</strong> badges below to switch to economical options.
                </span>
              </div>
            )}

            {/* Cost-Saving Tips Toggle Panel */}
            <div className="border-t border-zinc-900 pt-4">
              <button
                onClick={() => setShowTips(!showTips)}
                className="w-full flex justify-between items-center text-xs text-zinc-400 hover:text-emerald-400 transition-all font-semibold"
              >
                <span className="flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-amber-400" /> Cost-Saving Tips</span>
                {showTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showTips && (
                <div className="mt-3 bg-zinc-900/30 border border-zinc-900 rounded-xl p-3 space-y-2 animate-fade-in text-[10px] text-zinc-400 leading-relaxed">
                  {plan.budgetAnalysis.savingsTips.map((tip, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* GROCERY CHECKLIST CARD WITH SWAPS */}
          <div className="backdrop-blur-md bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 shadow-lg space-y-4">
            
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" /> Grocery Checklist
              </h3>
              <span className="text-[9px] font-mono text-zinc-500">
                {groceryList.filter(i => i.isCompleted).length} / {groceryList.length} items
              </span>
            </div>

            {/* Checklist items list */}
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-zinc-950 scrollbar-thumb-zinc-900">
              {['Breakfast', 'Lunch', 'Dinner'].map(category => {
                const items = groceryList.filter(item => item.category === category);
                if (items.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {category} Ingredients
                    </h4>
                    
                    <div className="space-y-2">
                      {items.map(item => {
                        const isDone = item.isCompleted;
                        const isSwapped = swappedItems[item.id] || false;

                        return (
                          <div 
                            key={item.id} 
                            className={`flex flex-col border border-zinc-900/50 rounded-xl p-2.5 transition-all ${
                              isDone ? 'bg-zinc-950/10 opacity-60' : 'bg-zinc-900/20 hover:border-zinc-800'
                            }`}
                          >
                            {/* Line 1: Checkbox & Name & Cost */}
                            <div className="flex justify-between items-start gap-2.5">
                              <button
                                onClick={() => toggleGrocery(item.id)}
                                className="flex-1 text-left flex items-start gap-2 text-xs"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-700 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="space-y-0.5">
                                  <span className={`font-semibold ${isDone ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                                    {item.name}
                                  </span>
                                  {item.isPantryItem && (
                                    <span className="block text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-1 py-0.2 rounded w-fit uppercase font-semibold">
                                      Owned Pantry Item
                                    </span>
                                  )}
                                </div>
                              </button>

                              <span className={`text-[11px] font-bold ${isDone ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                {item.isPantryItem ? '$0.00' : `$ ${item.estimatedCost.toFixed(2)}`}
                              </span>
                            </div>

                            {/* Line 2: Swap option inline display */}
                            {item.hasSwap && item.swapOptions && !isDone && (
                              <div className="mt-2 pl-6 pt-2 border-t border-zinc-900/50 flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-zinc-500">
                                    Alternative: {item.swapOptions.name}
                                  </span>
                                  <button
                                    onClick={() => handleSwapItem(item.id)}
                                    className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                      isSwapped 
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                    }`}
                                  >
                                    <TrendingDown className="w-2.5 h-2.5" />
                                    {isSwapped ? 'Revert Swap' : `Swap (-$ ${Math.abs(item.swapOptions.diffCost).toFixed(2)})`}
                                  </button>
                                </div>
                                <span className="text-[8px] text-zinc-600 leading-snug italic">
                                  Reason: {item.swapOptions.reason}
                                </span>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
