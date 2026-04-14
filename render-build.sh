#!/usr/bin/env bash
set -euo pipefail

echo "=== Render Build Start ==="
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Step 1: Install dependencies (skip postinstall to avoid Prisma crash)
echo "=== Installing dependencies ==="
npm install --legacy-peer-deps --ignore-scripts

# Step 2: Generate Prisma client manually
echo "=== Generating Prisma client ==="
npx prisma generate

# Step 3: Build Next.js with memory limit for free plan
echo "=== Building Next.js ==="
NODE_OPTIONS='--max-old-space-size=512' npm run build

# Step 4: Ensure db directory exists for SQLite
echo "=== Creating db directory ==="
mkdir -p .next/standalone/db

echo "=== Render Build Complete ==="
