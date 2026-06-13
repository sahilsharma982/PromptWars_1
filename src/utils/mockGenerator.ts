import { MealPlanInput, MealPlanResponse, GroceryItem, CookingTask, AgentLog, SwapOption } from '../types';

export function generateMockPlan(input: MealPlanInput): MealPlanResponse {
  const isVegan = input.dietaryRestrictions.some(r => r.toLowerCase().includes('vegan'));
  const isKeto = input.dietaryRestrictions.some(r => r.toLowerCase().includes('keto'));
  const isGlutenFree = input.dietaryRestrictions.some(r => r.toLowerCase().includes('gluten'));
  const isLowSodium = input.dietaryRestrictions.some(r => r.toLowerCase().includes('sodium'));
  const isLactoseIntolerant = input.dietaryRestrictions.some(r => r.toLowerCase().includes('lactose'));
  const highProtein = input.dietaryRestrictions.some(r => r.toLowerCase().includes('protein') || r.toLowerCase().includes('high-protein'));

  // Derive health rules
  const healthRules: string[] = [];
  if (input.healthReport) {
    healthRules.push(`Extracted from file (${input.healthFileName || 'Health Report'}):`);
    if (input.healthReport.toLowerCase().includes('vitamin d')) {
      healthRules.push('Incorporate Vitamin D rich foods (fatty fish, mushrooms, fortified grains).');
    }
    if (input.healthReport.toLowerCase().includes('sodium') || input.healthReport.toLowerCase().includes('salt')) {
      healthRules.push('Strict limit on sodium content. Avoid processed meats and heavy salts.');
    }
    if (input.healthReport.toLowerCase().includes('cholesterol') || input.healthReport.toLowerCase().includes('lipid')) {
      healthRules.push('Focus on heart-healthy unsaturated fats, fiber, and lean proteins.');
    }
    if (input.healthReport.toLowerCase().includes('iron') || input.healthReport.toLowerCase().includes('anemia')) {
      healthRules.push('Boost iron-rich sources (spinach, lentils, dark poultry) paired with Vitamin C.');
    }
  }

  // Populate basic toggles
  input.dietaryRestrictions.forEach(r => {
    if (!healthRules.includes(r)) {
      healthRules.push(`Adhere to ${r} dietary preference.`);
    }
  });

  if (healthRules.length === 0) {
    healthRules.push('Balanced nutritional profiling (default diet).');
  }

  // Custom ingredient builder with pantry mapping
  const checkPantry = (name: string, cost: number): { name: string; cost: number; isPantry: boolean } => {
    const inPantry = input.pantryIngredients.some(p => 
      name.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(name.toLowerCase())
    );
    return {
      name,
      cost: inPantry ? 0 : cost * input.portions,
      isPantry: inPantry
    };
  };

  interface MockItemInput {
    name: string;
    cost: number;
    swap?: {
      name: string;
      cost: number;
      reason: string;
    };
  }

  // 1. Breakfast Setup
  let breakfastName = 'Oatmeal Bowl with Berries and Honey';
  let breakfastDesc = 'Hearty rolled oats topped with antioxidant-rich fresh berries and chia seeds.';
  let breakfastItems: MockItemInput[] = [
    { name: 'Rolled Oats', cost: 1.2 },
    { name: 'Fresh Berries', cost: 3.5, swap: { name: 'Banana', cost: 0.8, reason: 'Bananas are high in potassium and cost 75% less than fresh berries.' } },
    { name: 'Chia Seeds', cost: 1.0 },
    { name: 'Honey/Maple Syrup', cost: 0.8 }
  ];

  if (isKeto) {
    breakfastName = 'Avocado & Bacon Baked Egg Skillet';
    breakfastDesc = 'A low-carb, high-fat skillet of baked eggs nested in avocado halves and crispy bacon.';
    breakfastItems = [
      { name: 'Eggs', cost: 1.5 },
      { name: 'Avocado', cost: 2.2 },
      { name: 'Crispy Bacon', cost: 3.5, swap: { name: 'Spinach & Tofu', cost: 1.8, reason: 'Swap bacon for spinach and organic tofu to cut saturated fat and cost.' } },
      { name: 'Cheddar Cheese', cost: 1.2 }
    ];
  } else if (isVegan) {
    breakfastName = 'Scrambled Tofu Toast with Spinach';
    breakfastDesc = 'Crumbled firm tofu seasoned with turmeric and garlic, served on whole grain toast with baby spinach.';
    breakfastItems = [
      { name: 'Firm Tofu', cost: 1.8 },
      { name: 'Whole Grain Bread', cost: 1.5 },
      { name: 'Baby Spinach', cost: 2.0 },
      { name: 'Cherry Tomatoes', cost: 1.5 }
    ];
  }

  // 2. Lunch Setup
  let lunchName = 'Zesty Quinoa Salad with Chickpeas';
  let lunchDesc = 'Protein-rich quinoa tossed with canned chickpeas, cucumber, parsley, and lemon-olive oil dressing.';
  let lunchItems: MockItemInput[] = [
    { name: 'Quinoa', cost: 2.0 },
    { name: 'Canned Chickpeas', cost: 1.2 },
    { name: 'Cucumber & Herbs', cost: 1.8 },
    { name: 'Lemon & Olive Oil', cost: 1.0 }
  ];

  if (isKeto) {
    lunchName = 'Keto Chicken Caesar Salad';
    lunchDesc = 'Shredded chicken breast on crisp romaine lettuce, topped with parmesan chips and creamy garlic dressing.';
    lunchItems = [
      { name: 'Chicken Breast', cost: 4.0 },
      { name: 'Romaine Lettuce', cost: 1.5 },
      { name: 'Parmesan Cheese', cost: 2.0 },
      { name: 'Caesar Dressing', cost: 1.2 }
    ];
  } else if (highProtein && !isVegan) {
    lunchName = 'Turkey Wrap with Hummus and Spinach';
    lunchDesc = 'Lean deli turkey slices wrapped with creamy chickpea hummus, spinach, and grated carrots.';
    lunchItems = [
      { name: 'Deli Turkey Slices', cost: 3.8 },
      { name: 'Flour Tortillas', cost: 1.2, swap: { name: 'Lettuce Wraps', cost: 0.6, reason: 'Use butter lettuce cups instead of flour wraps to lower calories and budget.' } },
      { name: 'Hummus', cost: 1.8 },
      { name: 'Spinach & Carrots', cost: 1.5 }
    ];
  }

  // 3. Dinner Setup
  let dinnerName = 'Pan-Seared Salmon with Steamed Broccolini';
  let dinnerDesc = 'Omega-3 rich salmon fillets seared in olive oil, served with garlic-seasoned steamed broccolini.';
  let dinnerItems: MockItemInput[] = [
    { name: 'Fresh Salmon Fillet', cost: 8.5, swap: { name: 'Canned Sardines', cost: 2.5, reason: 'Canned sardines provide excellent Omega-3, require no cooking, and save $6.00.' } },
    { name: 'Broccolini', cost: 3.0, swap: { name: 'Frozen Broccoli Florets', cost: 1.2, reason: 'Frozen broccoli has similar nutrients but costs much less and has zero waste.' } },
    { name: 'Garlic & Olive Oil', cost: 0.8 },
    { name: 'Lemon Slice', cost: 0.5 }
  ];

  if (isVegan || isKeto && isVegan) {
    dinnerName = 'Crispy Sesame Tofu & Broccoli Stir-Fry';
    dinnerDesc = 'Crisped firm tofu cubes tossed with broccoli florets, bell peppers, and low-sodium sesame soy sauce.';
    dinnerItems = [
      { name: 'Firm Tofu', cost: 1.8 },
      { name: 'Broccoli Florets', cost: 1.5 },
      { name: 'Bell Peppers', cost: 2.2 },
      { name: 'Sesame Ginger Sauce', cost: 1.2 }
    ];
  } else if (input.budgetLimit < 25) {
    // Budget-forced dinner
    dinnerName = 'Hearty Tuscan White Bean Pasta';
    dinnerDesc = 'Penne pasta tossed in canned crushed tomatoes, white cannellini beans, garlic, and freshly torn basil.';
    dinnerItems = [
      { name: 'Penne Pasta', cost: 1.0 },
      { name: 'Cannellini Beans', cost: 1.1 },
      { name: 'Crushed Tomatoes', cost: 1.2 },
      { name: 'Garlic & Basil', cost: 1.0 }
    ];
  }

  // Compile items into grocery list, checking pantry
  const groceryList: GroceryItem[] = [];
  let itemIdCounter = 1;

  const processItems = (items: MockItemInput[], category: string) => {
    items.forEach(item => {
      const checked = checkPantry(item.name, item.cost);
      let swapOption: SwapOption | null = null;

      if (item.swap) {
        const swapChecked = checkPantry(item.swap.name, item.swap.cost);
        swapOption = {
          name: item.swap.name,
          estimatedCost: swapChecked.cost,
          diffCost: swapChecked.cost - checked.cost,
          reason: item.swap.reason
        };
      }

      groceryList.push({
        id: `g-${itemIdCounter++}`,
        name: checked.name,
        category,
        estimatedCost: checked.cost,
        isPantryItem: checked.isPantry,
        isCompleted: checked.isPantry, // auto-completed if in pantry
        hasSwap: !!item.swap,
        swapOptions: swapOption
      });
    });
  };

  processItems(breakfastItems, 'Breakfast');
  processItems(lunchItems, 'Lunch');
  processItems(dinnerItems, 'Dinner');

  // Total initial cost calculation
  const totalCost = groceryList.reduce((sum, item) => sum + item.estimatedCost, 0);

  // Budget status
  let status: 'under' | 'borderline' | 'over' = 'under';
  if (totalCost > input.budgetLimit) {
    status = 'over';
  } else if (totalCost >= input.budgetLimit * 0.85) {
    status = 'borderline';
  }

  // Saving tips
  const savingsTips = [
    'Check freezer for frozen veggies before buying fresh ones.',
    'Buy staples (oats, pasta, quinoa) from bulk bins to reduce packaging costs.',
    'Utilize the ingredient swap toggles to instantly shave up to $10.00 off your checkout.'
  ];
  if (status === 'over') {
    savingsTips.unshift('Urgent: Your plan is currently over budget. Click the "Swap" badges in your Grocery List below to exchange expensive items for cheaper alternatives.');
  }

  // Generate Tasks based on Skill & Equipment
  const skillText = input.cookingSkill === 'beginner' ? 'Carefully ' : '';
  const stoveNeeded = input.kitchenEquipment.some(e => e.toLowerCase().includes('stove'));
  const microwaveOnly = input.kitchenEquipment.length === 1 && input.kitchenEquipment[0].toLowerCase() === 'microwave';

  const breakfastTasks: CookingTask[] = [
    { id: 't-b1', type: 'prep', description: `Measure out portion sizes for ${input.portions} serving(s).`, durationMinutes: 2, isCompleted: false },
    { id: 't-b2', type: 'prep', description: `Rinse berries and gather kitchen tools (${input.kitchenEquipment.slice(0, 2).join(', ') || 'basics'}).`, durationMinutes: 3, isCompleted: false },
    { id: 't-b3', type: 'cook', description: microwaveOnly ? 'Microwave oats and water in a microwave-safe bowl for 2.5 minutes.' : 'Simmer oats in milk/water on the stove, stirring frequently until creamy.', durationMinutes: Math.min(6, input.timeConstraints.breakfast - 5), isCompleted: false },
    { id: 't-b4', type: 'cook', description: 'Plating: Spoon oatmeal into bowls, top with seeds, honey, and sliced fruit.', durationMinutes: 3, isCompleted: false }
  ];

  const lunchTasks: CookingTask[] = [
    { id: 't-l1', type: 'prep', description: 'Wash and dice cucumber, parsley, and garlic.', durationMinutes: 5, isCompleted: false },
    { id: 't-l2', type: 'prep', description: 'Drain and thoroughly rinse canned beans/chickpeas.', durationMinutes: 2, isCompleted: false },
    { id: 't-l3', type: 'cook', description: `Toss cooked grains with diced vegetables, beans, fresh dressing, and ${skillText}season with salt/pepper.`, durationMinutes: Math.min(8, input.timeConstraints.lunch - 7), isCompleted: false }
  ];

  const dinnerTasks: CookingTask[] = [
    { id: 't-d1', type: 'prep', description: 'Wash broccolini and slice lemon slices. Finely chop garlic.', durationMinutes: 5, isCompleted: false },
    { id: 't-d2', type: 'prep', description: 'Pat proteins dry with paper towels and season evenly.', durationMinutes: 3, isCompleted: false },
    { id: 't-d3', type: 'cook', description: stoveNeeded ? 'Heat pan with olive oil on medium-high; sear protein until cooked through.' : 'Assemble ingredients in a heat-proof baking tray/microwave cooker.', durationMinutes: Math.min(15, input.timeConstraints.dinner - 10), isCompleted: false },
    { id: 't-d4', type: 'cook', description: 'Steam broccolini with 2 tablespoons of water until tender-crisp; toss in garlic oil.', durationMinutes: 5, isCompleted: false }
  ];

  // Dynamic customization based on inputs
  if (isKeto) {
    breakfastTasks[2] = { id: 't-b3', type: 'cook', description: 'Bake eggs and bacon in oven safe ramekins or stove skillet on medium-low.', durationMinutes: 12, isCompleted: false };
  }
  if (isVegan) {
    dinnerTasks[2] = { id: 't-d3', type: 'cook', description: 'Sauté tofu cubes in sesame oil until crispy; add broccoli and sauce.', durationMinutes: 10, isCompleted: false };
  }

  // Create timeline agent logs
  const agentLogs: AgentLog[] = [
    {
      agent: 'health',
      timestamp: new Date().toLocaleTimeString(),
      message: `Analyzing health conditions... ${input.healthReport ? 'Identified medical file upload.' : 'Analyzing manual selections.'}`,
      status: 'info'
    },
    {
      agent: 'health',
      timestamp: new Date().toLocaleTimeString(),
      message: `Enforced rules: ${healthRules.filter(r => !r.startsWith('Extracted')).join(' | ')}`,
      status: 'completed'
    },
    {
      agent: 'recipe',
      timestamp: new Date().toLocaleTimeString(),
      message: `Generating recipe cards for ${input.portions} portion(s). Target cooking skill: ${input.cookingSkill}.`,
      status: 'running'
    },
    {
      agent: 'recipe',
      timestamp: new Date().toLocaleTimeString(),
      message: `Crafted meals: Breakfast (${breakfastName}), Lunch (${lunchName}), Dinner (${dinnerName}). All fit within requested meal durations.`,
      status: 'completed'
    },
    {
      agent: 'budget',
      timestamp: new Date().toLocaleTimeString(),
      message: `Calculating ingredient costing against daily budget: $${input.budgetLimit.toFixed(2)}.`,
      status: 'running'
    }
  ];

  if (status === 'over') {
    agentLogs.push({
      agent: 'budget',
      timestamp: new Date().toLocaleTimeString(),
      message: `Alert: Cost ($${totalCost.toFixed(2)}) exceeds budget. Generating cost-saving substitutions...`,
      status: 'warning'
    });
    // Add swap notes
    const swapNotes = groceryList.filter(g => g.hasSwap).map(g => `${g.name} -> ${g.swapOptions?.name}`).join(', ');
    agentLogs.push({
      agent: 'budget',
      timestamp: new Date().toLocaleTimeString(),
      message: `Substitutions prepared for checkout: [${swapNotes}]. Swap tags enabled in dashboard.`,
      status: 'info'
    });
  } else {
    agentLogs.push({
      agent: 'budget',
      timestamp: new Date().toLocaleTimeString(),
      message: `Cost analysis complete: $${totalCost.toFixed(2)} is under budget limit of $${input.budgetLimit.toFixed(2)}.`,
      status: 'completed'
    });
  }

  agentLogs.push({
    agent: 'coordinator',
    timestamp: new Date().toLocaleTimeString(),
    message: `Sequencing ${breakfastTasks.length + lunchTasks.length + dinnerTasks.length} prep and cook tasks into chronological timeline.`,
    status: 'running'
  });

  agentLogs.push({
    agent: 'coordinator',
    timestamp: new Date().toLocaleTimeString(),
    message: 'Task timeline generated. Prep stages separated from fire-cooking stages to optimize cooking efficiency.',
    status: 'completed'
  });

  return {
    healthRules,
    breakfast: {
      name: breakfastName,
      prepTimeMinutes: breakfastTasks.filter(t => t.type === 'prep').reduce((sum, t) => sum + t.durationMinutes, 0),
      cookTimeMinutes: breakfastTasks.filter(t => t.type === 'cook').reduce((sum, t) => sum + t.durationMinutes, 0),
      description: breakfastDesc,
      tasks: breakfastTasks
    },
    lunch: {
      name: lunchName,
      prepTimeMinutes: lunchTasks.filter(t => t.type === 'prep').reduce((sum, t) => sum + t.durationMinutes, 0),
      cookTimeMinutes: lunchTasks.filter(t => t.type === 'cook').reduce((sum, t) => sum + t.durationMinutes, 0),
      description: lunchDesc,
      tasks: lunchTasks
    },
    dinner: {
      name: dinnerName,
      prepTimeMinutes: dinnerTasks.filter(t => t.type === 'prep').reduce((sum, t) => sum + t.durationMinutes, 0),
      cookTimeMinutes: dinnerTasks.filter(t => t.type === 'cook').reduce((sum, t) => sum + t.durationMinutes, 0),
      description: dinnerDesc,
      tasks: dinnerTasks
    },
    groceryList,
    budgetAnalysis: {
      totalGroceryCost: parseFloat(totalCost.toFixed(2)),
      budgetLimit: input.budgetLimit,
      feasibilityStatus: status,
      savingsTips
    },
    agentLogs
  };
}
