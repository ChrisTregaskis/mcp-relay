# MCP Hub

A proof-of-concept custom [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that exposes shared AI tools to any Claude-based workflow — Cowork, Claude Code, or API agents.

## What This Is

A reusable **team AI tooling layer** built as an MCP server. Rather than each developer or project integrating AI tools individually, this server provides centralised access to shared capabilities:

- **Image generation** (Nanobanana / Gemini)
- **Document processing** (PPTX manipulation, PDF tools)
- **Project management** (Jira, Azure DevOps)
- **Developer tooling** (CI/CD integration, code quality, documentation)
- **Internal APIs** (company-specific services)

## Status

**Pre-architecture** — Claude infrastructure and seed documentation established. Architecture to be drafted before any application code is scaffolded.

## Origin

This project emerged from the [deck-localiser](../deck-localiser/) POC, where we identified the need for AI image generation tooling (Nanobanana) but found no pre-built MCP connector. Rather than building a one-off integration, we recognised the opportunity for a reusable team tooling layer.

See `.claude/docs/mcp-integration-strategy.md` for the full background and vision.

## Tech Stack (Planned)

- **Runtime**: Node.js (LTS)
- **Language**: TypeScript (strict mode)
- **MCP Framework**: `@modelcontextprotocol/sdk`
- **Validation**: Zod
- **Testing**: Vitest
- **Formatting**: Prettier

## Project Structure

```
mcp-hub/
├── docs/                          # Source of truth (committed)
│   └── architecture.md             # System design (v0.1)
├── .claude/
│   └── docs/
│       └── mcp-integration-strategy.md  # Seed strategy document
├── src/                            # Application code
├── CLAUDE.md                       # Project-wide AI instructions
└── README.md                       # This file
```

## Getting Started

> **Note:** No application code exists yet. This section will be updated after architecture approval.

1. Clone the repository
2. Review `.claude/docs/mcp-integration-strategy.md` for project context
3. Review `docs/architecture.md` (once drafted) for system design

## Visual References

Exploration captured on the shared Miro board:

- [MCP Server Team AI Tooling Platform](https://miro.com/app/board/uXjVGFuezRU=/?moveToWidget=3458764659097372005&cot=14)
- [MCP Server Team Rollout Flow](https://miro.com/app/board/uXjVGFuezRU=/?moveToWidget=3458764659097372030&cot=14)
- [MCP Server Naming Convention](https://miro.com/app/board/uXjVGFuezRU=/?moveToWidget=3458764659097647598&cot=14)
