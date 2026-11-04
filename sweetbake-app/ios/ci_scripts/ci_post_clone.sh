#!/bin/sh
set -e

echo "=== Xcode Cloud: ci_post_clone.sh started ==="

# Xcode Cloud environment variables
# $CI_PRIMARY_REPOSITORY_PATH points to the cloned repo root
ROOT_DIR="${CI_PRIMARY_REPOSITORY_PATH:-$CI_WORKSPACE}"
echo "Repository Root: $ROOT_DIR"

# 1. Install Node.js & CocoaPods if missing
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

if ! command -v node >/dev/null 2>&1; then
    echo "Installing node@20..."
    brew install node@20
    brew link --overwrite --force node@20
fi

# Ensure Homebrew and node are in PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
echo "Node path: $(which node)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 2. Install npm dependencies in sweetbake-app
cd "$ROOT_DIR/sweetbake-app"
echo "Installing npm dependencies in $(pwd)..."
npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# 3. Install CocoaPods in sweetbake-app/ios
cd "$ROOT_DIR/sweetbake-app/ios"

if ! command -v pod >/dev/null 2>&1; then
    echo "Installing CocoaPods..."
    brew install cocoapods || gem install cocoapods
fi

echo "Running pod install in $(pwd)..."
pod install --repo-update || pod install

echo "=== Xcode Cloud: ci_post_clone.sh finished successfully ==="
