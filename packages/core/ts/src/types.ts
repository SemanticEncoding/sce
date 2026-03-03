/**
 * @module types
 * @description
 * Core TypeScript type definitions for the SCE (Semantic Communication Encoding) system.
 *
 * This module provides the foundational type system that supports the SCE ontology framework,
 * including:
 * - **Base types** — Role, context, and usage discriminators
 * - **Definition interfaces** — Structure for symbol definitions and ontology categories
 * - **Generic type utilities** — Type-level operations for extracting emojis, categories, and definitions
 * - **Runtime interfaces** — Contracts for interpreter implementations
 *
 * These types enable:
 * - Compile-time validation of ontology schemas
 * - Type-safe emoji extraction and definition lookup
 * - Custom ontology creation with full type inference
 * - Strong typing for interpreter implementations
 *
 * The type system is designed to be generic, allowing any ontology conforming to
 * {@link SceOntologyBase} to benefit from the full suite of type-level utilities.
 *
 * @example
 * ```typescript
 * import type {
 *   SceOntologyBase,
 *   SceSymbolDefinition,
 *   SceOntologyEmoji
 * } from '@semanticencoding/core';
 *
 * // Define a custom ontology with full type safety
 * const myOntology = {
 *   structure: {
 *     heading: {
 *       emoji: "📌",
 *       role: "STRUCTURE",
 *       meaning: "Heading marker",
 *       allowedContext: ["HUMAN", "LLM"],
 *       usage: "REQUIRED",
 *       conflictsWith: [],
 *       example: "📌 Section 1"
 *     }
 *   },
 *   // ... other categories
 * } as const satisfies SceOntologyBase;
 *
 * // Extract emoji type
 * type MyEmoji = SceOntologyEmoji<typeof myOntology>;
 * ```
 */

/**
 * Discriminated union of all valid role categories in the SCE system.
 *
 * Roles categorize symbols by their functional purpose:
 * - `STRUCTURE` — Document organization and layout
 * - `LEGAL` — Legal frameworks, citations, and compliance
 * - `REASONING` — Analysis, insights, and investigations
 * - `TASK` — Actionable items and task tracking
 * - `PRIVACY` — Data sensitivity and access control
 * - `ACTOR` — People, roles, and organizations
 * - `STATE` — Process states and status indicators
 * - `CONTROL` — Workflow navigation and branching
 *
 * @example
 * ```typescript
 * const role: SceRole = "REASONING";
 * // const invalid: SceRole = "INVALID"; // TypeScript error
 * ```
 */
export type SceRole =
  | "STRUCTURE"
  | "LEGAL"
  | "REASONING"
  | "TASK"
  | "PRIVACY"
  | "ACTOR"
  | "STATE"
  | "CONTROL"
  | "TRACE"
  | "TEMPORAL"
  | "CONSTRAINT"
  | "INTEGRITY"
  | "RETRIEVAL";

/**
 * Discriminated union of valid execution contexts for SCE symbols.
 *
 * Contexts specify where a symbol can be appropriately used:
 * - `HUMAN` — Human-authored content (documents, prompts, notes)
 * - `LLM` — LLM-generated or LLM-processed content
 * - `TOOL` — Tool-generated or system-generated content
 *
 * Symbols may be valid in multiple contexts, specified via the
 * {@link SceSymbolDefinition.allowedContext} array.
 *
 * @example
 * ```typescript
 * const context: SceContext = "LLM";
 * const allowedContexts: SceContext[] = ["HUMAN", "LLM", "TOOL"];
 * ```
 */
export type SceContext = "HUMAN" | "LLM" | "TOOL";

/**
 * Discriminated union indicating the usage requirement level for a symbol.
 *
 * Usage levels specify when a symbol must, may, or conditionally should be used:
 * - `REQUIRED` — Symbol must always be used in applicable contexts
 * - `OPTIONAL` — Symbol may be used but is not mandatory
 * - `CONDITIONAL` — Symbol usage depends on specific conditions or scenarios
 *
 * @example
 * ```typescript
 * const usage: SceUsage = "CONDITIONAL";
 *
 * // In symbol definitions
 * const actionDef = {
 *   emoji: "📝",
 *   role: "TASK",
 *   usage: "REQUIRED" as SceUsage,
 *   // ...
 * };
 * ```
 */
export type SceUsage = "REQUIRED" | "OPTIONAL" | "CONDITIONAL";

