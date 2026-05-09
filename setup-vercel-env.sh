#!/bin/bash

# Script to set up Vercel environment variables from .env.local
# Run this after installing Vercel CLI: npm i -g vercel

echo "🔧 Setting up Vercel environment variables..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it first:"
    echo "   npm i -g vercel"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    exit 1
fi

echo "📋 Reading variables from .env.local..."
echo ""

# Function to add environment variable
add_env() {
    local key=$1
    local value=$2
    
    if [ -z "$value" ]; then
        echo "⏭️  Skipping $key (empty value)"
        return
    fi
    
    echo "➕ Adding $key..."
    echo "$value" | vercel env add "$key" production --force
}

# Read and set each variable
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue
    
    # Remove quotes from value
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    # Add to Vercel
    add_env "$key" "$value"
done < .env.local

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to Vercel dashboard: https://vercel.com/asimsaads-projects/ruhiz7815"
echo "2. Go to Deployments tab"
echo "3. Click '...' on latest deployment → Redeploy"
echo "4. Update NEXTAUTH_URL to your Vercel domain"
echo "5. Update Google OAuth redirect URIs"
