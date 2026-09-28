// Simple test runner that simulates browser console.assert
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Read the test file
const testFile = process.argv[2];
if (!testFile) {
  console.error('Usage: node tests/run-test.js <test-file.html>');
  process.exit(1);
}

const html = fs.readFileSync(testFile, 'utf8');

// Extract inline scripts and external script srcs
const scriptRegex = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
const srcRegex = /<script\s+src="([^"]+)"[^>]*>\s*<\/script>/gi;
let match;
const scripts = [];

// First, collect external scripts
const externalScripts = [];
while ((match = srcRegex.exec(html)) !== null) {
  externalScripts.push(match[1]);
}

// Then collect inline scripts
while ((match = scriptRegex.exec(html)) !== null) {
  scripts.push(match[1]);
}

// Create a mock console that tracks assertions
let failed = 0;
let passed = 0;
const mockConsole = {
  assert: (condition, message) => {
    if (!condition) {
      console.error(`FAIL: ${message}`);
      failed++;
    } else {
      passed++;
    }
  },
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

// Create a shared context
const context = vm.createContext({ console: mockConsole, global: {} });

// Load external scripts first
for (const src of externalScripts) {
  const filePath = path.join(path.dirname(testFile), src);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(content, context, { filename: src });
  } catch (err) {
    console.error(`ERROR loading ${src}: ${err.message}`);
    failed++;
  }
}

// Run each inline script in order
for (const script of scripts) {
  try {
    vm.runInContext(script, context, { filename: 'inline' });
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