/**
 * Complete definition of a single SCE symbol.
 *
 * Each symbol is defined by:
 * - **emoji** — The Unicode emoji representing the symbol
 * - **role** — The functional category ({@link SceRole})
 * - **meaning** — Human-readable description of the symbol's purpose
 * - **allowedContext** — Array of valid execution contexts ({@link SceContext}[])
 * - **usage** — Requirement level ({@link SceUsage})
 * - **conflictsWith** — Array of emoji strings that should not co-occur with this symbol
 * - **example** — Real-world usage example demonstrating the symbol in context
 *
 * Symbol definitions are the atomic units of an SCE ontology, providing rich metadata
 * for validation, interpretation, and usage guidance.
 *
 * @example
 * ```typescript
 * const analyzeSymbol: SceSymbolDefinition = {
 *   emoji: "🔍",
 *   role: "REASONING",
 *   meaning: "Analysis, search, or inspection of facts or records",
 *   allowedContext: ["HUMAN", "LLM", "TOOL"],
 *   usage: "OPTIONAL",
 *   conflictsWith: ["✅", "☑️"],
 *   example: "🔍 Verify whether all witnesses were interviewed."
 * };
 * ```
 */
export interface SceSymbolDefinition {
  emoji: string;
  role: SceRole;
  meaning: string;
  allowedContext: SceContext[];
  usage: SceUsage;
  conflictsWith: string[];
  example: string;
}

/**
 * A category within an SCE ontology, mapping definition keys to symbol definitions.
 *
 * Categories group related symbols by functional purpose (e.g., "reasoning", "tasks", "actors").
 * This is a flexible index signature allowing arbitrary definition keys.
 *
 * @example
 * ```typescript
 * const reasoningCategory: SceOntologyCategory = {
 *   analyze: {
 *     emoji: "🔍",
 *     role: "REASONING",
 *     meaning: "Analysis or inspection",
 *     allowedContext: ["HUMAN", "LLM"],
 *     usage: "OPTIONAL",
 *     conflictsWith: [],
 *     example: "🔍 Review the evidence"
 *   },
 *   insight: {
 *     emoji: "🧠",
 *     role: "REASONING",
 *     meaning: "Reasoning or interpretation",
 *     allowedContext: ["HUMAN", "LLM"],
 *     usage: "OPTIONAL",
 *     conflictsWith: [],
 *     example: "🧠 The delay suggests non-compliance"
 *   }
 * };
 * ```
 */
export interface SceOntologyCategory {
  [key: string]: SceSymbolDefinition;
}

const BaseOntologyCategoryKeyValues = [
  "structure",
  "legalPolicy",
  "reasoning",
  "tasks",
  "privacy",
  "actors",
  "state",
  "control",
  "traceability",
  "temporal",
  "constraints",
  "integrity",
  "retrieval",
] as const;

export type BaseOntologyCategoryKey = typeof BaseOntologyCategoryKeyValues[number];

/**
 * Base structure for a complete SCE ontology.
 *
 * All SCE ontologies must conform to this eight-category structure:
 * - **structure** — Document organization and layout
 * - **legalPolicy** — Legal frameworks, citations, and compliance
 * - **reasoning** — Analysis, insights, and investigations
 * - **tasks** — Actionable items and task tracking
 * - **privacy** — Data sensitivity and access control
 * - **actors** — People, roles, and organizations
 * - **state** — Process states and status indicators
 * - **control** — Workflow navigation and branching
 *
 * Each category is a {@link SceOntologyCategory} containing one or more symbol definitions.
 *
 * Use `as const satisfies SceOntologyBase` when declaring ontology schemas to ensure:
 * - Strict literal type inference for emojis and keys
 * - Compile-time validation of structure
 * - Type-safe access throughout the system
 *
 * @example
 * ```typescript
 * const myOntology = {
 *   structure: {
 *     section: { emoji: "📂", role: "STRUCTURE", /* ... *\/ }
 *   },
 *   legalPolicy: {
 *     law: { emoji: "⚖️", role: "LEGAL", /* ... *\/ }
 *   },
 *   reasoning: {
 *     analyze: { emoji: "🔍", role: "REASONING", /* ... *\/ }
 *   },
 *   tasks: {
 *     action: { emoji: "📝", role: "TASK", /* ... *\/ }
 *   },
 *   privacy: {
 *     private: { emoji: "🔐", role: "PRIVACY", /* ... *\/ }
 *   },
 *   actors: {
 *     generic: { emoji: "👤", role: "ACTOR", /* ... *\/ }
 *   },
 *   state: {
 *     pending: { emoji: "⏳", role: "STATE", /* ... *\/ }
 *   },
 *   control: {
 *     next: { emoji: "⏭️", role: "CONTROL", /* ... *\/ }
 *   }
 * } as const satisfies SceOntologyBase;
 * ```
 */
export type SceOntologyBase = {
  [K in BaseOntologyCategoryKey]: SceOntologyCategory;
};

