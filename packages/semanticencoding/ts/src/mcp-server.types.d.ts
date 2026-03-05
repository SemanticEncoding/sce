/**
 * @module mcp-server.types
 * @description
 * Declaration-only type contracts for the lightweight MCP server surface used by
 * the SCE MCP implementation.
 *
 * These types intentionally avoid importing the full generic-heavy MCP SDK type
 * graph. They provide a minimal, stable boundary for tool registration and
 * transport connection while preserving strong local typing for handler results.
 *
 * @remarks
 * - This file is declaration-only (`.d.ts`) and has no runtime output.
 * - It is designed to keep compile-time type expansion shallow in high-pressure
 *   files such as `sce-mcp-server.ts`.
 */

/**
 * Structured text response returned by MCP tool handlers.
 *
 * @property content Ordered list of textual response blocks emitted to the MCP client.
 */
declare type ToolResponse = {
    /**
     * Response content blocks returned to the MCP client.
     *
     * @property type Discriminant for content block type; currently always `"text"`.
     * @property text Human-readable payload for the content block.
     */
    content: Array<{
        type: "text";
        text: string;
    }>;
};

/**
 * Minimal async MCP tool handler signature.
 *
 * @param input Raw tool input payload supplied by the MCP runtime.
 * @returns Promise resolving to a {@link ToolResponse} payload.
 */
declare type MinimalToolHandler = (input: unknown) => Promise<ToolResponse>;

/**
 * Minimal MCP tool configuration shape required for registration.
 *
 * @property description Human-readable summary shown to MCP clients.
 * @property inputSchema Runtime validation schema object consumed by MCP server registration.
 */
export type MinimalToolConfig = {
    description: string;
    inputSchema: unknown;
};

/**
 * Minimal registration function contract required by the SCE server.
 *
 * This mirrors the subset of `registerTool` used in the codebase without pulling
 * in full SDK generic constraints.
 *
 * @param name Unique MCP tool name.
 * @param config Tool metadata and input schema.
 * @param handler Async callback invoked when the tool is executed.
 */
declare type MinimalRegisterTool = (
    name: string,
    config: MinimalToolConfig,
    handler: MinimalToolHandler
) => void;

/**
 * Minimal MCP server contract consumed by `sce-mcp-server.ts`.
 *
 * @property registerTool Registers an MCP tool callback and schema metadata.
 * @property connect Connects the server to a transport implementation.
 */
declare type MinimalMcpServer = {
    registerTool: MinimalRegisterTool;

    /**
     * Connects the MCP server to a transport implementation.
     *
     * @param transport Transport instance (for example stdio transport).
     * @returns Promise that resolves after successful connection.
     */
    connect: (transport: unknown) => Promise<void>;
};
