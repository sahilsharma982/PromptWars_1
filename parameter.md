# Project Parameters & Rubric Alignment

This document outlines the design parameters of the **AI Cooking To-Do List & Meal Planner** and explains how the system implements the 6 evaluation metrics specified in the PromptWars rubric.

---

## 🚀 1. Problem Statement Alignment (High Impact)
*Targets the core challenge, user needs & objectives.*

*   **Core Feature**: Solves the daily meal planning fatigue by producing an actionable, chronological, step-by-step cooking timeline.
*   **Dynamic Health Document Analysis (Multimodal)**: Users can upload physical medical reports, blood tests, or allergen lists (PDF/Image/Text). The system uses Gemini's multimodal vision features to extract custom rules (e.g. "Low Potassium", "Dairy Free") dynamically, integrating them directly into the recipe generation.
*   **Budget Feasibility**: Includes real-time costing of grocery items. The budget agent runs a feasibility analysis and suggests direct, cheaper substitutes that fit the dietary constraints.
*   **Time Constraints**: Allocates specific time allowances for Breakfast, Lunch, and Dinner, planning recipes that fit the user's schedule.

---

## 🎨 2. Code Quality (High Impact)
*Clean, readable & well-structured code.*

*   **Modular Architecture**: Separates concerns into:
    *   `src/types/index.ts`: Type safety for inputs, agent outputs, and checklist status.
    *   `src/components/PlanningWizard.tsx`: Config state, sliders, and drag-and-drop file upload.
    *   `src/components/AgentConsole.tsx`: Immersive terminal simulation showing the agent chain of thought.
    *   `src/components/RecipeDashboard.tsx`: High-fidelity interactive checklist and budget widgets.
    *   `src/utils/mockGenerator.ts`: Predictable mock response compiler for the offline demo.
*   **TypeScript**: Strictly typed components, parameters, and API responses. No `any` type usage.
*   **Linting**: Configured with Next.js ESLint guidelines to prevent runtime syntax or logical issues.

---

## 🔒 3. Security (Medium Impact)
*Safe practices, avoids common vulnerabilities.*

*   **API Key Protection**: The Gemini API is called exclusively from serverless Next.js API routes (`/api/generate-plan`). The `GEMINI_API_KEY` is kept on the server and is never exposed to the client-side bundle.
*   **Secure File Processing**: Uploaded documents are read as base64 in memory, passed to the secure serverless route, and sent directly to Google Gemini's secure API. No files are stored permanently on disk or exposed publicly.
*   **Input Sanitization**: File uploads are restricted to common document/image types (PDF, PNG, JPG, JPEG, TXT) and capped at 5MB to prevent denial-of-service (DoS) or buffer issues.

---

## ⚡ 4. Efficiency (Medium Impact)
*Optimal use of time & memory.*

*   **Single-Round Agent Reasoning**: To prevent excessive LLM costs and latency, the system prompt structures the multi-agent task as a single-turn structured JSON request. The prompt instruct the LLM to write reasoning logs for the 🩺 Health, 🍳 Recipe, 💳 Budget, and ⏱️ Coordinator agents sequentially, returning the combined state in a single payload.
*   **Tailwind CSS v4 & Turbopack**: Tailored stylesheets with Tailwind v4 compile rapidly, with zero unused CSS rules, maximizing mobile load speed.
*   **Local State Management**: Operations like marking checklist tasks as complete and swapping ingredients are processed instantly on the client, updating the budget ring and timeline without triggering secondary server requests.

---

## 🧪 5. Testing (Low Impact)
*Easily testable & maintainable code.*

*   **Zero-Config Demo Mode (Local Fallback)**: If no `GEMINI_API_KEY` environment variable is defined, the app automatically runs in a highly interactive **Simulation Mode**. The mock generator returns high-fidelity planning outputs and realistic multi-agent thought streams, allowing judges to test 100% of the UI features instantly.
*   **Simulated Upload Test Cases**: The wizard includes direct buttons to load "Mock Medical Reports" (e.g. "Vitamin D Deficient", "Lactose Intolerant") so testers can check multimodal processing even without a physical scanner or live API connection.

---

## ♿ 6. Accessibility (Low Impact)
*Usable for diverse users & environments.*

*   **High Contrast Dark & Emerald Theme**: Uses an obsidian-dark background with vibrant mint/emerald highlights, exceeding WCAG 2.1 AA contrast ratios for text readability.
*   **Responsive Layout**: Adaptive flex and grid structures optimize the experience from small mobile screens (single-column card lists) to wide desktop dashboards.
*   **Keyboard & Screen Reader Friendly**: Form controls, buttons, and custom checklist switches use semantic HTML elements with clear visual active/focus states.
