/**
 * animationAI.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AI service that takes code + input + output and returns a structured
 * "animation script" JSON consumed by the Three.js CodeAnimation component.
 *
 * JSON Schema returned:
 * {
 *   title: string,
 *   language: string,
 *   summary: string,
 *   steps: AnimationStep[]
 * }
 *
 * AnimationStep:
 * {
 *   id: number,
 *   label: string,          // human-readable label for the step
 *   line: number,           // source line this step represents
 *   kind: StepKind,         // what type of animation to trigger
 *   objects: AnimObject[],  // 3D objects involved
 *   narration: string       // spoken description
 * }
 *
 * StepKind (enum):
 *   "variable_assign"   → labeled box appears, value object drops in
 *   "variable_reassign" → old object ejects, new one materialises
 *   "string_create"     → bead-chain assembles
 *   "string_mutate"     → old chain shatters, new one assembles
 *   "array_create"      → slotted shelf appears with indexed slots
 *   "array_push"        → new slot slides onto shelf end
 *   "array_pop"         → last slot falls off
 *   "array_index"       → spotlight moves to index
 *   "array_update"      → element swaps in slot
 *   "array_slice"       → blade selects sub-range, detaches
 *   "array_merge"       → two groups combine into one sorted row
 *   "tuple_create"      → locked glass case appears
 *   "tuple_unpack"      → glass shatters, objects fly out
 *   "function_call"     → new 3D stack-frame block pushed
 *   "function_return"   → stack-frame pops
 *   "loop_iteration"    → circular path / ring pulses
 *   "condition_branch"  → execution pointer forks
 *   "pointer_create"    → tether beam connects objects
 *   "pointer_null"      → beam terminates mid-air
 *   "gc_mark"           → object lights up green (referenced)
 *   "gc_sweep"          → unreferenced objects dissolve to particles
 *   "output"            → terminal panel highlights final result
 *
 * AnimObject:
 * {
 *   id: string,          // unique id for this object in the scene
 *   type: ObjectType,    // "box" | "sphere" | "bead_chain" | "shelf" | ...
 *   label: string,       // display label
 *   value: any,          // current value
 *   color: string,       // hex colour e.g. "#6366f1"
 *   position: [x,y,z],  // optional hint
 *   meta: object         // extra type-specific data
 * }
 */

import { generateOpenRouterResponse } from './openrouter';

// ─── Prompt ──────────────────────────────────────────────────────────────────

const buildPrompt = (code, language, userInput, programOutput) => `
You are a 3D code-animation director. Your job is to analyse source code and
produce a precise, step-by-step JSON animation script that a Three.js renderer
will consume to create a rich 3D visualisation of how the code executes.

━━━━━━━━━━━ SOURCE CODE (${language}) ━━━━━━━━━━━
${code}

━━━━━━━━━━━ PROGRAM INPUT ━━━━━━━━━━━
${userInput || '(none)'}

━━━━━━━━━━━ PROGRAM OUTPUT ━━━━━━━━━━━
${programOutput || '(none)'}

━━━━━━━━━━━ INSTRUCTIONS ━━━━━━━━━━━
Analyse the code above and produce a JSON object with this exact shape:

{
  "title": "<short animation title>",
  "language": "${language}",
  "summary": "<one-sentence description of what the code does>",
  "steps": [ ...AnimationStep ]
}

Each AnimationStep must have:
  "id"        : sequential integer starting at 1
  "label"     : short human label, e.g. "Assign x = 5"
  "line"      : source line number (1-based) this step relates to
  "kind"      : one of the StepKind values listed below
  "narration" : one clear sentence spoken to the user for this step
  "objects"   : array of AnimObject (the 3D objects involved in this step)

StepKind values (use EXACTLY these strings):
  variable_assign   variable_reassign   string_create     string_mutate
  array_create      array_push          array_pop         array_index
  array_update      array_slice         array_merge       tuple_create
  tuple_unpack      function_call       function_return   loop_iteration
  condition_branch  pointer_create      pointer_null      gc_mark
  gc_sweep          output

Each AnimObject must have:
  "id"       : stable string, e.g. "var_x", "arr_data", "frame_mergeSort_0"
  "type"     : one of: box | sphere | bead_chain | shelf | glass_case |
                        stack_frame | ring | fork | tether | cloud
  "label"    : display name shown on the object
  "value"    : current value (number, string, array snippet, etc.)
  "color"    : a vivid hex colour (pick different colours per type)
  "meta"     : {}  (add useful extra fields: index, depth, parentId, etc.)

COLOUR GUIDE (use these by default):
  Variables / boxes    → "#6366f1"  (indigo)
  Strings / beads      → "#8b5cf6"  (violet)
  Arrays / shelves     → "#06b6d4"  (cyan)
  Tuples / glass       → "#0ea5e9"  (sky)
  Functions / frames   → "#f59e0b"  (amber)
  Loops / rings        → "#10b981"  (emerald)
  Conditions / forks   → "#f97316"  (orange)
  Pointers / tethers   → "#ec4899"  (pink)
  GC / particles       → "#6b7280"  (gray)
  Output / terminal    → "#22c55e"  (green)

SPECIAL RULES:
1. For MERGE SORT: always produce array_create for both halves, then
   loop_iteration for comparisons, then array_merge to combine.
2. For RECURSION: each recursive call gets its own function_call step with
   meta.depth and meta.parentId linking to the caller's frame id.
3. For LOOPS: produce one loop_iteration step per iteration (cap at 20 for
   large loops — summarise remaining with a single step).
4. For CONDITIONS: always include a condition_branch step with
   meta.condition (the expression), meta.result (true/false), and
   meta.takenBranch ("then" or "else").
5. Produce the FINAL output step with kind "output" showing the result.
6. Minimum 8 steps, maximum 60 steps.
7. Respond with ONLY valid JSON — no markdown, no explanation, no code fences.
`;

