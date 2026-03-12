/**
 * @module interpreter
 * @description
 * Provides runtime interpretation and lookup services for SCE (Semantic Communication Encoding) ontologies.
 *
 * This module allows you to:
 * - Build an emoji-to-definition index from any ontology conforming to {@link SceOntologyBase}
 * - Extract known SCE emojis from freeform text
 * - Retrieve symbol definitions by emoji or from text
 * - Work with a singleton default interpreter or create custom interpreters
 *
 * The default interpreter uses {@link SemanticOntologySchema} and is lazily initialized
 * for efficient reuse across the application.
 *
 * @example
 * ```typescript
 * import { interpreter, getDefinitionsFromText } from '@semanticencoding/core';
 *
 * // Use the default interpreter
 * const defs = getDefinitionsFromText('Review 🔍 the findings.');
 *
 * // Or create a custom interpreter
 * const customInterpreter = interpreter(myCustomOntology);
 * const emojis = customInterpreter.emojiFromText('Custom 🏗️ workflow');
 * ```
 */

import { SemanticOntologySchema } from "./ontology";
import { SemanticOntology, SemanticOntologyEmoji } from "./ontology-types";
import type {
  SceSymbolDefinition,
  SceOntologyBase,
  SceOntologyCategory,
  SceOntologyEmoji,
  OntologyInterpreter,
} from "./types";

/**
 * Builds a Map index from emoji strings to their symbol definitions.
 *
 * Iterates through all categories and definitions in the provided ontology,
 * creating a fast lookup structure keyed by emoji.
 *
 * @template T - The ontology type extending {@link SceOntologyBase}
 * @param ontology - The ontology schema to index
 * @returns A Map from emoji to {@link SceSymbolDefinition}
 *
 * @internal
 */
const buildEmojiIndex = <T extends SceOntologyBase>(ontology: T) => {
  const map = new Map<SceOntologyEmoji<T>, SceSymbolDefinition>();

  for (const category of Object.values(ontology) as SceOntologyCategory[]) {
    for (const def of Object.values(category) as SceSymbolDefinition[]) {
      map.set(def.emoji as SceOntologyEmoji<T>, def);
    }
  }

  return map;
};

/**
 * Type alias representing the emoji-to-definition index for a given ontology.
 *
 * This is a `Map<SceOntologyEmoji<T>, SceSymbolDefinition>` produced by {@link buildEmojiIndex}.
 *
 * @template T - The ontology type extending {@link SceOntologyBase}
 */
export type SceOntologyEmojiIndexType<T extends SceOntologyBase> = ReturnType<
  typeof buildEmojiIndex<T>
>;

/**
 * Runtime interpreter for SCE ontologies.
 *
 * Provides methods to:
 * - Look up definitions by emoji
 * - Extract emojis from text
 * - Retrieve definitions from text in a single call
 * - Copy the internal emoji index for safe mutation
 *
 * A singleton {@link Default} instance is available for the standard {@link SemanticOntology}.
 *
 * @template T - The ontology type extending {@link SceOntologyBase}
 *
 * @example
 * ```typescript
 * const interp = new SceOntologyInterpreter(SemanticOntologySchema);
 * const defs = interp.forEmojis(['🔍', '🧠']);
 * ```
 */
class SceOntologyInterpreter<T extends SceOntologyBase>
  implements OntologyInterpreter<T> {
  static #defaultInstance: SceOntologyInterpreter<SemanticOntology> | null =
    null;

  /**
   * Lazily initialized singleton interpreter for {@link SemanticOntology}.
   *
   * Use this to avoid creating multiple interpreter instances for the default schema.
   *
   * @returns The shared default interpreter instance
   */
  static get Default(): SceOntologyInterpreter<SemanticOntology> {
    if (!this.#defaultInstance) {
      this.#defaultInstance = new SceOntologyInterpreter(
        SemanticOntologySchema
      );
    }
    return this.#defaultInstance;
  }

  /**
   * Internal emoji-to-definition index built from the ontology.
   * @private
   */
  readonly #index: SceOntologyEmojiIndexType<T>;

  /**
   * Creates a new interpreter for the provided ontology.
   *
   * @param ontology - The ontology schema conforming to {@link SceOntologyBase}
   */
  constructor(ontology: T) {
    this.#index = buildEmojiIndex(ontology);
  }

  /**
   * Creates a shallow copy of the internal emoji index.
   *
   * Each definition object is shallow-copied, so the returned Map is safe to mutate
   * without affecting the interpreter's internal state.
   *
   * @returns A new Map with shallow-copied symbol definitions
   */
  copyIndex(): SceOntologyEmojiIndexType<T> {
    const source = Array.from(this.#index.entries()).map(
      ([key, category]) =>
        [key, { ...category }] as [SceOntologyEmoji<T>, SceSymbolDefinition]
    );
    return new Map(source);
  }

  /**
   * Retrieves symbol definitions for the given array of emojis.
   *
   * Unknown emojis are silently skipped. The returned array preserves the order of
   * the input emojis (excluding unknowns).
   *
   * @param emojis - Array of emoji strings to look up
   * @returns Array of {@link SceSymbolDefinition} objects for known emojis
   *
   * @example
   * ```typescript
   * const defs = interpreter.forEmojis(['🔍', '🧠', '😎']);
   * // Returns definitions for '🔍' and '🧠' if they exist; '😎' is skipped
   * ```
   */
  forEmojis(emojis: Array<SceOntologyEmoji<T>>): SceSymbolDefinition[] {
    const result: SceSymbolDefinition[] = [];

    for (const emoji of emojis) {
      const def = this.#index.get(emoji);
      if (def) {
        result.push(def);
      }
    }

    return result;
  }

  /**
   * Extracts all known emojis from the text and returns their definitions.
   *
   * This is a convenience method that combines {@link emojiFromText} and {@link forEmojis}.
   *
   * @param text - Freeform string to scan for known emojis
   * @returns Array of {@link SceSymbolDefinition} objects for all known emojis found in the text
   *
   * @example
   * ```typescript
   * const defs = interpreter.forText('Review 🔍 and analyze 🧠 the data.');
   * // Returns definitions for '🔍' and '🧠'
   * ```
   */
  forText(text: string): SceSymbolDefinition[] {
    const emojis = this.emojiFromText(text);
    return this.forEmojis(emojis);
  }

  /**
   * Scans the provided text for all known emojis in the ontology.
   *
   * Returns a deduplicated array of emoji strings found in the text.
   * The scan is performed by checking each known emoji for presence in the string,
   * which is efficient for small-to-medium ontologies.
   *
   * @param text - Freeform string to scan
   * @returns Array of unique emoji strings that appear in the text and exist in the ontology
   *
   * @example
   * ```typescript
   * const emojis = interpreter.emojiFromText('Task 📝 is pending ⏳ and pending ⏳ again.');
   * // Returns ['📝', '⏳'] (duplicates removed)
   * ```
   */
  emojiFromText(text: string): SceOntologyEmoji<T>[] {
    const found = new Set<SceOntologyEmoji<T>>();

    for (const emoji of this.#index.keys()) {
      if (text.includes(String(emoji))) {
        found.add(emoji);
      }
    }

    return Array.from(found);
  }
}

