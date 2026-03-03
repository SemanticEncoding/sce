import {
  interpreter,
  getDefinitionsForEmojis,
  extractEmojisFromText,
  getDefinitionsFromText,
} from "../src/interpreter";
import { SemanticOntologySchema } from "../src/ontology";
import type { SemanticOntologyEmoji } from "../src/ontology-types";
import type { SceOntologyBase, SceOntologyEmoji } from "../src/types";

const ANALYZE_EMOJI: SemanticOntologyEmoji = "🔍";
const INSIGHT_EMOJI: SemanticOntologyEmoji = "🧠";

const defaultInterpreter = interpreter();

describe("interpreter default instance", () => {
  it("returns a shared instance when no ontology is provided", () => {
    expect(defaultInterpreter).toBe(interpreter());
  });

  it("creates a fresh interpreter when an ontology is provided", () => {
    const provided = interpreter(SemanticOntologySchema);
    expect(provided).not.toBe(defaultInterpreter);
    const defs = provided.forEmojis([ANALYZE_EMOJI]);
    expect(defs).toHaveLength(1);
    expect(defs[0].emoji).toBe(ANALYZE_EMOJI);
  });
});

describe("forEmojis", () => {
  it("returns definitions in input order while skipping unknown emojis", () => {
    const defs = defaultInterpreter.forEmojis([
      ANALYZE_EMOJI,
      "😎" as unknown as SemanticOntologyEmoji,
      INSIGHT_EMOJI,
    ]);

    expect(defs.map((def) => def.emoji)).toEqual([
      ANALYZE_EMOJI,
      INSIGHT_EMOJI,
    ]);
  });

  it("returns the same definition instance for duplicate emojis", () => {
    const defs = defaultInterpreter.forEmojis([ANALYZE_EMOJI, ANALYZE_EMOJI]);

    expect(defs).toHaveLength(2);
    expect(defs[0]).toBe(defs[1]);
  });
});

describe("emojiFromText", () => {
  it("extracts unique emojis that are present in the text", () => {
    const text =
      "First " +
      INSIGHT_EMOJI +
      " then " +
      ANALYZE_EMOJI +
      " and " +
      ANALYZE_EMOJI +
      " again.";
    const emojis = defaultInterpreter.emojiFromText(text);

    expect(emojis).toEqual(
      expect.arrayContaining([INSIGHT_EMOJI, ANALYZE_EMOJI])
    );
    expect(new Set(emojis).size).toBe(2);
  });

  it("returns an empty array when no known emoji are present", () => {
    expect(defaultInterpreter.emojiFromText("No symbols here")).toEqual([]);
  });
});

describe("forText", () => {
  it("returns definitions for each unique emoji discovered in the text", () => {
    const text =
      "Mixing " +
      ANALYZE_EMOJI +
      " investigation with " +
      INSIGHT_EMOJI +
      " insights.";
    const defs = defaultInterpreter.forText(text);
    const emojis = defs.map((def) => def.emoji);

    expect(emojis).toEqual(
      expect.arrayContaining([ANALYZE_EMOJI, INSIGHT_EMOJI])
    );
    expect(new Set(emojis).size).toBe(2);
  });

  it("returns an empty array when no known emoji are present", () => {
    expect(defaultInterpreter.forText("Plain text only")).toEqual([]);
  });
});

describe("copyIndex", () => {
  it("returns an independent map copy", () => {
    const indexCopy = defaultInterpreter.copyIndex();
    expect(indexCopy.size).toBeGreaterThan(0);

    const original = defaultInterpreter.forEmojis([ANALYZE_EMOJI])[0];
    const originalMeaning = original.meaning;

    const copiedDefinition = indexCopy.get(ANALYZE_EMOJI);
    expect(copiedDefinition).toBeDefined();

    if (!copiedDefinition) {
      throw new Error("Expected copied definition");
    }

    copiedDefinition.meaning = "Modified meaning";
    indexCopy.clear();

    const unchanged = defaultInterpreter.forEmojis([ANALYZE_EMOJI])[0];
    expect(unchanged.meaning).toBe(originalMeaning);
    expect(defaultInterpreter.forEmojis([ANALYZE_EMOJI])).toHaveLength(1);
  });
});

