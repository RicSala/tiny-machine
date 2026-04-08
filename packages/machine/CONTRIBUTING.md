# Contributing to @tinystack/machine

Thanks for taking the time to contribute!

## Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/RicSala/machine/issues) as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title** for the issue
- **Describe the exact steps to reproduce the problem** with as much detail as possible
- **Provide specific examples** to demonstrate the steps (include code snippets, machine configuration, etc.)
- **Describe the behavior you observed** and explain why it's a problem
- **Explain the expected behavior** and why you expected it

## Feature Requests

Before requesting a new feature:

1. **Check the [README](README.md)** - Your use case might already be supported
2. **Browse existing issues** - Someone might have already requested it
3. **Consider if it fits the library's scope** - This is an educational library focused on core state machine concepts

When opening a feature request:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed feature
- **Explain the use case** and why this feature would be useful
- **Include code examples** of how you envision using the feature

## Pull Requests

Before submitting a new pull request, **open an issue first** to discuss it.

### Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run tests in watch mode:
   ```bash
   pnpm test:watch
   ```

### Pull Request Guidelines

- **Branch naming**: Use descriptive branch names (e.g., `fix/guard-evaluation`, `feat/reenter-support`)
- **Type safety**: Ensure all TypeScript types are properly defined
- **Tests**: Add tests for new features or bug fixes
- **Documentation**: Update the README if you're adding new features or changing APIs

### Before Submitting

Run these commands to ensure your code meets our standards:

```bash
# Run tests
pnpm test

# Build the library
pnpm build
```

### Code Style

This library prioritizes:

- Clear, well-documented code
- Simple, focused features
- Educational value over advanced optimizations
- Good test coverage

## Questions?

If you have questions about contributing, feel free to open an issue.

Thank you for contributing!
