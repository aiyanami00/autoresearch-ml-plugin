#!/usr/bin/env node
/**
 * Post-build script to fix relative paths in build/skills/autoresearch/index.js
 * TypeScript doesn't rewrite relative imports when the output structure differs
 */

const fs = require('fs');
const path = require('path');

const skillIndexPath = path.join(__dirname, '../build/skills/autoresearch/index.js');

if (!fs.existsSync(skillIndexPath)) {
  console.error('[postbuild] Error: build/skills/autoresearch/index.js not found');
  process.exit(1);
}

let content = fs.readFileSync(skillIndexPath, 'utf-8');

// Fix the incorrect relative path from ../../src/index to ../src/index
// The built structure is: build/skills/autoresearch/index.js
// It needs to reference: build/src/index.js
// So the correct relative path is: ../src/index (not ../../src/index)
const originalPath = 'require("../../src/index")';
const fixedPath = 'require("../src/index")';

if (content.includes(originalPath)) {
  content = content.replace(originalPath, fixedPath);
  fs.writeFileSync(skillIndexPath, content);
  console.log('[postbuild] Fixed path in build/skills/autoresearch/index.js');
} else if (content.includes(fixedPath)) {
  console.log('[postbuild] Path already correct in build/skills/autoresearch/index.js');
} else {
  console.warn('[postbuild] Warning: Could not find expected import pattern');
}

console.log('[postbuild] Done');
