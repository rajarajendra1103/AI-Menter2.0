/**
 * vizAI.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AI service for generating flowcharts (Mermaid), step traces, and call graphs (D3).
 */

import { generateOpenRouterResponse } from './openrouter';

const buildPrompt = (code, language, userInput, programOutput) => `
You are a technical visualisation expert. Your task is to analyze the provided source code and its execution context (input/output) to generate three specific visual representations:

1. A Mermaid.js Flowchart (Visualises CODE EXECUTION — logical flow, conditions, and loops)
2. A Step Trace (sequential execution steps with state updates)
3. A Hierarchical Call Graph (Visualises DATA FLOW in a tree format — shows calls, state changes, and value propagation)

━━━━━━━━━━━ SOURCE CODE (${language}) ━━━━━━━━━━━
${code}

━━━━━━━━━━━ PROGRAM INPUT ━━━━━━━━━━━
${userInput || '(none)'}

━━━━━━━━━━━ PROGRAM OUTPUT ━━━━━━━━━━━
${programOutput || '(none)'}

━━━━━━━━━━━ INSTRUCTIONS ━━━━━━━━━━━
Analyse the code and produce a JSON object with EXACTLY this shape:

{
  "flowchart": "graph TD\n  A[\"Start\"] --> B[\"Process\"]",
  "stepTrace": [
    {
      "step": number,
      "line": number,
      "code": "string",
      "explanation": "string",
      "stateChanges": { "varName": "newValue" }
    }
  ],
  "callGraph": {
    "nodes": [
      {
        "id": "unique_string",
        "label": "displayName",
        "type": "function | loop | condition | data | return",
        "meta": {
          "params":    "comma-separated param=value pairs, e.g. n=5",
          "condition": "loop or if condition as a string, e.g. i < n",
          "value":     "return value or data value as a string",
          "variables": { "varName": "currentValue" }
        }
      }
    ],
    "links": [
      { "source": "parent_id", "target": "child_id" }
    ]
  }
}

━━━━━━━━━━━ CRITICAL RULES ━━━━━━━━━━━

1. MERMAID FLOWCHART (CODE EXECUTION):
   - You must output 'flowchart' as a valid Mermaid.js string (usually graph TD).
   - FOCUS: Show how the code executes step-by-step (Control Flow).
   - CRITICAL: Always wrap node labels in double quotes.
   - NESTED QUOTES RULE: If the code inside a label contains quotes, you MUST use single quotes instead of double quotes.
     Example: A["arr['i'] = 10"] instead of A["arr["i"] = 10"].
   - SPECIAL CHARACTERS: Use double quotes for any label containing [ ], ( ), ;, <, >, or =.
   - Use clear, sequential logic for execution flow.
   - For conditions, use the diamond shape: id{ "condition" }.
   - Use standard Mermaid syntax. No extra text or markers.

2. CALL GRAPH — DATA FLOW TREE (DATA FOCUS):
   - The graph MUST form a strict TREE (no cycles) representing DATA FLOW.
   - FOCUS: Show how data is transformed, passed to functions, and returned. Each node has exactly ONE parent except the root.
   - The ROOT is the entry point (e.g., main() or the top-level call).
   - For RECURSIVE code: model each call level as a SEPARATE node with a unique id.
     Example for factorial(3):
       { id: "fact_3", label: "factorial", type: "function", meta: { params: "n=3" } }
       { id: "fact_2", label: "factorial", type: "function", meta: { params: "n=2" } }
       { id: "fact_1", label: "factorial", type: "function", meta: { params: "n=1" } }
       { id: "fact_bc",label: "base case", type: "return",   meta: { value: "1" } }
       links: fact_3→fact_2, fact_2→fact_1, fact_1→fact_bc
   - For LOOPS: add a loop node as a child, then add iteration/body nodes as its children.
   - For CONDITIONALS: add a condition node with true/false branches as children.
   - For DATA (arrays, objects): add a data node with meta.value showing its current state.
   - node types:
       "function"  = any function/recursive call
       "loop"      = for/while/do-while with meta.condition = the loop guard
       "condition" = if/else/switch with meta.condition = the boolean expression
       "data"      = variable, array, object — meta.value = its value/state
       "return"    = base case or return statement — meta.value = returned value

3. RESPONSE FORMAT:
   - Respond with ONLY valid JSON. Zero markdown fences. No extra text.
`;

const stripFences = (raw) => {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
};

const validateAndNormalise = (parsed) => {
  if (!parsed) throw new Error('AI returned empty response');

  return {
    flowchart: typeof parsed.flowchart === 'string' ? parsed.flowchart : 'graph TD\n  Start["Start"] --> End["End"]',
    stepTrace: Array.isArray(parsed.stepTrace) ? parsed.stepTrace : [],
    callGraph: parsed.callGraph || { nodes: [], links: [] }
  };
};

export const generateVisualizationData = async (
  code,
  language = 'javascript',
  userInput = '',
  programOutput = '',
  model = 'llama-3.3-70b-versatile'
) => {
  const prompt = buildPrompt(code, language, userInput, programOutput);

  let raw;
  try {
    raw = await generateOpenRouterResponse(prompt, model);
  } catch (err) {
    console.error('[vizAI] OpenRouter call failed:', err);
    throw err;
  }

  const cleaned = stripFences(raw);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        throw new Error('AI returned malformed JSON for visualization data');
      }
    } else {
      throw new Error('AI returned no JSON for visualization data');
    }
  }

  return validateAndNormalise(parsed);
};
