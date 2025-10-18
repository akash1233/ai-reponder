# GitHub Actions Setup Guide

This repository uses GitHub Actions for automated testing, building, and security checks. Here's how the simplified CI/CD pipeline works.

## Workflows Overview

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)
- **Triggers**: Push to main/develop branches, Pull Requests
- **Runs on**: Ubuntu with Node.js 20
- **Actions**:
  - Run full test suite (`npm test`)
  - Run linting (`npm run lint`)
  - Security audit (`npm audit`)
  - Build check (PRs only)

### 2. Security Checks (`.github/workflows/security.yml`)
- **Triggers**: Push to main, PRs, Weekly schedule (Monday 2 AM UTC)
- **Runs on**: Ubuntu with Node.js 20
- **Actions**:
  - Security audit with moderate level
  - CodeQL static analysis
  - Vulnerability detection

## Simplified Workflow Benefits

✅ **Faster CI** - Single OS, single Node version  
✅ **Clear separation** - Tests vs Security  
✅ **Reduced complexity** - 2 workflows instead of 6  
✅ **Cost effective** - Fewer runner minutes  
✅ **Focused checks** - Each workflow has a clear purpose  

## Required Secrets

No secrets are required for basic functionality. The app works with:
- User-provided API keys via Settings UI
- Environment variables (optional)

## Test Scripts Available

```bash
npm test              # Run all tests
npm run test:ci       # CI-optimized test run
npm run test:coverage # Run tests with coverage
npm run lint          # Run ESLint
npm run lint:fix      # Fix linting issues
```

## Workflow Triggers

### CI Workflow
- **Push to main/develop** → Run tests + lint + security audit
- **Pull Request** → Run tests + lint + security audit + build check

### Security Workflow  
- **Push to main** → Run security audit + CodeQL
- **Pull Request to main** → Run security audit + CodeQL
- **Weekly (Monday 2 AM)** → Run security audit + CodeQL

## Monitoring

- Check the **Actions** tab in GitHub for workflow status
- Failed tests will block PR merging
- Security issues will be flagged but won't block PRs
- Build failures in PRs will be reported but won't block merging

## Local Development

To run the same checks locally:

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Run security audit
npm audit --audit-level=high

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Tests failing** - Check test output in Actions tab
2. **Linting errors** - Run `npm run lint:fix` locally
3. **Security vulnerabilities** - Run `npm audit` and update dependencies
4. **Build failures** - Check if all dependencies are properly installed

### Getting Help

- Check the Actions tab for detailed logs
- Run tests locally to reproduce issues
- Review the test files in the `tests/` directory