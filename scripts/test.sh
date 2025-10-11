#!/bin/bash

# Test runner script for AI Reponder
# This script runs all tests with proper environment setup

set -e  # Exit on any error

echo "🧪 Starting AI Reponder Test Suite"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Set up environment variables for testing
export NODE_ENV=test
export PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY:-"test-key-for-testing"}

echo "🔧 Environment: $NODE_ENV"
echo "🔑 API Key: ${PERPLEXITY_API_KEY:0:10}..."

# Run linting if available
if npm run lint --silent 2>/dev/null; then
    echo "✅ Linting passed"
else
    echo "⚠️  Linting not configured or failed"
fi

# Run tests
echo ""
echo "🧪 Running test suite..."
echo "========================"

# Run different test types based on arguments
case "${1:-all}" in
    "unit")
        echo "Running unit tests only..."
        npm run test -- --testPathPattern="tests/(main|ai-service|text-monitor|suggestion-overlay|renderer).test.js"
        ;;
    "integration")
        echo "Running integration tests only..."
        npm run test -- --testPathPattern="tests/integration.test.js"
        ;;
    "coverage")
        echo "Running tests with coverage..."
        npm run test:coverage
        ;;
    "watch")
        echo "Running tests in watch mode..."
        npm run test:watch
        ;;
    "all"|*)
        echo "Running all tests..."
        npm run test:ci
        ;;
esac

echo ""
echo "✅ Test suite completed successfully!"
echo "=================================="

# Show coverage summary if available
if [ -f "coverage/lcov.info" ]; then
    echo ""
    echo "📊 Coverage Summary:"
    echo "==================="
    if command -v npx &> /dev/null; then
        npx nyc report --reporter=text-summary 2>/dev/null || echo "Coverage report not available"
    fi
fi

echo ""
echo "🎉 All tests passed! Ready for commit."
