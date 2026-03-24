import { z } from "zod";

export type OutputFormatType = "auto" | "pretty" | "json" | "hybrid";

export type OutputFormat = {
    type?: OutputFormatType;
    color?: boolean;
};

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
