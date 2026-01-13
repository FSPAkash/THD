#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies and build
cd frontend
npm install
npm run build
cd ..

echo "Build completed successfully!"
