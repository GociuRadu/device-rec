#!/usr/bin/env bash
set -o errexit

echo "Installing dependencies..."
npm install

echo "Installing Chrome..."
npx puppeteer browsers install chrome

# Copy Puppeteer Chrome to runtime cache (Render has ephemeral build env)
echo "Moving browser cache to runtime location..."
mkdir -p $PUPPETEER_CACHE_DIR
if [ -d "$HOME/.cache/puppeteer" ]; then
  cp -R "$HOME/.cache/puppeteer/"* "$PUPPETEER_CACHE_DIR"
else
  echo "No Puppeteer cache found at $HOME/.cache/puppeteer, skipping copy."
fi
