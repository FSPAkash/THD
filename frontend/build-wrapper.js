#!/usr/bin/env node
/**
 * Build wrapper to ensure react-scripts runs with proper permissions
 * This is a workaround for permission issues on some Linux environments
 */

const { spawn } = require('child_process');
const path = require('path');

// Get react-scripts path
const reactScriptsPath = path.join(__dirname, 'node_modules', '.bin', 'react-scripts');

console.log('Starting React build via Node wrapper...');

// Spawn react-scripts build
const build = spawn('node', [
  path.join(__dirname, 'node_modules', 'react-scripts', 'bin', 'react-scripts.js'),
  'build'
], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'production' }
});

build.on('close', (code) => {
  if (code !== 0) {
    console.error(`Build failed with code ${code}`);
    process.exit(code);
  }
  console.log('Build completed successfully!');
  process.exit(0);
});

build.on('error', (err) => {
  console.error('Build error:', err);
  process.exit(1);
});
