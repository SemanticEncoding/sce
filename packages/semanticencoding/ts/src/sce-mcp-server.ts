#!/usr/bin/env node

/**
 * @module sce-mcp-server
 * @description
 * Model Context Protocol (MCP) server implementation for SCE (Semantic Communication Encoding).
 *
 * This server exposes SCE functionality via the MCP protocol, enabling AI assistants
 * and other MCP clients to extract, validate, and suggest semantic symbols from text.
 *
 * **Architecture:**
 * - Protocol: Model Context Protocol (MCP) over stdio transport
 * - Tools: Three registered MCP tools for symbol operations
 * - Output: Flexible formatting (auto, pretty, json, hybrid)
 * - ANSI: Optional color support for terminal-friendly output
 *
 * **Registered Tools:**
 * 1. `sce_explain` — Extract and explain SCE symbols from text
 * 2. `sce_validate_ontology` — Validate the active ontology schema
 * 3. `sce_suggest_symbols` — Suggest relevant symbols for freeform text
 *
 * **Output Formats:**
 * - `auto` — TTY-aware (pretty for terminals, JSON for pipes)
 * - `pretty` — Human-readable formatted output with optional ANSI colors
 * - `json` — Strict JSON for machine consumption
 * - `hybrid` — Pretty output + JSON detail block
 *
 * **Usage:**
 * This server is designed to be launched by MCP clients (e.g., Claude Desktop)
 * and communicates over stdio. It should not be invoked directly by end users.
 *
 * @example
 * ```json
 * // MCP client configuration (e.g., Claude Desktop config)
 * {
 *   "mcpServers": {
 *     "sce": {
 *       "command": "node",
 *       "args": ["path/to/sce-mcp-server.js"]
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link https://modelcontextprotocol.io} Model Context Protocol specification
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Adjust these imports to your layout
import {
  getDefinitionsFromText,
  validateOntology,
} from "@semanticencoding/core";

/**
 * Zod schema for output format configuration.
 *
 * Defines the structure and defaults for formatting MCP tool output.
 * Supports multiple output modes to accommodate different use cases:
 *
 * - **auto** (default) — TTY-aware formatting (pretty for terminals, JSON for pipes)
 * - **pretty** — Human-readable text with optional ANSI color codes
 * - **json** — Strict JSON for programmatic consumption
 * - **hybrid** — Combines pretty output with a JSON detail block
 *
 * The `color` option enables ANSI escape sequences when supported by the terminal.
 *
 * @example
 * ```typescript
 * const defaultFormat = OutputFormatSchema.parse({});
 * // { type: "auto", color: true }
 *
 * const jsonFormat = OutputFormatSchema.parse({ type: "json" });
 * // { type: "json", color: true }
 *
 * const noColorFormat = OutputFormatSchema.parse({ color: false });
 * // { type: "auto", color: false }
 * ```
 */
export const OutputFormatSchema = z
  .object({
    type: z
      .enum(["auto", "pretty", "json", "hybrid"])
      .default("auto")
      .describe(
        "auto = TTY → pretty, non-TTY → json; pretty = human-readable; json = strict JSON; hybrid = pretty + JSON block"
      ),
    color: z
      .boolean()
      .default(true)
      .describe("Enable ANSI color in pretty/hybrid output when supported"),
  })
  .partial()
  .default({});

/**
 * Inferred TypeScript type for output format configuration.
 *
 * Represents the parsed and validated output format options.
 *
 * @property type - Output format type (auto, pretty, json, or hybrid)
 * @property color - Whether to include ANSI color codes in output
 */
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

/**
 * Resolves the effective output format type from user configuration.
 *
 * Implements TTY-aware auto-detection for the `auto` format type:
 * - If stdout is a TTY (interactive terminal) → `pretty`
 * - Otherwise (pipes, redirects, non-TTY) → `json`
 *
 * Explicit format types (pretty, json, hybrid) are used as-is.
 *
 * @param format - Optional output format configuration
 * @returns Resolved format type (pretty, json, or hybrid)
 *
 * @example
 * ```typescript
 * // Auto mode in terminal
 * resolveFormatType({ type: "auto" }); // "pretty" (if stdout is TTY)
 *
 * // Auto mode in pipeline
 * resolveFormatType({ type: "auto" }); // "json" (if stdout is not TTY)
 *
 * // Explicit format
 * resolveFormatType({ type: "json" }); // "json"
 *
 * // Undefined (defaults to auto)
 * resolveFormatType(undefined); // "pretty" or "json" (TTY-dependent)
 * ```
 */