// ─── Parse / Validate ────────────────────────────────────────────────────────

/**
 * Ensure every step has the required fields and sensible defaults.
 */
const validateAndNormalise = (parsed) => {
  if (!parsed || !Array.isArray(parsed.steps)) {
    throw new Error('AI returned invalid animation JSON: missing steps array');
  }

  parsed.steps = parsed.steps.map((step, i) => ({
    id: step.id ?? i + 1,
    label: step.label ?? `Step ${i + 1}`,
    line: step.line ?? 0,
    kind: step.kind ?? 'variable_assign',
    narration: step.narration ?? '',
    objects: (step.objects ?? []).map(obj => ({
      id: obj.id ?? `obj_${i}_${Math.random().toString(36).slice(2, 6)}`,
      type: obj.type ?? 'box',
      label: obj.label ?? '',
      value: obj.value ?? null,
      color: obj.color ?? '#6366f1',
      position: obj.position ?? [0, 0, 0],
      meta: obj.meta ?? {},
    })),
  }));

  return parsed;
};

// ─── Strip possible markdown fences ──────────────────────────────────────────

const stripFences = (raw) => {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * generateAnimationScript
 * @param {string} code          - Source code to animate
 * @param {string} language      - Language name: javascript | python | cpp | java
 * @param {string} userInput     - stdin / user input supplied to the program
 * @param {string} programOutput - stdout / result of running the program
 * @param {string} [model]       - OpenRouter model id (default: gemini flash)
 * @returns {Promise<AnimationScript>}
 */
export const generateAnimationScript = async (
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
    console.error('[animationAI] OpenRouter call failed:', err);
    throw err;
  }

  // Strip any accidental markdown fences
  const cleaned = stripFences(raw);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract the first JSON object from within the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.error('[animationAI] Failed to parse extracted JSON:', match[0].slice(0, 300));
        throw new Error('AI returned malformed JSON for animation script');
      }
    } else {
      console.error('[animationAI] No JSON found in response:', cleaned.slice(0, 300));
      throw new Error('AI returned no JSON for animation script');
    }
  }

  return validateAndNormalise(parsed);
};

// ─── Fallback / Demo script (used when AI is unavailable) ────────────────────

/**
 * Returns a hardcoded demo animation for merge sort so the renderer
 * always has something to show even without an API call.
 */
