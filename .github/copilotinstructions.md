# Copilot Instructions for SCE Submodule

These instructions apply to AI-assisted changes within `web-ui/submodules/sce`.

## Primary Goals

1. Keep SCE independently maintainable as its own workspace.
2. Preserve runtime behavior while reducing compile-time type pressure.
3. Keep public contracts well-documented for maintainers and AI tooling.

## Workspace and Dependency Rules

- Assume SCE root is `web-ui/submodules/sce`.
- Keep SCE `package.json` workspaces local (`packages/*/ts`).
- For SCE internal dependencies, prefer `workspace:*`.
- Do not add parent-repo-specific workspace paths or assumptions.

## TypeScript Performance Rules (Critical)

When touching MCP servers, tool registries, or schema-heavy modules:

- Avoid importing broad SDK generic types into large integration files.
- Introduce minimal local interfaces for boundary APIs (`registerTool`, `connect`, etc.).
- Keep inferred type fan-out shallow by:
  - using explicit local aliases,
  - avoiding deeply composed conditional utility types,
  - separating boundary types into dedicated `.d.ts` files.

### Known Hotspot

- `packages/semanticencoding/ts/src/sce-mcp-server.ts`

This file previously triggered TypeScript OOM due to type expansion around MCP + Zod boundaries.

## Documentation Strategy

- Prefer comprehensive JSDoc in declaration files for API contracts.
- Keep implementation files focused on behavior, not heavy type gymnastics.
- If adding new boundary contracts, place docs in a nearby `.d.ts` file.

## Change Style

- Make the smallest safe change that addresses root cause.
- Do not rewrite working architecture for stylistic reasons.
- Keep naming explicit and descriptive.

## Verification Expectations

After changes affecting SCE type surfaces:

1. Run `yarn install` in `web-ui/submodules/sce` if dependencies changed.
2. Run `yarn workspace semanticencoding run build`.
3. If memory concerns are suspected, run isolated compile checks on changed hotspot files.

## Preferred Mitigations for Memory Issues

In order of preference:

1. Narrow boundary types (minimal interface shim).
2. Split registration/wiring from business logic.
3. Reduce ambient type scope where safe (`types`, `typeRoots`).
4. Adjust build script strategy only if required.

Avoid masking issues with broad heap-size increases as the first response.
