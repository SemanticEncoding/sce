/**
 * @module output-format.schema
 * @description
 * Zod schema and TypeScript type for MCP tool output format configuration.
 * Defines supported output modes and options for formatting tool responses.
 * This schema is used to validate and infer types for output formatting settings
 * across the SCE codebase, ensuring consistent handling of output configuration.
 * The output format configuration supports multiple modes to accommodate different
 * use cases, including TTY-aware formatting, strict JSON output, and hybrid modes.
 * 
 */

import { z } from "zod";

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
declare const OutputFormatSchema: z.ZodObject<{
  type: z.ZodEnum<["auto", "pretty", "json", "hybrid"]>;
  color: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
  type: "auto";
  color: true;
}, {
  type: "auto";
  color: true;
}>;

/**
 * Inferred TypeScript type for output format configuration.
 *
 * Represents the parsed and validated output format options.
 *
 * @property type - Output format type (auto, pretty, json, or hybrid)
 * @property color - Whether to include ANSI color codes in output
 */
declare type OutputFormat = z.infer<typeof OutputFormatSchema>;
