# Contributing to OpenSkill

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/KalenTang666/OpenSkill.git
cd openskill

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Project Structure

```
openskill/
├── packages/
│   ├── cli/           # CLI tool (hw command)
│   ├── sdk/           # TypeScript SDK
│   └── mcp-server/    # MCP Server for AI agents
├── docs/              # Whitepaper and documentation
├── examples/          # Usage examples
└── schemas/           # JSON Schema definitions
```

## How to Contribute

### Reporting Bugs

Open a [GitHub Issue](https://github.com/KalenTang666/OpenSkill/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Environment info (OS, Node version)

### Adding a Platform Adapter

This is the highest-impact contribution! To add support for a new AI platform:

1. Create `packages/cli/src/adapters/<platform>.ts`
2. Implement the `PlatformAdapter` interface (see `packages/cli/src/core/types.ts`)
3. Register it in `packages/cli/src/cli.ts` → `getAdapter()`
4. Add tests in `packages/cli/src/__tests__/adapters/<platform>.test.ts`
5. Update README.md

### Pull Request Process

1. Fork the repo and create a branch (`feat/my-feature` or `fix/my-bug`)
2. Write tests for new functionality
3. Ensure `npm run build && npm test` passes
4. Open a PR with a clear description

## Code Style

- TypeScript strict mode
- ESM modules
- Functional style preferred, classes only for stateful components
- Comments for public APIs, not for obvious code

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
