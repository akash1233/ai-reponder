#!/bin/bash

# Check if .env file exists and has the required API key
cd /Users/ds/ai-reponder

if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created!"
    echo "⚠️  Please edit .env and add your Perplexity API key"
    echo "   Get your key from: https://www.perplexity.ai/settings/api"
    exit 1
fi

# Check if PERPLEXITY_API_KEY is set
if ! grep -q "PERPLEXITY_API_KEY=pplx-" .env; then
    echo "❌ PERPLEXITY_API_KEY not found in .env file!"
    echo "⚠️  Please edit .env and add your Perplexity API key"
    echo "   Get your key from: https://www.perplexity.ai/settings/api"
    exit 1
fi

echo "✅ Environment variables are properly configured!"