export const getMergeSortDemoScript = () => ({
  title: 'Merge Sort — Demo Animation',
  language: 'javascript',
  summary: 'Divides an array in half recursively, then merges sorted halves.',
  steps: [
    {
      id: 1, line: 1, kind: 'function_call', label: 'Call mergeSort([38,27,43,3])',
      narration: 'mergeSort is called with the full array. A new stack frame is pushed.',
      objects: [{
        id: 'frame_0', type: 'stack_frame', label: 'mergeSort', color: '#f59e0b',
        value: [38, 27, 43, 3], meta: { depth: 0 }
      }]
    },
    {
      id: 2, line: 3, kind: 'array_create', label: 'Create left half [38,27]',
      narration: 'The array is split at the midpoint. Left half: [38, 27].',
      objects: [{
        id: 'arr_left_0', type: 'shelf', label: 'left', color: '#06b6d4',
        value: [38, 27], meta: { slots: [38, 27] }
      }]
    },
    {
      id: 3, line: 4, kind: 'array_create', label: 'Create right half [43,3]',
      narration: 'Right half: [43, 3]. Both halves slide apart on the shelf.',
      objects: [{
        id: 'arr_right_0', type: 'shelf', label: 'right', color: '#06b6d4',
        value: [43, 3], meta: { slots: [43, 3] }
      }]
    },
    {
      id: 4, line: 3, kind: 'function_call', label: 'Recurse on [38,27]',
      narration: 'mergeSort recurses on the left half. A second frame is pushed on the stack.',
      objects: [{
        id: 'frame_1', type: 'stack_frame', label: 'mergeSort', color: '#f59e0b',
        value: [38, 27], meta: { depth: 1, parentId: 'frame_0' }
      }]
    },
    {
      id: 5, line: 2, kind: 'condition_branch', label: 'Base case? length <= 1',
      narration: 'length is 2, not ≤ 1, so we continue splitting.',
      objects: [{
        id: 'fork_1', type: 'fork', label: 'len ≤ 1?', color: '#f97316',
        value: false, meta: { condition: 'arr.length <= 1', result: false, takenBranch: 'else' }
      }]
    },
    {
      id: 6, line: 8, kind: 'loop_iteration', label: 'Compare 38 vs 27',
      narration: 'In the merge step, 38 and 27 are compared. 27 is smaller and moves first.',
      objects: [
        { id: 'ring_cmp_0', type: 'ring', label: 'i=0', color: '#10b981', value: null, meta: { i: 38, j: 27 } }
      ]
    },
    {
      id: 7, line: 10, kind: 'array_merge', label: 'Merge → [27,38]',
      narration: 'The two single-element halves are merged into sorted [27, 38].',
      objects: [{
        id: 'arr_merged_1', type: 'shelf', label: 'merged', color: '#22c55e',
        value: [27, 38], meta: { slots: [27, 38] }
      }]
    },
    {
      id: 8, line: 3, kind: 'function_call', label: 'Recurse on [43,3]',
      narration: 'mergeSort now recurses on the right half [43, 3].',
      objects: [{
        id: 'frame_2', type: 'stack_frame', label: 'mergeSort', color: '#f59e0b',
        value: [43, 3], meta: { depth: 1, parentId: 'frame_0' }
      }]
    },
    {
      id: 9, line: 8, kind: 'loop_iteration', label: 'Compare 43 vs 3',
      narration: '3 is smaller than 43: it goes first into the result array.',
      objects: [
        { id: 'ring_cmp_1', type: 'ring', label: 'i=0', color: '#10b981', value: null, meta: { i: 43, j: 3 } }
      ]
    },
    {
      id: 10, line: 10, kind: 'array_merge', label: 'Merge → [3,43]',
      narration: 'Right half merged into [3, 43].',
      objects: [{
        id: 'arr_merged_2', type: 'shelf', label: 'merged', color: '#22c55e',
        value: [3, 43], meta: { slots: [3, 43] }
      }]
    },
    {
      id: 11, line: 10, kind: 'array_merge', label: 'Final merge → [3,27,38,43]',
      narration: 'Both sorted halves are merged. The sorted array [3,27,38,43] materialises.',
      objects: [{
        id: 'arr_final', type: 'shelf', label: 'result', color: '#22c55e',
        value: [3, 27, 38, 43], meta: { slots: [3, 27, 38, 43] }
      }]
    },
    {
      id: 12, line: 0, kind: 'output', label: 'Output: [3,27,38,43]',
      narration: 'Merge sort complete! The array is fully sorted in ascending order.',
      objects: [{
        id: 'output_terminal', type: 'sphere', label: 'Output', color: '#22c55e',
        value: [3, 27, 38, 43], meta: {}
      }]
    }
  ]
});
