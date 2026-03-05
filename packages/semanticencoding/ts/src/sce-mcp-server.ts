#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { type MinimalMcpServer } from "./mcp-server.types";
import {
  OutputFormatSchema,
  type OutputFormat,
} from "./output-format.schema";

// Adjust these imports to your layout
import {
  getDefinitionsFromText,
  validateOntology,
} from "@semanticencoding/core";

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
const server: MinimalMcpServer = new McpServer({
  name: "sce-mcp-server",
  version: "0.1.0",
}) as unknown as MinimalMcpServer;

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