export function resolveFormatType(
  format: OutputFormat | undefined
): "pretty" | "json" | "hybrid" {
  const ft = format?.type ?? "auto";

  if (ft !== "auto") {
    return ft;
  }

  // auto-mode heuristic:
  // - if stdout is a TTY → pretty
  // - else → json (for pipelines / tools)
  return process.stdout.isTTY ? "pretty" : "json";
}

/**
 * Determines whether ANSI color codes should be included in output.
 *
 * Color is enabled only when:
 * 1. The `color` option is true (or defaults to true)
 * 2. stdout is a TTY (supports ANSI escape sequences)
 *
 * @param format - Optional output format configuration
 * @returns True if color should be used, false otherwise
 *
 * @example
 * ```typescript
 * // Default behavior (color enabled, TTY check)
 * shouldUseColor(undefined); // true (if stdout is TTY)
 *
 * // Explicitly disabled
 * shouldUseColor({ color: false }); // false
 *
 * // Enabled but not a TTY
 * shouldUseColor({ color: true }); // false (if stdout is not TTY)
 * ```
 */
export function shouldUseColor(format: OutputFormat | undefined): boolean {
  const color = format?.color ?? true;
  return Boolean(color && process.stdout.isTTY);
}

/**
 * Lightweight ANSI escape sequence helpers for terminal formatting.
 *
 * Provides basic text styling without external dependencies:
 * - `bold(s)` — Bold/bright text
 * - `dim(s)` — Dimmed/faint text
 * - `cyan(s)` — Cyan-colored text
 * - `yellow(s)` — Yellow-colored text
 *
 * These are only applied when color output is enabled via {@link shouldUseColor}.
 *
 * @example
 * ```typescript
 * const styled = ansi.bold("Important");
 * // "\u001b[1mImportant\u001b[22m"
 *
 * const highlighted = ansi.cyan("🔍");
 * // "\u001b[36m🔍\u001b[39m"
 * ```
 */
const ansi = {
  bold: (s: string) => `\u001b[1m${s}\u001b[22m`,
  dim: (s: string) => `\u001b[2m${s}\u001b[22m`,
  cyan: (s: string) => `\u001b[36m${s}\u001b[39m`,
  yellow: (s: string) => `\u001b[33m${s}\u001b[39m`,
};

/**
 * Renders pretty-formatted text output for symbol extraction results.
 *
 * Creates human-readable output showing:
 * - Header indicating symbols were found (or not)
 * - Original input text (dimmed when color is enabled)
 * - List of detected symbols with full metadata:
 *   - Emoji and meaning (highlighted)
 *   - Role, context, usage
 *   - Conflicts (if any)
 *   - Example usage
 *
 * @param text - Original input text that was analyzed
 * @param defs - Array of symbol definition objects from {@link getDefinitionsFromText}
 * @param useColor - Whether to include ANSI color codes
 * @returns Formatted string ready for display
 *
 * @example
 * ```typescript
 * const text = "Task 📝 is pending ⏳";
 * const defs = getDefinitionsFromText(text);
 * const output = renderPrettyExplain(text, defs, true);
 *
 * console.log(output);
 * // SCE Symbols Detected
 * //
 * // Input:
 * // Task 📝 is pending ⏳
 * //
 * // Symbols:
 * // - 📝  Actionable instruction or task that should be performed
 * //     role:    TASK
 * //     context: HUMAN, LLM, TOOL
 * //     usage:   REQUIRED
 * //     ...
 * ```
 */
export function renderPrettyExplain(
  text: string,
  defs: any[],
  useColor: boolean
): string {
  if (defs.length === 0) {
    return useColor
      ? `${ansi.bold("No SCE symbols found")} in input.\n\n${ansi.dim(text)}`
      : `No SCE symbols found in input.\n\n${text}`;
  }

  const header = useColor
    ? `${ansi.bold("SCE Symbols Detected")}\n\nInput:\n${ansi.dim(
        text
      )}\n\nSymbols:`
    : `SCE Symbols Detected\n\nInput:\n${text}\n\nSymbols:`;

  const lines: string[] = [header];

  for (const def of defs) {
    const emoji = def.emoji ?? "�";
    const meaning = def.meaning ?? "(no meaning)";
    const role = def.role ?? "";
    const ctx = Array.isArray(def.allowedContext)
      ? def.allowedContext.join(", ")
      : "";
    const usage = def.usage ?? "";
    const conflicts =
      Array.isArray(def.conflictsWith) && def.conflictsWith.length
        ? def.conflictsWith.join(" ")
        : "";
    const example = def.example ?? "";

    const titleLine = useColor
      ? `- ${ansi.cyan(emoji)}  ${ansi.bold(meaning)}`
      : `- ${emoji}  ${meaning}`;

    lines.push(titleLine);

    if (role) {
      lines.push(`    role:    ${role}`);
    }
    if (ctx) {
      lines.push(`    context: ${ctx}`);
    }
    if (usage) {
      lines.push(`    usage:   ${usage}`);
    }
    if (conflicts) {
      lines.push(
        useColor
          ? `    conflicts: ${ansi.yellow(conflicts)}`
          : `    conflicts: ${conflicts}`
      );
    }
    if (example) {
      lines.push(`    example: ${example}`);
    }
  }

  return lines.join("\n");
}

