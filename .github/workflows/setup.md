# GitHub Actions Setup Guide

This repository uses GitHub Actions for automated testing, building, and deployment. Here's how to set up and configure the CI/CD pipeline.

## Workflows Overview

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)
- **Triggers**: Push to main/develop branches, Pull Requests
- **Runs on**: Ubuntu, Windows, macOS with Node.js 18 & 20
- **Actions**:
  - Run full test suite
  - Build application for all platforms
  - Upload build artifacts
  - Security audit
  - Create releases (main branch only)

### 2. Pull Request Checks (`.github/workflows/pr-checks.yml`)
- **Triggers**: Pull Request events
- **Runs on**: Ubuntu with Node.js 20
- **Actions**:
  - Run tests
  - Check test coverage
  - Validate commit messages
  - Check for TODO/FIXME comments
  - Validate file sizes

### 3. Nightly Tests (`.github/workflows/nightly.yml`)
- **Triggers**: Daily at 2 AM UTC, Manual trigger
- **Runs on**: Ubuntu with Node.js 20
- **Actions**:
  - Run full test suite
  - Performance tests
  - Dependency updates check
  - Generate test reports

### 4. CodeQL Security Analysis (`.github/workflows/codeql.yml`)
- **Triggers**: Push to main, PRs, Weekly schedule
- **Runs on**: Ubuntu
- **Actions**:
  - Static code analysis
  - Security vulnerability detection

### 5. Performance Tests (`.github/workflows/performance.yml`)
- **Triggers**: Push to main, PRs, Manual trigger
- **Runs on**: Ubuntu
- **Actions**:
  - Memory usage tests
  - Startup time benchmarks
  - Bundle size analysis

## Required Secrets

To enable all features, add these secrets to your GitHub repository:

### Required Secrets
1. **PERPLEXITY_API_KEY**: Your Perplexity API key for testing
   - Go to Settings → Secrets and variables → Actions
   - Add new repository secret
   - Name: `PERPLEXITY_API_KEY`
   - Value: Your actual Perplexity API key

### Optional Secrets
2. **SNYK_TOKEN**: For Snyk security scanning
   - Get token from [Snyk.io](https://snyk.io)
   - Add as repository secret

## Setup Instructions

### 1. Enable GitHub Actions
1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Click "I understand my workflows, go ahead and enable them"

### 2. Configure Branch Protection
1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Select required status checks:
     - `test (ubuntu-latest, 20)`
     - `build (ubuntu-latest)`
     - `CodeQL / Analyze (javascript)`

### 3. Set Up Dependabot
1. Go to Settings → Security → Code security and analysis
2. Enable "Dependabot alerts"
3. Enable "Dependabot security updates"
4. The `.github/dependabot.yml` file is already configured

### 4. Configure Commit Message Validation
1. Install commitlint dependencies:
   ```bash
   npm install --save-dev @commitlint/cli @commitlint/config-conventional
   ```
2. The `.commitlintrc.js` file is already configured

### 5. Set Up Husky for Local Hooks
1. Install husky:
   ```bash
   npm install --save-dev husky
   ```
2. Initialize husky:
   ```bash
   npx husky install
   ```
3. The pre-commit and commit-msg hooks are already configured

## Local Development

### Running Tests Locally
```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run the custom test script
./scripts/test.sh
```

### Pre-commit Hooks
The pre-commit hook will automatically:
- Run unit tests
- Check for console.log statements
- Warn about TODO/FIXME comments

### Commit Message Format
Use conventional commits format:
```
type(scope): description

feat: add new feature
fix: resolve bug
docs: update documentation
test: add tests
chore: maintenance tasks
```

## Monitoring and Debugging

### Viewing Workflow Runs
1. Go to Actions tab in your repository
2. Click on any workflow run to see details
3. Click on individual jobs to see logs

### Common Issues

#### Tests Failing
- Check if PERPLEXITY_API_KEY secret is set
- Verify Node.js version compatibility
- Check test logs for specific error messages

#### Build Failures
- Ensure all dependencies are properly declared
- Check for platform-specific build issues
- Verify electron-builder configuration

#### Security Alerts
- Review CodeQL results in Security tab
- Address any high/critical severity issues
- Update dependencies if needed

### Performance Monitoring
- Check nightly test results for performance regressions
- Monitor bundle size changes
- Review memory usage trends

## Customization

### Adding New Tests
1. Add test files to `tests/` directory
2. Follow naming convention: `*.test.js`
3. Update test scripts in `package.json` if needed

### Modifying Workflows
1. Edit workflow files in `.github/workflows/`
2. Test changes in a feature branch first
3. Use workflow dispatch for manual testing

### Adding New Checks
1. Add new steps to existing workflows
2. Create new workflow files for complex checks
3. Update branch protection rules if needed

## Best Practices

1. **Keep tests fast**: Unit tests should run quickly
2. **Use appropriate test types**: Unit for components, integration for workflows
3. **Mock external dependencies**: Don't make real API calls in tests
4. **Clean up resources**: Ensure tests don't leave side effects
5. **Document test cases**: Use descriptive test names and comments
6. **Regular maintenance**: Update dependencies and workflows regularly

## Support

If you encounter issues with the CI/CD setup:
1. Check the Actions tab for error details
2. Review this documentation
3. Check GitHub Actions documentation
4. Create an issue in the repository
