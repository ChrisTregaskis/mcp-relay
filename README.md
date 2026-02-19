# MCP Hub

A custom [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that exposes shared AI tools to any MCP-compatible client — Claude Code, Cowork, or API agents.

## What This Is

A reusable **team AI tooling layer** built as an MCP server. Rather than each developer or project integrating tools individually, this server provides centralised access to shared capabilities through the MCP protocol.

**Phase 1 scope (POC):**

| Tool                 | What It Proves                                                 | External Service |
| -------------------- | -------------------------------------------------------------- | ---------------- |
| **Jira**             | Shared API credential access — one config, whole team benefits | Jira REST API    |
| **Brand Guidelines** | Per-project custom config fetched from external storage        | AWS S3           |

## Status

**US-1 (Foundation) complete** — architecture approved, project scaffolded, server boots on stdio transport. Implementing tool stories (US-2 onwards).

## Tech Stack

- **Runtime**: Node.js 22+
- **Language**: TypeScript (strict mode)
- **MCP Framework**: `@modelcontextprotocol/sdk` v1.26
- **Validation**: Zod 3.25.x
- **Package Manager**: pnpm
- **Formatting**: Prettier
- **Linting**: ESLint + typescript-eslint

## Project Structure

```
mcp-hub/
├── src/
│   ├── config/                    # Zod-validated config loader
│   ├── shared/                    # Errors, logger, HTTP client, rate-limit
│   ├── tools/
│   │   ├── jira/                  # get, create, update, search (stubs)
│   │   └── brand-guidelines/      # get-guidelines (stub)
│   ├── transports/
│   │   ├── stdio.ts               # Working entry point
│   │   └── http.ts                # Placeholder (Phase 2 gate)
│   ├── server.ts                  # createServer() factory
│   └── types.ts                   # ToolContext interface
├── docs/
│   └── architecture.md            # System design (v0.1)
├── CLAUDE.md                      # Project-wide AI instructions
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- pnpm

### Setup

```bash
git clone git@github.com:ChrisTregaskis/mcp-hub.git
cd mcp-hub
pnpm install
cp .env.example .env               # Fill in credentials
```

### Environment Variables

| Variable                | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `JIRA_BASE_URL`         | Jira instance URL (e.g. `https://your-domain.atlassian.net`) |
| `JIRA_USER_EMAIL`       | Jira account email                                           |
| `JIRA_API_TOKEN`        | Jira API token                                               |
| `AWS_ACCESS_KEY_ID`     | AWS access key (S3 brand guidelines)                         |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key                                               |
| `AWS_REGION`            | AWS region (default: `eu-west-1`)                            |
| `S3_BUCKET_NAME`        | S3 bucket for brand config                                   |

### Commands

```bash
pnpm build                         # Compile TypeScript
pnpm dev                           # Start server (watch mode)
pnpm dev:build                     # Watch TypeScript compilation
pnpm lint                          # ESLint
pnpm format                        # Prettier (write)
pnpm format:check                  # Prettier (check only)
pnpm typecheck                     # TypeScript strict check
```

## Architecture

See `docs/architecture.md` for the full system design — transport decisions, tool registration patterns, data flow, and external service integration.

## Origin

This project emerged from the deck-localiser POC, where we identified the need for AI tooling (Nanobanana image generation) but found no pre-built MCP connector. Rather than building a one-off integration, we recognised the opportunity for a reusable team tooling layer.

See `.claude/docs/mcp-integration-strategy.md` for the full background.

## Visual References

Exploration captured on the shared Miro board:

- [MCP Server Team AI Tooling Platform](https://miro.com/app/board/uXjVGFuezRU=/?moveToWidget=3458764659097372005&cot=14)
- [MCP Server Team Rollout Flow](https://miro.com/app/board/uXjVGFuezRU=/?moveToWidget=3458764659097372030&cot=14)
- [MCP Server Naming Convention](https://miro.com/app/board/uXjVGFuezRU=/?moveToWidget=3458764659097647598&cot=14)