/**
 * Renders pretty-formatted text output for ontology validation results.
 *
 * Creates human-readable output showing:
 * - Validation status (OK or issues detected)
 * - List of issues (if any) with:
 *   - Issue number (highlighted in yellow when color enabled)
 *   - Error message
 *   - Path to problematic definition
 *   - Emoji and severity level (if present)
 *
 * @param issues - Array of validation issue objects from {@link validateOntology}
 * @param useColor - Whether to include ANSI color codes
 * @returns Formatted string ready for display
 *
 * @example
 * ```typescript
 * const issues = validateOntology(customOntology);
 * const output = renderPrettyValidation(issues, true);
 *
 * console.log(output);
 * // Ontology validation: issues detected
 * // #1 Missing emoji at structure.heading
 * //     path:   ["structure", "heading"]
 * //     level:  error
 * ```
 */
export function renderPrettyValidation(
  issues: any[],
  useColor: boolean
): string {
  if (!issues || issues.length === 0) {
    return useColor
      ? `${ansi.bold("Ontology validation: OK")}\nNo issues found.`
      : "Ontology validation: OK\nNo issues found.";
  }

  const header = useColor
    ? `${ansi.bold("Ontology validation: issues detected")}`
    : "Ontology validation: issues detected";

  const lines: string[] = [header];

  issues.forEach((issue: any, index: number) => {
    const prefix = useColor
      ? `${ansi.yellow(`#${index + 1}`)}`
      : `#${index + 1}`;
    lines.push(`${prefix} ${issue.message ?? "Issue"}`);

    if (issue.path) {
      lines.push(`    path:   ${JSON.stringify(issue.path)}`);
    }
    if (issue.emoji) {
      lines.push(`    emoji:  ${issue.emoji}`);
    }
    if (issue.severity) {
      lines.push(`    level:  ${issue.severity}`);
    }
  });

  return lines.join("\n");
}

/**
 * Keyword-based heuristic rules for suggesting SCE symbols.
 *
 * Each rule consists of:
 * - `emoji` — The suggested emoji symbol
 * - `role` — The category.key path in the ontology
 * - `when` — Regular expression to match against input text
 * - `reason` — Human-readable explanation for the suggestion
 *
 * Used by {@link suggestSymbolsForText} to generate context-aware symbol suggestions.
 *
 * @example
 * ```typescript
 * // Rule matching student-related language
 * {
 *   emoji: "🧑‍🎓",
 *   role: "actors.student",
 *   when: /\bstudent\b|\bstudents\b|\bpupil\b/i,
 *   reason: "Detected student-related language."
 * }
 * ```
 */
const suggestionRules: {
  emoji: string;
  role: string;
  when: RegExp;
  reason: string;
}[] = [
  {
    emoji: "🧑‍🎓",
    role: "actors.student",
    when: /\bstudent\b|\bstudents\b|\bpupil\b/i,
    reason: "Detected student-related language.",
  },
  {
    emoji: "🧑‍🏫",
    role: "actors.teacher",
    when: /\bteacher\b|\bstaff\b|\beducator\b/i,
    reason: "Detected teacher/staff-related language.",
  },
  {
    emoji: "⚖️",
    role: "legalPolicy.law",
    when: /\btitle ix\b|\bferpa\b|\blaw\b|\bpolicy\b|\bstatute\b/i,
    reason: "Detected legal / policy language.",
  },
  {
    emoji: "📌",
    role: "structure.pinned",
    when: /\bnon[- ]negotiable\b|\bkey fact\b|\bcritical fact\b/i,
    reason: "Detected strong / pinned fact phrasing.",
  },
  {
    emoji: "📝",
    role: "tasks.action",
    when: /\bmust\b|\bshould\b|\baction\b|\brequired\b/i,
    reason: "Detected required action language.",
  },
  {
    emoji: "⏳",
    role: "state.pending",
    when: /\bpending\b|\bawaiting\b|\bnot yet\b/i,
    reason: "Detected pending / incomplete state.",
  },
  {
    emoji: "⚠️",
    role: "state.warning",
    when: /\brisk\b|\bconcern\b|\bhazard\b|\bunsafe\b/i,
    reason: "Detected risk / warning language.",
  },
  {
    emoji: "❌",
    role: "state.prohibited",
    when: /\bviolation\b|\bnoncompliance\b|\bprohibited\b/i,
    reason: "Detected violation / prohibition language.",
  },
];

