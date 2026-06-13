export type CookingSkill = 'beginner' | 'intermediate' | 'advanced';

export interface TimeConstraints {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface MealPlanInput {
  dietaryRestrictions: string[];
  budgetLimit: number;
  pantryIngredients: string[];
  portions: number;
  cookingSkill: CookingSkill;
  kitchenEquipment: string[];
  timeConstraints: TimeConstraints;
  healthReport: string | null; // Raw text or base64 extracted rules
  healthFileName: string | null;
}

export interface CookingTask {
  id: string;
  type: 'prep' | 'cook';
  description: string;
  durationMinutes: number;
  isCompleted: boolean;
}

export interface MealPlan {
  name: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  description: string;
  tasks: CookingTask[];
}

export interface SwapOption {
  name: string;
  estimatedCost: number;
  diffCost: number; // Positive if expensive, negative if savings
  reason: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  estimatedCost: number;
  isPantryItem: boolean;
  isCompleted: boolean;
  hasSwap: boolean;
  swapOptions: SwapOption | null;
  activeSwapName?: string; // Track which swap option is active if selected
  originalName?: string; // Keep track of the original name if swapped
  originalCost?: number; // Keep track of the original cost if swapped
}

export interface BudgetAnalysis {
  totalGroceryCost: number;
  budgetLimit: number;
  feasibilityStatus: 'under' | 'borderline' | 'over'; // under: <90%, borderline: 90-100%, over: >100%
  savingsTips: string[];
}

export type AgentName = 'health' | 'recipe' | 'budget' | 'coordinator';

export interface AgentLog {
  agent: AgentName;
  timestamp: string;
  message: string;
  status: 'running' | 'completed' | 'warning' | 'info';
}

export interface MealPlanResponse {
  healthRules: string[];
  breakfast: MealPlan;
  lunch: MealPlan;
  dinner: MealPlan;
  groceryList: GroceryItem[];
  budgetAnalysis: BudgetAnalysis;
  agentLogs: AgentLog[];
}
