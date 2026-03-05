# CLAUDE.md — SCE Submodule Development Notes

This file documents practical guidance for contributors and AI assistants working in the `sce` submodule.

## Scope and Workspace Boundaries

- Treat `web-ui/submodules/sce` as an independent workspace root.
- Keep SCE workspace configuration self-contained (`workspaces: ["packages/*/ts"]`).
- Do **not** introduce path-coupling to parent monorepos in SCE package manifests.
- Prefer `workspace:*` links for internal SCE package-to-package dependencies.

## Why TypeScript Memory Spikes Happened

During debugging, TypeScript OOM was reproducible for:

- `packages/semanticencoding/ts/src/sce-mcp-server.ts`

Key finding:

- The memory explosion was caused by deep generic type expansion around MCP tool registration + Zod-heavy schemas, not by file line count alone.

Implication:

- "Small source file" does not imply small type-check graph.
- Generic-heavy SDK boundaries can dominate compile memory.

## Patterns to Keep Compile Memory Stable

### 1) Use Minimal Type Boundaries at SDK Edges

At MCP boundaries, avoid exposing full SDK generics across large files.

- Define a narrow local contract (e.g., minimal `registerTool` surface).
- Cast runtime objects to this narrow contract at integration boundaries.
- Keep runtime behavior unchanged; only narrow compile-time surface area.

### 2) Keep JSDoc-Rich `.d.ts` Files Type-Simple

JSDoc in declaration files is encouraged for discoverability and AI-context quality.

- Use `.d.ts` files for comprehensive docs and stable type contracts.
- Avoid complex recursive conditional/mapped utility types in `.d.ts` hotspots.
- Prefer explicit, flat interface/type aliases for frequently imported boundaries.

### 3) Isolate Tool Registration From Route/Server Wiring

- Centralize tool registration in a dedicated registry module.
- Keep route/server files focused on transport/auth/error wiring.
- Reduces generic fan-out in high-traffic integration files.

### 4) Keep Build Config Narrow

- Build configs should include only required source files.
- Tests should use separate tsconfig where possible.
- Keep ambient type discovery constrained (`types`, `typeRoots`) when practical.

## Operational Commands

From `web-ui/submodules/sce`:

- Install: `yarn install`
- List workspaces: `yarn workspaces list --json`
- Build semanticencoding: `yarn workspace semanticencoding run build`

From `web-ui/submodules/sce/packages/semanticencoding/ts`:

- Isolated compile (single file):
  `NODE_OPTIONS='--max-old-space-size=3072' yarn exec tsc --noEmit src/sce-mcp-server.ts`

## Troubleshooting Checklist

If build memory spikes return:

1. Re-run isolated compile on suspected file(s).
2. Check whether a new import widened generic inference (MCP/Zod/SDK contracts).
3. Move or narrow boundary types into a local `.d.ts` shim.
4. Validate with `yarn workspace semanticencoding run build`.

## Contributor Guardrails

- Preserve behavior first; optimize type surfaces second.
- Avoid broad refactors in response to memory issues.
- Prefer small, explicit type-boundary edits with measurable build impact.