/**
 * Suggests SCE symbols for freeform text using keyword-based heuristics.
 *
 * Analyzes the input text against {@link suggestionRules} and returns matching
 * symbol suggestions. Deduplicates results to avoid suggesting the same symbol
 * multiple times.
 *
 * This is a simple keyword matcher and does not perform semantic analysis.
 * More sophisticated NLP-based suggestion could be implemented in the future.
 *
 * @param text - Input text to analyze for symbol suggestions
 * @returns Array of suggestion objects with emoji, role, and reason
 *
 * @example
 * ```typescript
 * const text = "The student must complete the required action.";
 * const suggestions = suggestSymbolsForText(text);
 * // [
 * //   { emoji: "🧑‍🎓", role: "actors.student", reason: "Detected student-related language." },
 * //   { emoji: "📝", role: "tasks.action", reason: "Detected required action language." }
 * // ]
 * ```
 */
export function suggestSymbolsForText(text: string) {
  const lower = text.toLowerCase();
  const suggestions: {
    emoji: string;
    role: string;
    reason: string;
  }[] = [];

  for (const rule of suggestionRules) {
    if (rule.when.test(lower)) {
      if (
        !suggestions.some((s) => s.emoji === rule.emoji && s.role === rule.role)
      ) {
        suggestions.push({
          emoji: rule.emoji,
          role: rule.role,
          reason: rule.reason,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Renders pretty-formatted text output for symbol suggestions.
 *
 * Creates human-readable output showing:
 * - Header indicating suggestions were generated (or not)
 * - Original input text (dimmed when color enabled)
 * - List of suggested symbols with:
 *   - Emoji (cyan when color enabled)
 *   - Role (category.key path)
 *   - Reason for suggestion
 *
 * @param text - Original input text that was analyzed
 * @param suggestions - Array of suggestion objects from {@link suggestSymbolsForText}
 * @param useColor - Whether to include ANSI color codes
 * @returns Formatted string ready for display
 *
 * @example
 * ```typescript
 * const text = "The student must complete the required action.";
 * const suggestions = suggestSymbolsForText(text);
 * const output = renderPrettySuggestions(text, suggestions, true);
 *
 * console.log(output);
 * // SCE Symbol Suggestions
 * //
 * // Input:
 * // The student must complete the required action.
 * //
 * // Suggestions:
 * // - 🧑‍🎓  actors.student
 * //     reason: Detected student-related language.
 * // - 📝  tasks.action
 * //     reason: Detected required action language.
 * ```
 */
export function renderPrettySuggestions(
  text: string,
  suggestions: { emoji: string; role: string; reason: string }[],
  useColor: boolean
): string {
  if (suggestions.length === 0) {
    return useColor
      ? `${ansi.bold("No SCE suggestions generated")} for input.\n\n${ansi.dim(
          text
        )}`
      : `No SCE suggestions generated for input.\n\n${text}`;
  }

  const header = useColor
    ? `${ansi.bold("SCE Symbol Suggestions")}\n\nInput:\n${ansi.dim(
        text
      )}\n\nSuggestions:`
    : `SCE Symbol Suggestions\n\nInput:\n${text}\n\nSuggestions:`;

  const lines: string[] = [header];

  for (const s of suggestions) {
    const line = useColor
      ? `- ${ansi.cyan(s.emoji)}  ${s.role}\n    reason: ${s.reason}`
      : `- ${s.emoji}  ${s.role}\n    reason: ${s.reason}`;
    lines.push(line);
  }

  return lines.join("\n");
}

/**
 * MCP server instance for SCE functionality.
 *
 * Configured with:
 * - Name: `sce-mcp-server`
 * - Version: `0.1.0`
 * - Protocol: Model Context Protocol over stdio
 *
 * Registers three tools for SCE operations:
 * 1. {@link sce_explain} — Extract and explain symbols
 * 2. {@link sce_validate_ontology} — Validate ontology schema
 * 3. {@link sce_suggest_symbols} — Suggest relevant symbols
 */
const server = new McpServer({
  name: "sce-mcp-server",
  version: "0.1.0",
});

// Reusable Zod schemas keep type inference shallow and consistent across handlers.
const ExplainInputSchema = z.object({
  text: z
    .string()
    .min(1, "Input text must not be empty")
    .describe(
      "Text that may contain SCE symbols (e.g. '📌 Fact ⏳ pending ⚠️ risk')."
    ),
  format: OutputFormatSchema.describe(
    "Optional output formatting override."
  ).optional(),
});

const ValidateInputSchema = z.object({
  format: OutputFormatSchema.describe(
    "Optional output formatting override."
  ).optional(),
});

const SuggestInputSchema = z.object({
  text: z
    .string()
    .min(1, "Input text must not be empty")
    .describe(
      "Freeform text (e.g. instructions, case notes) for which to suggest SCE annotations."
    ),
  maxSuggestions: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10)
    .describe("Maximum number of suggestions to return."),
  format: OutputFormatSchema.describe(
    "Optional output formatting override."
  ).optional(),
});

/**
 * MCP Tool: Extract and explain SCE symbols from text.
 *
 * Analyzes input text for known SCE emoji symbols and returns their
 * complete definitions including role, meaning, context, usage, conflicts,
 * and examples.
 *
 * **Input Parameters:**
 * - `text` (required) — Text containing potential SCE symbols
 * - `format` (optional) — Output formatting configuration
 *
 * **Output:**
 * Structured symbol definitions in the requested format (auto/pretty/json/hybrid).
 *
 * **Usage:**
 * This tool is invoked by MCP clients to extract semantic meaning from
 * SCE-annotated text.
 *
 * @example
 * ```json
 * // MCP tool invocation
 * {
 *   "name": "sce_explain",
 *   "arguments": {
 *     "text": "Task 📝 is pending ⏳ and requires review 🔍.",
 *     "format": { "type": "pretty", "color": true }
 *   }
 * }
 * ```
 */
export async function handleExplainTool(input: unknown) {
  const parsed = ExplainInputSchema.parse(input);

  const { text, format } = parsed;
  const symbols = getDefinitionsFromText(text);
  const payload = {
    input: text,
    symbolCount: symbols.length,
    symbols,
  };

  const fmtType = resolveFormatType(format);
  const useColor = shouldUseColor(format);

  if (fmtType === "json") {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }

  if (fmtType === "pretty") {
    const pretty = renderPrettyExplain(text, symbols, useColor);
    return {
      content: [
        {
          type: "text" as const,
          text: pretty,
        },
      ],
    };
  }

  // hybrid
  const pretty = renderPrettyExplain(text, symbols, useColor);
  const hybrid =
    `${pretty}\n\n` +
    "JSON detail:\n```json\n" +
    JSON.stringify(payload, null, 2) +
    "\n```";

  return {
    content: [
      {
        type: "text" as const,
        text: hybrid,
      },
    ],
  };
}

server.registerTool(
  "sce_explain",
  {
    description:
      "Extract and explain SCE semantic symbols from text, returning structured definitions.",
    inputSchema: ExplainInputSchema,
  },
  handleExplainTool
);

/**
 * MCP Tool: Validate the active SCE ontology schema.
 *
 * Performs comprehensive validation of the ontology structure, checking for:
 * - Missing emojis
 * - Duplicate emoji usage
 * - Empty or invalid allowedContext arrays
 * - Structural integrity
 *
 * **Input Parameters:**
 * - `format` (optional) — Output formatting configuration
 *
 * **Output:**
 * Validation results including issue count and detailed error messages
 * for any problems detected.
 *
 * **Usage:**
 * This tool is invoked by MCP clients to verify ontology correctness,
 * particularly useful during ontology development or customization.
 *
 * @example
 * ```json
 * // MCP tool invocation
 * {
 *   "name": "sce_validate_ontology",
 *   "arguments": {
 *     "format": { "type": "pretty" }
 *   }
 * }
 * ```
 */
export async function handleValidateTool(input: unknown) {
  const parsed = ValidateInputSchema.parse(input);

  const { format } = parsed;
  const issues =
    typeof validateOntology === "function" ? validateOntology() : [];

  const payload = {
    valid: issues.length === 0,
    issueCount: issues.length,
    issues,
  };

  const fmtType = resolveFormatType(format);
  const useColor = shouldUseColor(format);

  if (fmtType === "json") {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }

  if (fmtType === "pretty") {
    const pretty = renderPrettyValidation(issues, useColor);
    return {
      content: [
        {
          type: "text" as const,
          text: pretty,
        },
      ],
    };
  }

  // hybrid
  const pretty = renderPrettyValidation(issues, useColor);
  const hybrid =
    `${pretty}\n\n` +
    "JSON detail:\n```json\n" +
    JSON.stringify(payload, null, 2) +
    "\n```";

  return {
    content: [
      {
        type: "text" as const,
        text: hybrid,
      },
    ],
  };
}

server.registerTool(
  "sce_validate_ontology",
  {
    description:
      "Validate the active SCE ontology and return any structural or semantic issues.",
    inputSchema: ValidateInputSchema,
  },
  handleValidateTool
);

/**
 * MCP Tool: Suggest SCE symbols for freeform text.
 *
 * Analyzes input text using keyword-based heuristics to suggest relevant
 * SCE symbols that might apply to the content. Useful for:
 * - Assisted annotation of documents
 * - Discovery of applicable symbols
 * - Semantic enrichment workflows
 *
 * **Input Parameters:**
 * - `text` (required) — Freeform text to analyze
 * - `maxSuggestions` (optional) — Maximum suggestions to return (1-20, default: 10)
 * - `format` (optional) — Output formatting configuration
 *
 * **Output:**
 * List of suggested symbols with emoji, role path, and reason for suggestion.
 *
 * **Algorithm:**
 * Uses simple regex-based keyword matching against {@link suggestionRules}.
 * More sophisticated NLP-based approaches could be implemented in the future.
 *
 * @example
 * ```json
 * // MCP tool invocation
 * {
 *   "name": "sce_suggest_symbols",
 *   "arguments": {
 *     "text": "The student must complete the required action.",
 *     "maxSuggestions": 5,
 *     "format": { "type": "hybrid" }
 *   }
 * }
 * ```
 */
export async function handleSuggestTool(input: unknown) {
  const parsed = SuggestInputSchema.parse(input);

  const { text, maxSuggestions, format } = parsed;

  const raw = suggestSymbolsForText(text);
  const suggestions = raw.slice(0, maxSuggestions);

  const payload = {
    input: text,
    suggestionCount: suggestions.length,
    suggestions,
  };

  const fmtType = resolveFormatType(format);
  const useColor = shouldUseColor(format);

  if (fmtType === "json") {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }

  if (fmtType === "pretty") {
    const pretty = renderPrettySuggestions(text, suggestions, useColor);
    return {
      content: [
        {
          type: "text" as const,
          text: pretty,
        },
      ],
    };
  }

  // hybrid
  const pretty = renderPrettySuggestions(text, suggestions, useColor);
  const hybrid =
    `${pretty}\n\n` +
    "JSON detail:\n```json\n" +
    JSON.stringify(payload, null, 2) +
    "\n```";

  return {
    content: [
      {
        type: "text" as const,
        text: hybrid,
      },
    ],
  };
}

server.registerTool(
  "sce_suggest_symbols",
  {
    description:
      "Suggest SCE semantic symbols that might apply to the given freeform text.",
    inputSchema: SuggestInputSchema,
  },
  handleSuggestTool
);

/**
 * Main server startup and stdio transport initialization.
 *
 * Lifecycle:
 * 1. Creates stdio transport for MCP communication
 * 2. Connects the MCP server to the transport
 * 3. Logs startup message to stderr (stdout reserved for MCP protocol)
 * 4. Begins listening for MCP client requests
 *
 * **Error Handling:**
 * Fatal errors during startup cause process exit with code 1.
 *
 * **Logging:**
 * Success messages go to stderr to avoid interfering with stdio protocol.
 *
 * @async
 * @returns Promise that resolves when server is successfully started
 *
 * @example
 * ```typescript
 * // Invoked automatically when script runs
 * await main();
 * // ✨ SCE MCP server running on stdio
 * ```
 */
export async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error("✨ SCE MCP server running on stdio");
}

if (process.env.SCE_MCP_SKIP_MAIN !== "1") {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("🔥 Fatal error in SCE MCP server:", err);
    process.exit(1);
  });
}
