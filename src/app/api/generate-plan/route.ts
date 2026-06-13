import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { MealPlanInput, MealPlanResponse, GroceryItem, AgentLog } from '@/types';
import { generateMockPlan } from '@/utils/mockGenerator';

export async function POST(req: NextRequest) {
  let input: MealPlanInput;
  try {
    input = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GEMENI_API_KEY;
  const nimApiKey = process.env.NIM_API_KEY;

  // If no Gemini API Key is available, run simulation fallback
  if (!geminiApiKey) {
    console.log('No Gemini API Key found. Falling back to local offline simulation.');
    await new Promise(resolve => setTimeout(resolve, 2000)); // loading feel
    const mockResult = generateMockPlan(input);
    
    // Add NIM reference logs to show it is simulated
    if (nimApiKey) {
      mockResult.agentLogs = mockResult.agentLogs.map(log => 
        log.agent === 'budget' 
          ? { ...log, message: `[Simulated NIM Llama-3.1] ${log.message}` } 
          : log
      );
    }
    return NextResponse.json({ ...mockResult, isMock: true });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Step 1: Health Analyzer and Recipe Planner (Gemini)
    const contents: any[] = [];
    if (input.healthReport && input.healthReport.startsWith('data:')) {
      const commaIndex = input.healthReport.indexOf(',');
      if (commaIndex !== -1) {
        const mimeType = input.healthReport.substring(
          input.healthReport.indexOf(':') + 1,
          input.healthReport.indexOf(';')
        );
        const base64Data = input.healthReport.substring(commaIndex + 1);

        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }
    } else if (input.healthReport) {
      contents.push({ text: `Health Report Details:\n${input.healthReport}` });
    }

    const systemPromptGemini = `
You are the primary coordinator in a multi-agent system.
Your job is to:
1. 🩺 Health Analyzer Agent: Parse the attached medical report, file, or preferences and formulate a list of health rules.
2. 🍳 Recipe Planner Agent: Design Breakfast, Lunch, and Dinner recipes conforming to:
   - Portions: ${input.portions}
   - Dietary restrictions: ${input.dietaryRestrictions.join(', ') || 'None'}
   - Cooking skill: ${input.cookingSkill}
   - Kitchen equipment: ${input.kitchenEquipment.join(', ') || 'Standard'}
   - Time Constraints: Breakfast < ${input.timeConstraints.breakfast}m, Lunch < ${input.timeConstraints.lunch}m, Dinner < ${input.timeConstraints.dinner}m.

You MUST respond strictly in valid JSON format.
JSON Schema:
{
  "healthRules": ["string"],
  "breakfast": {
    "name": "string",
    "prepTimeMinutes": number,
    "cookTimeMinutes": number,
    "description": "string",
    "tasks": [
      { "id": "t-b1", "type": "prep" | "cook", "description": "string", "durationMinutes": number }
    ]
  },
  "lunch": {
    "name": "string",
    "prepTimeMinutes": number,
    "cookTimeMinutes": number,
    "description": "string",
    "tasks": [
      { "id": "t-l1", "type": "prep" | "cook", "description": "string", "durationMinutes": number }
    ]
  },
  "dinner": {
    "name": "string",
    "prepTimeMinutes": number,
    "cookTimeMinutes": number,
    "description": "string",
    "tasks": [
      { "id": "t-d1", "type": "prep" | "cook", "description": "string", "durationMinutes": number }
    ]
  },
  "agentLogs": [
    {
      "agent": "health" | "recipe" | "coordinator",
      "timestamp": "string (HH:MM:SS)",
      "message": "string",
      "status": "running" | "completed" | "info"
    }
  ]
}
`;

    const userPromptGemini = `
Generate recipes based on:
- Restrictions: ${input.dietaryRestrictions.join(', ') || 'None'}
- Portions: ${input.portions}
- Skill: ${input.cookingSkill}
- Equipment: ${input.kitchenEquipment.join(', ')}
- Pantry items available (no shopping needed): ${input.pantryIngredients.join(', ')}
${input.healthFileName ? `Analyze health document constraints from the attached file ${input.healthFileName}.` : ''}
`;

    contents.push({ text: userPromptGemini });

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemPromptGemini,
        responseMimeType: 'application/json',
      }
    });

    const geminiText = geminiResponse.text;
    if (!geminiText) {
      throw new Error('Gemini returned an empty response.');
    }

    const geminiData = JSON.parse(geminiText.trim());

    // Step 2: Financial & Budget Analysis (Delegated to NVIDIA NIM if key exists, otherwise Gemini)
    let groceryList: GroceryItem[] = [];
    let budgetAnalysis: any = null;
    let budgetLogs: AgentLog[] = [];

    if (nimApiKey) {
      console.log('NIM API Key detected. Delegating Budget Agent to NVIDIA Llama NIM API.');
      try {
        const nimPrompt = `
You are the Budget Analyst Agent. Review these proposed recipes:
Breakfast: "${geminiData.breakfast.name}"
Lunch: "${geminiData.lunch.name}"
Dinner: "${geminiData.dinner.name}"

User preferences:
- Budget Limit: $${input.budgetLimit}
- Portions: ${input.portions}
- Pantry items (do not charge for these, mark isPantryItem: true, estimatedCost: 0): ${input.pantryIngredients.join(', ')}

Your task is to:
1. Compile a comprehensive grocery list of ingredients needed for these meals.
2. Estimate costs based on ${input.portions} portion(s).
3. If the total grocery cost exceeds the budget limit of $${input.budgetLimit}, add a "swapOptions" block to the most expensive items to substitute them for cheaper options.
4. Output 2-3 detailed agent logs describing your budget check.

You MUST respond strictly in valid JSON format:
{
  "groceryList": [
    {
      "id": "string (e.g. g-1)",
      "name": "string (ingredient name)",
      "category": "string (Breakfast, Lunch, or Dinner)",
      "estimatedCost": number,
      "isPantryItem": boolean,
      "isCompleted": false,
      "hasSwap": boolean,
      "swapOptions": {
        "name": "string (cheaper alternative)",
        "estimatedCost": number,
        "diffCost": number (negative number showing savings),
        "reason": "string"
      } | null
    }
  ],
  "budgetAnalysis": {
    "totalGroceryCost": number,
    "budgetLimit": number,
    "feasibilityStatus": "under" | "borderline" | "over",
    "savingsTips": ["string"]
  },
  "agentLogs": [
    {
      "agent": "budget",
      "timestamp": "string (HH:MM:SS)",
      "message": "string",
      "status": "running" | "completed" | "warning" | "info"
    }
  ]
}
`;

        const nimResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nimApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta/llama-3.1-70b-instruct',
            messages: [{ role: 'user', content: nimPrompt }],
            temperature: 0.1
          })
        });

        if (!nimResponse.ok) {
          throw new Error(`NVIDIA NIM returned status: ${nimResponse.status}`);
        }

        const nimJson = await nimResponse.json();
        const nimText = nimJson.choices[0].message.content;
        const nimData = JSON.parse(nimText.substring(nimText.indexOf('{'), nimText.lastIndexOf('}') + 1).trim());

        groceryList = nimData.groceryList;
        budgetAnalysis = nimData.budgetAnalysis;
        budgetLogs = nimData.agentLogs.map((log: any) => ({
          ...log,
          message: `[NIM Llama-3.1-70B] ${log.message}`
        }));

      } catch (nimErr) {
        console.warn('NVIDIA NIM call failed. Falling back to Gemini for budget auditing:', nimErr);
        // Fallback to Gemini for budgeting if NIM fails
        const fallbackBudget = await runGeminiBudgetFallback(ai, geminiData, input);
        groceryList = fallbackBudget.groceryList;
        budgetAnalysis = fallbackBudget.budgetAnalysis;
        budgetLogs = fallbackBudget.agentLogs;
      }
    } else {
      // No NIM key, use Gemini for budget
      console.log('No NIM key. Running Budget Agent on Gemini.');
      const geminiBudget = await runGeminiBudgetFallback(ai, geminiData, input);
      groceryList = geminiBudget.groceryList;
      budgetAnalysis = geminiBudget.budgetAnalysis;
      budgetLogs = geminiBudget.agentLogs;
    }

    // Combine logs and return final response
    const combinedLogs: AgentLog[] = [
      ...(geminiData.agentLogs || []),
      ...budgetLogs
    ];

    // Ensure coordinator completion log is present
    if (!combinedLogs.some(l => l.agent === 'coordinator' && l.status === 'completed')) {
      combinedLogs.push({
        agent: 'coordinator',
        timestamp: new Date().toLocaleTimeString(),
        message: 'Daily cooking tasks chronologically ordered and prepared for presentation.',
        status: 'completed'
      });
    }

    const finalResponse: MealPlanResponse = {
      healthRules: geminiData.healthRules || [],
      breakfast: geminiData.breakfast,
      lunch: geminiData.lunch,
      dinner: geminiData.dinner,
      groceryList,
      budgetAnalysis,
      agentLogs: combinedLogs
    };

    return NextResponse.json({ ...finalResponse, isMock: false });

  } catch (err: any) {
    console.error('Core generation error:', err);
    // Graceful recovery to mock
    return NextResponse.json({
      error: err.message || 'Generation failed',
      ...generateMockPlan(input),
      isMock: true,
      hasError: true
    });
  }
}

