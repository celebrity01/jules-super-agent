#!/usr/bin/env bash
set -x

echo "=== Render Build Start ==="
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Step 1: Install dependencies (skip scripts to avoid Prisma/Bun crash, skip optional for sharp)
echo "=== Installing dependencies ==="
npm install --legacy-peer-deps --ignore-scripts --omit=optional 2>&1 || {
  echo "NPM INSTALL FAILED - trying with --force"
  npm install --force --ignore-scripts --omit=optional 2>&1
}

# Step 2: Generate Prisma client manually
echo "=== Generating Prisma client ==="
npx prisma generate 2>&1 || {
  echo "PRISMA GENERATE FAILED - continuing anyway"
}

# Step 3: Build Next.js with memory limit for free plan
echo "=== Building Next.js ==="
NODE_OPTIONS='--max-old-space-size=512' npx next build 2>&1 || {
  echo "NEXT BUILD FAILED"
  exit 1
}

# Step 4: Copy static files and public dir for standalone
echo "=== Copying static files ==="
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true

# Step 5: Ensure db directory exists for SQLite
echo "=== Creating db directory ==="
mkdir -p .next/standalone/db

echo "=== Render Build Complete ==="
