# Enable PDF Image Extraction

## Current Status
✅ **AI descriptions of visual elements** - Working
❌ **Actual image extraction from PDFs** - Disabled (waiting for dependency installation)

## Why It's Disabled
The PDF image extraction feature requires the `pdfjs-dist` library which hasn't been installed yet. The code is ready but commented out to prevent errors.

## How to Enable

### Step 1: Install Dependencies
Run this command in your project directory:

```bash
npm install
```

This will install `pdfjs-dist@^4.9.155` (already added to package.json).

### Step 2: Enable the Code
In `components/BoardMastermind.tsx`, uncomment two sections:

**Section 1 - Single File Scan (around line 286-299):**
```typescript
// Currently looks like this:
/*
if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
  try {
    console.log('🖼️ [PDF EXTRACTOR] Starting image extraction from PDF...');
    const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
    imageMapping = await extractAndMapImages(file);
    // ... rest of code
  }
}
*/

// Change to (remove /* and */):
if (mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
  try {
    console.log('🖼️ [PDF EXTRACTOR] Starting image extraction from PDF...');
    const { extractAndMapImages } = await import('../utils/pdfImageExtractor');
    imageMapping = await extractAndMapImages(file);
    console.log('✅ [PDF EXTRACTOR] Extracted images for', imageMapping.size, 'questions');
  } catch (err) {
    console.warn('⚠️ [PDF EXTRACTOR] Image extraction not available (install pdfjs-dist):', err);
  }
}
```

**Section 2 - Bulk Scan (around line 107-117):**
```typescript
// Uncomment the same way (remove /* and */)
```

### Step 3: Restart Dev Server
```bash
# Stop the server (Ctrl+C)
npm run dev
```

### Step 4: Test
1. Upload a PDF with diagrams
2. Check console for:
   ```
   🖼️ [PDF EXTRACTOR] Starting image extraction from PDF...
   📄 [PDF EXTRACTOR] Processing 3 pages
   🖼️ [PDF EXTRACTOR] Page 1: Found image at (120, 450)
   ✅ [PDF EXTRACTOR] Extracted 5 images total
   ```
3. View question in Vault - you should see actual extracted images!

## Quick Enable Script

Or use this one-liner to uncomment both sections automatically:

```bash
# Remove comment blocks around PDF extraction code
sed -i.bak 's|/\* *if (mimeType === .application/pdf.|if (mimeType === '\''application/pdf'\''|g' components/BoardMastermind.tsx
sed -i.bak 's|\*/ *$||g' components/BoardMastermind.tsx
```

## What You'll Get

**Before (current):**
- ✅ Questions extracted
- ✅ AI descriptions of diagrams
- ❌ No actual images

**After (enabled):**
- ✅ Questions extracted
- ✅ AI descriptions of diagrams
- ✅ **Actual extracted images displayed!**

## Files Already Modified
- ✅ `types.ts` - Added extractedImages field
- ✅ `utils/pdfImageExtractor.ts` - Complete implementation
- ✅ `components/BoardMastermind.tsx` - Integration ready (just commented out)
- ✅ `components/ExamAnalysis.tsx` - UI ready to display images
- ✅ `components/VisualQuestionBank.tsx` - UI ready to display images
- ✅ `package.json` - pdfjs-dist dependency added
- ✅ `vite.config.ts` - Optimized for pdf.js

Everything is ready - just needs `npm install` and uncommenting!

## Troubleshooting

**If npm install fails:**
- Check your Node.js version: `node -v` (needs v16+)
- Try clearing cache: `npm cache clean --force`
- Delete node_modules and package-lock.json, then retry

**If you don't have npm:**
- Install Node.js from https://nodejs.org/
- Or ask your DevOps team to run `npm install` on the server

---

**Next:** Run `npm install` and uncomment the code sections!
