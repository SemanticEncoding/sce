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
 * - This file provides the canonical source for exported MCP server type contracts.
 */

export type ToolResponse = {
  content: Array<{
    type: "text";
    text: string;
  }>;
};

export type MinimalToolHandler = (input: unknown) => Promise<ToolResponse>;

export type MinimalToolConfig = {
  description: string;
  inputSchema: unknown;
};

export type MinimalRegisterTool = (
  name: string,
  config: MinimalToolConfig,
  handler: MinimalToolHandler
) => void;

export type MinimalMcpServer = {
  registerTool: MinimalRegisterTool;
  connect: (transport: unknown) => Promise<void>;
};