async function runGeminiBudgetFallback(ai: any, geminiData: any, input: MealPlanInput) {
  const prompt = `
You are the Budget Analyst Agent. Audit the ingredients needed for these meals:
Breakfast: "${geminiData.breakfast.name}"
Lunch: "${geminiData.lunch.name}"
Dinner: "${geminiData.dinner.name}"

Constraints:
- Budget Limit: $${input.budgetLimit}
- Portions: ${input.portions}
- Pantry items (cost = 0, isPantryItem = true): ${input.pantryIngredients.join(', ')}

Compile the grocery list, estimated costs, feasibility, and substitutions if over budget.
Return strictly valid JSON:
{
  "groceryList": [
    {
      "id": "g-1",
      "name": "ingredient name",
      "category": "Breakfast | Lunch | Dinner",
      "estimatedCost": number,
      "isPantryItem": boolean,
      "isCompleted": false,
      "hasSwap": boolean,
      "swapOptions": {
        "name": "string",
        "estimatedCost": number,
        "diffCost": number,
        "reason": "string"
      } | null
    }
  ],
  "budgetAnalysis": {
    "totalGroceryCost": number,
    "budgetLimit": number,
    "feasibilityStatus": "under" | "borderline" | "over",
    "savingsTips": ["string"]
  },
  "agentLogs": [
    {
      "agent": "budget",
      "timestamp": "string",
      "message": "string",
      "status": "running" | "completed" | "warning"
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    }
  });

  const parsed = JSON.parse(response.text.trim());
  return parsed;
}