describe("utility helpers", () => {
  it("getDefinitionsForEmojis delegates to the default interpreter", () => {
    const defs = getDefinitionsForEmojis([ANALYZE_EMOJI]);
    expect(defs).toHaveLength(1);
    expect(defs[0].emoji).toBe(ANALYZE_EMOJI);
  });

  it("extractEmojisFromText returns all known emojis in the text", () => {
    const text =
      "Noise " +
      ANALYZE_EMOJI +
      " then " +
      INSIGHT_EMOJI +
      " and repeat " +
      ANALYZE_EMOJI +
      ".";
    const emojis = extractEmojisFromText(text);

    expect(emojis).toEqual(
      expect.arrayContaining([ANALYZE_EMOJI, INSIGHT_EMOJI])
    );
    expect(new Set(emojis).size).toBe(2);
  });

  it("getDefinitionsFromText returns definitions for emojis found in text", () => {
    const text =
      "Include " + ANALYZE_EMOJI + " and " + INSIGHT_EMOJI + " in a report.";
    const defs = getDefinitionsFromText(text);

    expect(defs.map((def) => def.emoji)).toEqual(
      expect.arrayContaining([ANALYZE_EMOJI, INSIGHT_EMOJI])
    );
  });
});

describe("custom ontology interpreters", () => {
  const customOntology: Partial<SceOntologyBase> = {
    structure: {
      block: {
        emoji: "🏗️",
        role: "STRUCTURE",
        meaning: "Custom structure",
        allowedContext: ["HUMAN"],
        usage: "OPTIONAL",
        conflictsWith: [],
        example: "🏗️ Outline the sections.",
      },
    },
    legalPolicy: {
      rule: {
        emoji: "📘",
        role: "LEGAL",
        meaning: "Custom policy",
        allowedContext: ["HUMAN"],
        usage: "OPTIONAL",
        conflictsWith: [],
        example: "📘 Review policy document.",
      },
    },
    reasoning: {
      evaluate: {
        emoji: "🧮",
        role: "REASONING",
        meaning: "Evaluate data",
        allowedContext: ["LLM"],
        usage: "CONDITIONAL",
        conflictsWith: [],
        example: "🧮 Compare metrics.",
      },
    },
    tasks: {
      perform: {
        emoji: "🪜",
        role: "TASK",
        meaning: "Complete steps",
        allowedContext: ["HUMAN", "LLM"],
        usage: "REQUIRED",
        conflictsWith: [],
        example: "🪜 Finish checklist.",
      },
    },
    privacy: {
      secure: {
        emoji: "🛡️",
        role: "PRIVACY",
        meaning: "Secure data",
        allowedContext: ["HUMAN"],
        usage: "CONDITIONAL",
        conflictsWith: [],
        example: "🛡️ Protect the dataset.",
      },
    },
    actors: {
      agent: {
        emoji: "🧑‍💼",
        role: "ACTOR",
        meaning: "Assigned staff",
        allowedContext: ["HUMAN"],
        usage: "OPTIONAL",
        conflictsWith: [],
        example: "🧑‍💼 Assign coordinator.",
      },
    },
    state: {
      active: {
        emoji: "🟢",
        role: "STATE",
        meaning: "Active state",
        allowedContext: ["HUMAN"],
        usage: "CONDITIONAL",
        conflictsWith: [],
        example: "🟢 Workflow running.",
      },
    },
    control: {
      branch: {
        emoji: "🪢",
        role: "CONTROL",
        meaning: "Branch logic",
        allowedContext: ["LLM"],
        usage: "OPTIONAL",
        conflictsWith: [],
        example: "🪢 Evaluate branch.",
      },
    },
  } as const;

  type CustomEmoji = SceOntologyEmoji<typeof customOntology>;
  const CUSTOM_STRUCTURE_EMOJI: CustomEmoji = "🏗️";

  it("indexes and resolves definitions for the provided ontology", () => {
    const customInterpreter = interpreter(customOntology);
    const defs = customInterpreter.forEmojis([CUSTOM_STRUCTURE_EMOJI]);

    expect(defs).toHaveLength(1);
    expect(defs[0].meaning).toBe("Custom structure");
  });

  it("extracts emojis from text using the provided ontology", () => {
    const customInterpreter = interpreter(customOntology);
    const text =
      "Workflow " +
      CUSTOM_STRUCTURE_EMOJI +
      " moves to " +
      customOntology.control!.branch!.emoji +
      ".";
    const emojis = customInterpreter.emojiFromText(text);

    expect(emojis).toEqual(
      expect.arrayContaining([
        CUSTOM_STRUCTURE_EMOJI,
        customOntology.control!.branch!.emoji,
      ])
    );
  });

  it("returns independent copies of the custom ontology index", () => {
    const customInterpreter = interpreter(customOntology);
    const copy = customInterpreter.copyIndex();

    expect(copy.get(CUSTOM_STRUCTURE_EMOJI)?.meaning).toBe("Custom structure");

    copy.get(CUSTOM_STRUCTURE_EMOJI)!.meaning = "Altered";

    const freshLookup = customInterpreter.forEmojis([
      CUSTOM_STRUCTURE_EMOJI,
    ])[0];
    expect(freshLookup.meaning).toBe("Custom structure");
  });
});
