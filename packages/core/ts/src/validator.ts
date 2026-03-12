/**
 * @module validator
 * @description
 * Validation utilities for SCE ontology schemas.
 *
 * This module provides runtime validation to ensure ontology schemas conform to
 * structural and semantic requirements of the SCE system. Validators check for:
 * - Missing or invalid emojis
 * - Duplicate emoji usage across the ontology
 * - Empty or invalid `allowedContext` arrays
 * - Structural integrity of categories and definitions
 *
 * Validation is performed at runtime and returns human-readable error messages
 * that pinpoint exact locations of issues within the ontology structure.
 *
 * **Use Cases:**
 * - Pre-deployment validation of custom ontologies
 * - Development-time checks during ontology authoring
 * - Automated testing of ontology modifications
 * - CI/CD validation pipelines
 *
 * The validator is generic and works with any ontology conforming to {@link SceOntologyBase},
 * including the default {@link SemanticOntologySchema} and custom ontologies.
 *
 * @example
 * ```typescript
 * import { validateOntology, SemanticOntologySchema } from '@semanticencoding/core';
 *
 * // Validate the default ontology
 * const errors = validateOntology();
 * if (errors.length > 0) {
 *   console.error('Validation failed:', errors);
 * } else {
 *   console.log('Ontology is valid!');
 * }
 *
 * // Validate a custom ontology
 * const customErrors = validateOntology(myCustomOntology);
 * customErrors.forEach(err => console.error(err));
 * ```
 */

import { SemanticOntologySchema } from "./ontology";
import type {
  SceSymbolDefinition,
  SceOntologyBase,
  SceOntologyCategory,
} from "./types";

/**
 * Validates an SCE ontology schema for structural and semantic correctness.
 *
 * Performs comprehensive validation checks including:
 * - **Missing emojis** — Ensures every definition has a non-empty emoji property
 * - **Duplicate emojis** — Detects emoji reuse across different definitions
 * - **Empty allowedContext** — Verifies that allowedContext is a non-empty array
 *
 * Each error message includes the full path (`categoryName.definitionKey`) to
 * the problematic definition, making issues easy to locate and fix.
 *
 * **Validation Process:**
 * 1. Iterates through all categories in the ontology
 * 2. For each category, iterates through all symbol definitions
 * 3. Checks each definition for required properties and valid values
 * 4. Tracks emoji usage to detect duplicates
 * 5. Accumulates all errors for batch reporting
 *
 * **Default Behavior:**
 * When called with no arguments, validates the default {@link SemanticOntologySchema}.
 *
 * @template T - The ontology type extending {@link SceOntologyBase}
 * @param ontology - The ontology schema to validate (defaults to {@link SemanticOntologySchema})
 * @returns Array of error messages. Empty array indicates a valid ontology.
 *
 * @example
 * ```typescript
 * import { validateOntology } from '@semanticencoding/core';
 *
 * // Validate default ontology
 * const errors = validateOntology();
 * console.log(errors); // [] if valid
 *
 * // Validate custom ontology
 * const myOntology = {
 *   structure: {
 *     heading: {
 *       emoji: "", // Missing emoji!
 *       role: "STRUCTURE",
 *       meaning: "Heading",
 *       allowedContext: [], // Empty context!
 *       usage: "OPTIONAL",
 *       conflictsWith: [],
 *       example: "Heading example"
 *     }
 *   },
 *   // ... other categories
 * } as const satisfies SceOntologyBase;
 *
 * const customErrors = validateOntology(myOntology);
 * // [
 * //   "Missing emoji at structure.heading",
 * //   "allowedContext must be non-empty array at structure.heading"
 * // ]
 * ```
 *
 * @example
 * ```typescript
 * // Detecting duplicate emojis
 * const duplicateOntology = {
 *   structure: {
 *     first: { emoji: "🔍", role: "STRUCTURE", /* ... *\/ }
 *   },
 *   reasoning: {
 *     second: { emoji: "🔍", role: "REASONING", /* ... *\/ } // Duplicate!
 *   },
 *   // ... other categories
 * } as const satisfies SceOntologyBase;
 *
 * const errors = validateOntology(duplicateOntology);
 * // ["Duplicate emoji 🔍 at reasoning.second, already used at structure.first"]
 * ```
 *
 * @example
 * ```typescript
 * // Use in testing
 * import { validateOntology, SemanticOntologySchema } from '@semanticencoding/core';
 *
 * test('ontology is valid', () => {
 *   const errors = validateOntology(SemanticOntologySchema);
 *   expect(errors).toHaveLength(0);
 * });
 * ```
 */
export const validateOntology = <T extends Partial<SceOntologyBase>>(
  ontology: T = SemanticOntologySchema as unknown as T
): string[] => {
  const errors: string[] = [];
  const seenEmojis = new Map<string, string>(); // emoji -> "category.key"

  for (const [categoryName, category] of Object.entries(ontology) as [
    string,
    SceOntologyCategory
  ][]) {
    for (const [key, def] of Object.entries(category) as [
      string,
      SceSymbolDefinition
    ][]) {
      const path = `${categoryName}.${key}`;

      // Basic checks
      if (!def.emoji) {
        errors.push(`Missing emoji at ${path}`);
      }

      if (seenEmojis.has(def.emoji)) {
        errors.push(
          `Duplicate emoji ${def.emoji
          } at ${path}, already used at ${seenEmojis.get(def.emoji)}`
        );
      } else {
        seenEmojis.set(def.emoji, path);
      }

      if (
        !Array.isArray(def.allowedContext) ||
        def.allowedContext.length === 0
      ) {
        errors.push(`allowedContext must be non-empty array at ${path}`);
      }
    }
  }

  return errors;
};
