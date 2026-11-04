#!/bin/sh
set -e

echo "=== Xcode Cloud: ci_post_clone.sh started ==="

# 1. Install Node.js if not available
if ! command -v node &> /dev/null; then
    echo "Installing Node.js via Homebrew..."
    brew install node@20
    brew link node@20 --force --overwrite
fi

# 2. Navigate to sweetbake-app directory and install dependencies
cd "$CI_WORKSPACE/sweetbake-app"

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

echo "Installing npm dependencies..."
npm ci --prefer-offline || npm install

# 3. Install CocoaPods in ios folder
cd "$CI_WORKSPACE/sweetbake-app/ios"

echo "Installing CocoaPods..."
pod install

echo "=== Xcode Cloud: ci_post_clone.sh finished successfully ==="