/**
 * Extracts the union of category keys from an ontology.
 *
 * For the standard {@link SceOntologyBase}, this resolves to:
 * `"structure" | "legalPolicy" | "reasoning" | "tasks" | "privacy" | "actors" | "state" | "control"`
 *
 * @template TOntology - The ontology type extending {@link SceOntologyBase}
 *
 * @example
 * ```typescript
 * import type { SceOntologyCategoryKey, SceOntologyBase } from '@semanticencoding/core';
 *
 * type CategoryKeys = SceOntologyCategoryKey<SceOntologyBase>;
 * // "structure" | "legalPolicy" | "reasoning" | ...
 *
 * const key: CategoryKeys = "reasoning"; // OK
 * // const invalid: CategoryKeys = "invalid"; // TypeScript error
 * ```
 */
export type SceOntologyCategoryKey<
  TOntology extends Partial<SceOntologyBase> = SceOntologyBase
> = keyof TOntology;

/**
 * Extracts the definition object type for a specific category in an ontology.
 *
 * Given an ontology and a category key, this type resolves to the nested object
 * containing all symbol definitions within that category.
 *
 * @template TOntology - The ontology type extending {@link SceOntologyBase}
 * @template CategoryKey - A valid category key from {@link SceOntologyCategoryKey}
 *
 * @example
 * ```typescript
 * import type { SceOntologyCategoryDefinitionType } from '@semanticencoding/core';
 * import { SemanticOntologySchema } from '@semanticencoding/core';
 *
 * type ReasoningDefs = SceOntologyCategoryDefinitionType<
 *   typeof SemanticOntologySchema,
 *   "reasoning"
 * >;
 * // { analyze: {...}, insight: {...}, investigate: {...} }
 *
 * const defs: ReasoningDefs = SemanticOntologySchema.reasoning;
 * ```
 */
export type SceOntologyCategoryDefinitionType<
  TOntology extends SceOntologyBase,
  CategoryKey extends SceOntologyCategoryKey<TOntology>
> = Pick<TOntology, CategoryKey>[CategoryKey];

/**
 * Builds a nested emoji map structure from an ontology type.
 *
 * This mapped type transforms an ontology into a structure where:
 * - Top level: category keys (e.g., `"reasoning"`, `"tasks"`)
 * - Second level: definition keys within each category (e.g., `"analyze"`, `"action"`)
 * - Leaf values: the literal emoji string types
 *
 * Used internally to extract emoji types from ontology schemas.
 *
 * @template TOntology - The ontology type extending {@link SceOntologyBase}
 *
 * @example
 * ```typescript
 * import type { SceOntologyEmojiMap } from '@semanticencoding/core';
 * import { SemanticOntologySchema } from '@semanticencoding/core';
 *
 * type EmojiMap = SceOntologyEmojiMap<typeof SemanticOntologySchema>;
 * // {
 * //   reasoning: { analyze: "🔍", insight: "🧠", investigate: "🕵️" },
 * //   tasks: { action: "📝", todo: "☐", complete: "✅", ... },
 * //   ...
 * // }
 *
 * type AnalyzeEmoji = EmojiMap['reasoning']['analyze']; // "🔍"
 * ```
 */
export type SceOntologyEmojiMap<TOntology extends SceOntologyBase> = {
  [CategoryKey in SceOntologyCategoryKey<TOntology>]: {
    [DefinitionKey in keyof SceOntologyCategoryDefinitionType<
      TOntology,
      CategoryKey
    >]: SceOntologyCategoryDefinitionType<
      TOntology,
      CategoryKey
    >[DefinitionKey] extends {
      emoji: infer E;
    }
    ? E
    : never;
  };
};

/**
 * Maps each category to a union of its emoji strings.
 *
 * This intermediate type converts the nested {@link SceOntologyEmojiMap} structure
 * into a simpler category-to-emoji-union mapping.
 *
 * Used internally to construct {@link SceOntologyEmoji}.
 *
 * @template TOntology - The ontology type extending {@link SceOntologyBase}
 *
 * @example
 * ```typescript
 * import type { SceOntologyCategoryEmojiMap } from '@semanticencoding/core';
 * import { SemanticOntologySchema } from '@semanticencoding/core';
 *
 * type CategoryEmojiMap = SceOntologyCategoryEmojiMap<typeof SemanticOntologySchema>;
 * // {
 * //   reasoning: "🔍" | "🧠" | "🕵️",
 * //   tasks: "📝" | "☐" | "☑️" | "✅" | "🔁",
 * //   ...
 * // }
 *
 * type ReasoningEmojis = CategoryEmojiMap['reasoning']; // "🔍" | "🧠" | "🕵️"
 * ```
 */
export type SceOntologyCategoryEmojiMap<TOntology extends Partial<SceOntologyBase>> = {
  [CategoryKey in SceOntologyCategoryKey<TOntology>]: SceOntologyEmojiMap<TOntology & SceOntologyBase>[CategoryKey][keyof SceOntologyEmojiMap<TOntology & SceOntologyBase>[CategoryKey]];
};

