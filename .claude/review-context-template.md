# Review Context: [Branch Name]

**Date:** YYYY-MM-DD
**Author:** [Name]
**PR:** #[Number] (if applicable)

---

## Goals

What is this branch trying to achieve?

- Goal 1
- Goal 2

## Requirements

What are the acceptance criteria?

- [ ] Requirement 1
- [ ] Requirement 2

## Changes Made

High-level summary of what changed:

- Changed X in Y
- Added Z to W

## Areas to Focus

What should the reviewer pay special attention to?

- Focus area 1
- Focus area 2

## Known Limitations

What isn't perfect yet?

- Limitation 1 (will be addressed in follow-up)
- Limitation 2 (out of scope for this PR)

## Testing Notes

How was this tested? What should the reviewer verify?

- [ ] Unit tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Manual testing steps: ...

## MCP Protocol Compliance

- [ ] Tool handlers conform to MCP specification
- [ ] Input schemas are valid JSON Schema
- [ ] Error responses use correct MCP error codes
- [ ] Transport layer handles edge cases

## Security Checklist

- [ ] No API keys or secrets in code
- [ ] Environment variables validated with Zod
- [ ] Input validation on all tool parameters
- [ ] Error messages don't leak sensitive information
- [ ] Rate limiting considered

## Related Issues / Spikes

- Jira: [MCP-XXX]
- Spike: [spike name if relevant]
- Miro: [widget link if relevant]
