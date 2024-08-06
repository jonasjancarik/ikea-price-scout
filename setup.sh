#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Check if npm is installed
if ! [ -x "$(command -v npm)" ]; then
  echo 'Error: npm is not installed.' >&2
  exit 1
fi

# Check if jq is installed
if ! [ -x "$(command -v jq)" ]; then
  echo 'jq is not installed. Installing jq...'
  brew install jq
fi

# Initialize npm and install necessary packages
echo "Initializing npm and installing packages..."
npm init -y
npm install typescript eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin --save-dev
npm install http-server --save-dev

# Create TypeScript configuration
echo "Creating tsconfig.json..."
cat <<EOT > tsconfig.json
{
  "compilerOptions": {
    "target": "es6",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src"
  ]
}
EOT

# Create ESLint configuration
echo "Creating .eslintrc.js..."
cat <<EOT > .eslintrc.js
module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    // Add custom rules here
  }
};
EOT

# Create VS Code launch configuration for debugging
echo "Creating .vscode/launch.json..."
mkdir -p .vscode
cat <<EOT > .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome with Extension",
      "runtimeArgs": [
        "--load-extension=\${workspaceFolder}/dist",
        "--start-maximized",
        "--disable-extensions-except=\${workspaceFolder}/dist"
      ],
      "url": "http://localhost:8080",
      "webRoot": "\${workspaceFolder}/src",
      "sourceMaps": true
    }
  ]
}
EOT

# Create a basic project structure
echo "Creating project structure..."
mkdir -p src dist

# Create a sample manifest file
echo "Creating manifest.json..."
cat <<EOT > manifest.json
{
  "manifest_version": 2,
  "name": "My Chrome Extension",
  "version": "1.0",
  "description": "A description of my extension",
  "background": {
    "scripts": ["dist/background.js"]
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/content.js"]
    }
  ],
  "browser_action": {
    "default_popup": "dist/popup.html"
  },
  "permissions": ["storage"]
}
EOT

# Create sample TypeScript files
echo "Creating sample TypeScript files..."
cat <<EOT > src/background.ts
console.log('Background script running');
EOT

cat <<EOT > src/content.ts
console.log('Content script running');
EOT

cat <<EOT > src/popup.ts
console.log('Popup script running');
EOT

# Create a sample HTML file for the popup
echo "Creating sample HTML file..."
cat <<EOT > src/popup.html
<!DOCTYPE html>
<html>
<head>
    <title>Popup</title>
    <script src="popup.js"></script>
</head>
<body>
    <h1>Popup Page</h1>
</body>
</html>
EOT

# Create a basic CSS file
echo "Creating sample CSS file..."
cat <<EOT > src/styles.css
body {
    font-family: Arial, sans-serif;
}
EOT

# Add build and start scripts to package.json
echo "Adding build and start scripts to package.json..."
jq '.scripts += {"build": "tsc", "start": "http-server ./dist"}' package.json > tmp.json && mv tmp.json package.json

# Run the initial build
echo "Running initial build..."
npm run build

echo "Setup complete. You can now start developing your Chrome extension."
echo "Use 'npm run build' to compile TypeScript files and 'npm start' to start the local server."   