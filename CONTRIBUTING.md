# Contributing

Thank you for considering contributing to Promemoria Timbrature!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Load the extension in Chrome: `chrome://extensions/` > Developer mode > Load unpacked

## Development Workflow

```bash
npm run lint        # Run ESLint
npm run format      # Format with Prettier
npm test            # Run unit tests (Vitest)
```

All code must pass linting and formatting checks before submission.

## Code Style

- Plain JavaScript (no bundler, no TypeScript)
- Callback-based Chrome API wrappers for broadest compatibility
- Pure functions in `src/` for testability; Chrome-specific code in root files
- Follow existing naming conventions and patterns

## Pull Requests

1. Create a feature branch: `feature/your-feature-name`
2. Write tests for new functionality
3. Ensure `npm run lint && npm test` passes
4. Submit a PR with a clear description of changes

## Reporting Issues

Open an issue with:
- Chrome version
- Extension version (from `manifest.json`)
- Steps to reproduce
- Expected vs actual behavior