/**
 * Extracts the union of emoji strings for a specific category.
 *
 * Given an ontology and a category key, this type resolves to a union of all
 * emoji literal strings defined in that category.
 *
 * @template TOntology - The ontology type extending {@link SceOntologyBase}
 * @template CategoryKey - A valid category key from {@link SceOntologyCategoryKey}
 *
 * @example
 * ```typescript
 * import type { SceOntologyCategoryEmoji } from '@semanticencoding/core';
 * import { SemanticOntologySchema } from '@semanticencoding/core';
 *
 * type ReasoningEmoji = SceOntologyCategoryEmoji<
 *   typeof SemanticOntologySchema,
 *   "reasoning"
 * >;
 * // "🔍" | "🧠" | "🕵️"
 *
 * const emoji: ReasoningEmoji = "🔍"; // OK
 * // const invalid: ReasoningEmoji = "📝"; // TypeScript error (task emoji)
 * ```
 */
export type SceOntologyCategoryEmoji<
  TOntology extends SceOntologyBase,
  CategoryKey extends SceOntologyCategoryKey<TOntology>
> = SceOntologyEmojiMap<TOntology>[CategoryKey][keyof SceOntologyEmojiMap<TOntology>[CategoryKey]];

/**
 * The union of all emoji strings across all categories in an ontology.
 *
 * This is the most commonly used emoji type, representing any valid emoji
 * defined anywhere in the ontology.
 *
 * Constructed by unioning all category-specific emoji types from {@link SceOntologyCategoryEmojiMap}.
 *
 * @template TOntology - The ontology type extending {@link SceOntologyBase}
 *
 * @example
 * ```typescript
 * import type { SceOntologyEmoji } from '@semanticencoding/core';
 * import { SemanticOntologySchema } from '@semanticencoding/core';
 *
 * type AnyEmoji = SceOntologyEmoji<typeof SemanticOntologySchema>;
 * // "🔍" | "🧠" | "🕵️" | "📝" | "☐" | "✅" | "👤" | "⏳" | ... (all emojis)
 *
 * const emoji: AnyEmoji = "🔍"; // OK
 * const another: AnyEmoji = "📝"; // OK
 * // const invalid: AnyEmoji = "😀"; // TypeScript error if not in ontology
 *
 * // Use in function signatures
 * function processEmoji(emoji: AnyEmoji) {
 *   // Type-safe handling of any ontology emoji
 * }
 * ```
 */
export type SceOntologyEmoji<TOntology extends Partial<SceOntologyBase> = SceOntologyBase> =
  SceOntologyCategoryEmojiMap<TOntology & SceOntologyBase>[SceOntologyCategoryKey<TOntology & SceOntologyBase>];

/**
 * Runtime interface for an ontology interpreter implementation.
 *
 * Defines the contract for classes that provide emoji lookup, text extraction,
 * and definition retrieval services for an SCE ontology.
 *
 * Implementations should:
 * - Build an internal emoji-to-definition index for fast lookups
 * - Support querying by emoji arrays
 * - Extract known emojis from freeform text
 * - Combine extraction and lookup in a single operation
 *
 * @template T - The ontology type extending {@link SceOntologyBase}
 *
 * @see {@link SceOntologyInterpreter} for the canonical implementation
 *
 * @example
 * ```typescript
 * import type { OntologyInterpreter, SceOntologyBase } from '@semanticencoding/core';
 *
 * class MyInterpreter<T extends SceOntologyBase>
 *   implements OntologyInterpreter<T>
 * {
 *   forEmojis(emojis: Array<SceOntologyEmoji<T>>) {
 *     // Return definitions for the given emojis
 *     return [];
 *   }
 *
 *   forText(text: string) {
 *     // Extract emojis from text and return their definitions
 *     return [];
 *   }
 *
 *   emojiFromText(text: string) {
 *     // Extract known emojis from text
 *     return [];
 *   }
 * }
 * ```
 */
export interface OntologyInterpreter<T extends SceOntologyBase> {
  /**
   * Retrieves symbol definitions for the given array of emojis.
   *
   * @param emojis - Array of emoji strings to look up
   * @returns Array of {@link SceSymbolDefinition} objects for known emojis
   */
  forEmojis(emojis: Array<SceOntologyEmoji<T>>): SceSymbolDefinition[];

  /**
   * Extracts all known emojis from text and returns their definitions.
   *
   * @param text - Freeform string to scan for known emojis
   * @returns Array of {@link SceSymbolDefinition} objects
   */
  forText(text: string): SceSymbolDefinition[];

  /**
   * Scans text for all known emojis in the ontology.
   *
   * @param text - Freeform string to scan
   * @returns Array of unique emoji strings found in the text
   */
  emojiFromText(text: string): SceOntologyEmoji<T>[];
}
