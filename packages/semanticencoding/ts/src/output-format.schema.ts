import { z } from "zod";

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

export type OutputFormat = z.infer<typeof OutputFormatSchema>;
