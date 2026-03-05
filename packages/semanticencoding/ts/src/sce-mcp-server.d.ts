/**
 * @module sce-mcp-server
 * @description
 * Public type declarations for the SCE MCP server runtime module.
 *
 * This declaration file intentionally carries the primary API documentation so
 * implementation code can stay focused on runtime behavior.
 */

import type { OutputFormat } from "./output-format.schema";
import type { ToolResponse } from "./mcp-server.types";

/**
 * Structured symbol suggestion generated from freeform text.
 *
 * @property emoji Suggested SCE symbol emoji.
 * @property role Ontology role path associated with the symbol (e.g. `actors.student`).
 * @property reason Human-readable explanation of why the symbol was suggested.
 */
export type SymbolSuggestion = {
    emoji: string;
    role: string;
    reason: string;
};

/**
 * Resolves an effective output format from optional user preferences.
 *
 * Behavior:
 * - `auto` resolves to `pretty` for TTY output and `json` for non-TTY output.
 * - Explicit `pretty` / `json` / `hybrid` values pass through unchanged.
 *
 * @param format Optional output-format settings.
 * @returns The resolved format used by render/response functions.
 */
export function resolveFormatType(
    format: OutputFormat | undefined
): "pretty" | "json" | "hybrid";

/**
 * Determines whether ANSI color output should be enabled.
 *
 * Color is enabled only when:
 * 1. `format.color` is truthy (or omitted, defaults to true), and
 * 2. `process.stdout` is a TTY.
 *
 * @param format Optional output-format settings.
 * @returns True when colorized output should be used.
 */
export function shouldUseColor(format: OutputFormat | undefined): boolean;

/**
 * Renders human-readable symbol explanation output.
 *
 * @param text Original analyzed input text.
 * @param defs Symbol definitions returned from ontology interpretation.
 * @param useColor Whether ANSI color formatting should be applied.
 * @returns Formatted multiline output suitable for CLI/MCP text responses.
 */
export function renderPrettyExplain(
    text: string,
    defs: unknown[],
    useColor: boolean
): string;

/**
 * Renders human-readable ontology validation output.
 *
 * @param issues Validation issues produced by ontology validation.
 * @param useColor Whether ANSI color formatting should be applied.
 * @returns Formatted multiline output for validation status and issue details.
 */
export function renderPrettyValidation(
    issues: unknown[],
    useColor: boolean
): string;

/**
 * Suggests likely SCE symbols for freeform text using lightweight heuristics.
 *
 * @param text Source text to evaluate.
 * @returns Ordered list of suggested symbols with reasons.
 */
export function suggestSymbolsForText(text: string): SymbolSuggestion[];

/**
 * Renders human-readable suggestion output.
 *
 * @param text Original analyzed input text.
 * @param suggestions Suggested symbols generated for the text.
 * @param useColor Whether ANSI color formatting should be applied.
 * @returns Formatted multiline output suitable for CLI/MCP text responses.
 */
export function renderPrettySuggestions(
    text: string,
    suggestions: SymbolSuggestion[],
    useColor: boolean
): string;

/**
 * MCP tool handler: explain detected symbols for input text.
 *
 * @param input Raw MCP tool input payload.
 * @returns Textual tool response containing formatted or JSON output.
 */
export function handleExplainTool(input: unknown): Promise<ToolResponse>;

/**
 * MCP tool handler: validate active ontology and report issues.
 *
 * @param input Raw MCP tool input payload.
 * @returns Textual tool response containing validation results.
 */
export function handleValidateTool(input: unknown): Promise<ToolResponse>;

/**
 * MCP tool handler: suggest symbols for freeform text.
 *
 * @param input Raw MCP tool input payload.
 * @returns Textual tool response containing suggestions.
 */
export function handleSuggestTool(input: unknown): Promise<ToolResponse>;

/**
 * Starts and connects the MCP server over stdio transport.
 *
 * @remarks
 * - Intended to run as a process entrypoint.
 * - Throws/rejects on startup failures; caller is expected to handle process termination.
 *
 * @returns Promise that resolves when the transport connection is established.
 */
export function main(): Promise<void>;