/**
 * Overload signatures for the {@link interpreter} factory function.
 *
 * @internal
 */
interface InterpreterOverloads {
  /**
   * Creates a new interpreter for a custom ontology.
   * @template T - The ontology type extending {@link SceOntologyBase}
   * @param ontology - Custom ontology schema
   * @returns A new interpreter instance
   */
  <T extends Partial<SceOntologyBase>>(ontology: T): SceOntologyInterpreter<T & SceOntologyBase>;

  /**
   * Returns the shared default interpreter for {@link SemanticOntology}.
   * @returns The singleton default interpreter
   */
  (): SceOntologyInterpreter<SemanticOntology>;
}

/**
 * Factory function to create or retrieve an SCE ontology interpreter.
 *
 * When called with no arguments, returns the singleton default interpreter
 * for {@link SemanticOntology}. When called with a custom ontology, creates
 * a new interpreter instance for that ontology.
 *
 * @template T - The ontology type extending {@link SceOntologyBase}
 * @param ontology - Optional custom ontology schema
 * @returns An interpreter instance for the specified or default ontology
 *
 * @example
 * ```typescript
 * // Get the default interpreter
 * const defaultInterp = interpreter();
 *
 * // Create a custom interpreter
 * const customInterp = interpreter(myCustomOntology);
 * ```
 */
export const interpreter: InterpreterOverloads = <
  T extends Partial<SceOntologyBase> = SemanticOntology
>(
  ontology?: T
) =>
  ontology
    ? new SceOntologyInterpreter({
      ...SemanticOntologySchema,
      ...ontology
    })
    : SceOntologyInterpreter.Default;

/**
 * Retrieves symbol definitions for an array of emojis using the default ontology.
 *
 * This is a convenience wrapper around the default interpreter's {@link SceOntologyInterpreter.forEmojis} method.
 * Unknown emojis are silently skipped.
 *
 * @param emojis - Array of {@link SemanticOntologyEmoji} strings to look up
 * @returns Array of {@link SceSymbolDefinition} objects for known emojis
 *
 * @example
 * ```typescript
 * import { getDefinitionsForEmojis } from '@semanticencoding/core';
 *
 * const defs = getDefinitionsForEmojis(['🔍', '📌']);
 * console.log(defs.map(d => d.meaning));
 * ```
 */
export const getDefinitionsForEmojis = (emojis: SemanticOntologyEmoji[]) =>
  SceOntologyInterpreter.Default.forEmojis(emojis);

/**
 * Extracts all known SCE emojis from a freeform string using the default ontology.
 *
 * This is a convenience wrapper around the default interpreter's {@link SceOntologyInterpreter.emojiFromText} method.
 * The scan is performed by checking each known emoji for presence in the string,
 * which is efficient for the typical ontology size.
 *
 * @param text - Freeform string to scan for known emojis
 * @returns Array of unique {@link SemanticOntologyEmoji} strings found in the text
 *
 * @example
 * ```typescript
 * import { extractEmojisFromText } from '@semanticencoding/core';
 *
 * const emojis = extractEmojisFromText('Review 🔍 the evidence and document 📝 findings.');
 * console.log(emojis); // ['🔍', '📝']
 * ```
 */
export const extractEmojisFromText = (text: string) =>
  SceOntologyInterpreter.Default.emojiFromText(text);

/**
 * Extracts all known emojis from text and returns their definitions in one call.
 *
 * This is a convenience wrapper around the default interpreter's {@link SceOntologyInterpreter.forText} method,
 * combining emoji extraction and definition lookup.
 *
 * @param text - Freeform string to scan for known emojis
 * @returns Array of {@link SceSymbolDefinition} objects for all known emojis found in the text
 *
 * @example
 * ```typescript
 * import { getDefinitionsFromText } from '@semanticencoding/core';
 *
 * const defs = getDefinitionsFromText('Task 📝 is pending ⏳ and requires review 🔍.');
 * defs.forEach(def => console.log(`${def.emoji}: ${def.meaning}`));
 * ```
 */
export const getDefinitionsFromText = (text: string) =>
  SceOntologyInterpreter.Default.forText(text);
