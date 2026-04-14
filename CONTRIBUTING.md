# Contributing

> **English** | [Italiano](CONTRIBUTING.it.md)
>
> Back to [README](README.md)

Thank you for considering contributing to Promemoria Timbrature.

## Getting Started

1. Fork the repository.
2. Clone your fork locally.
3. Install development dependencies: `npm install`.
4. Load the extension in Chrome: `chrome://extensions/` > Developer mode > Load unpacked.

## Development Workflow

```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format with Prettier
npm run format:check # Check formatting without modifying
npm test             # Run unit tests (Vitest)
npm run test:watch   # Run tests in watch mode
```

All code must pass linting, formatting, and test checks before submission.

## Code Style

- Plain JavaScript with ES modules (no bundler, no TypeScript).
- Callback-based Chrome API wrappers for broadest compatibility.
- Pure functions in `src/time-utils.js` and `src/shared/` for testability.
- Chrome-specific code isolated in `src/background/`, `src/content/`, and `src/pages/`.
- Follow existing naming conventions and patterns.

## Pull Requests

1. Create a feature branch from `main`: `feature/your-feature-name` or `fix/your-fix-name`.
2. Write tests for new functionality.
3. Ensure `npm run lint && npm test` passes with no errors.
4. Submit a PR with a clear description of the changes and their motivation.

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): short description

Optional body explaining the motivation behind the change.
```

## Reporting Issues

Open an issue including:

- Chrome version and OS.
- Extension version (from `manifest.json`).
- Steps to reproduce.
- Expected vs. actual behavior.
