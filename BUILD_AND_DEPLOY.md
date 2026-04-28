# Plus2AI - Build & Deploy Guide

Complete automated build and deployment process for Plus2AI with SEO optimization.

---

## 🔧 Updated Build Process

The build process now automatically includes all necessary files for deployment.

### Automated Pre-Build Script

A pre-build script (`scripts/pre-build.sh`) now runs automatically before every build to:

1. ✅ **Sync KCET_2026 folder** to `public/`
2. ✅ **Copy report_viewer.html** to forensic_audit folder
3. ✅ **Verify all critical files** exist before build

### Build Commands

```bash
# Standard build (recommended)
npm run build

# Fast build (skip pre-build checks)
npm run build:fast

# Development mode
npm run dev
```

---

## 📦 What Gets Built

### Blog Files:
- ✅ `/blog/index.html` - Blog listing page
- ✅ `/blog/kcet-2026-solved-papers.html` - Solved papers blog
- ✅ `/blog/ai-prediction-kcet-neet-jee.html` - AI prediction blog

### Forensic Audit Files:
- ✅ `/KCET_2026/analysis_reports/forensic_audit/index.html` - Dashboard
- ✅ `/KCET_2026/analysis_reports/forensic_audit/report_viewer.html` - Subject reports
- ✅ All markdown analysis files

### SEO Files:
- ✅ `/sitemap.xml` - XML sitemap with all URLs
- ✅ `/robots.txt` - Search engine crawler directives
- ✅ `/og-image.png` - Social media preview image (803KB)

### Assets:
- ✅ CSS bundles (gzipped ~32KB)
- ✅ JavaScript bundles (gzipped ~1.3MB)
- ✅ PDF.js worker (~2.3MB)
- ✅ Images and fonts

---

## 🚀 Deployment Methods

### Method 1: Vercel (Recommended)

```bash
# Install Vercel CLI (one time)
npm install -g vercel

# Login
vercel login

# Deploy
npm run build
cd dist
vercel --prod
```

**Result:** Instant deployment with HTTPS, CDN, and automatic optimization.

### Method 2: Netlify

```bash
# Install Netlify CLI (one time)
npm install -g netlify-cli

# Login
netlify login

# Deploy
npm run build
netlify deploy --prod --dir=dist
```

### Method 3: Manual FTP/SFTP

```bash
# Build
npm run build

# Upload dist/ folder contents to your web server
# Ensure directory structure is maintained:
# - dist/ → public_html/
# - dist/blog/ → public_html/blog/
# - dist/KCET_2026/ → public_html/KCET_2026/
```

---

## ✅ Verification Process

After deployment, verify everything is working:

### Automated Verification

```bash
# Update BASE_URL in scripts/verify-deployment.sh
# Then run:
./scripts/verify-deployment.sh
```

**Expected output:**
```
✓ / - OK (200)
✓ /robots.txt - OK (200)
✓ /sitemap.xml - OK (200)
✓ /og-image.png - OK (200)
✓ /blog/ - OK (200)
✓ /blog/kcet-2026-solved-papers.html - OK (200)
✓ /blog/ai-prediction-kcet-neet-jee.html - OK (200)
✓ /KCET_2026/analysis_reports/forensic_audit/index.html - OK (200)
✓ /KCET_2026/analysis_reports/forensic_audit/report_viewer.html - OK (200)
```

### Manual Verification

Test these URLs in your browser:

**Blog URLs:**
- https://your-domain.com/blog/
- https://your-domain.com/blog/kcet-2026-solved-papers.html
- https://your-domain.com/blog/ai-prediction-kcet-neet-jee.html

**Forensic Audit URLs:**
- https://your-domain.com/KCET_2026/analysis_reports/forensic_audit/index.html
- https://your-domain.com/KCET_2026/analysis_reports/forensic_audit/report_viewer.html?subject=Biology
- https://your-domain.com/KCET_2026/analysis_reports/forensic_audit/report_viewer.html?subject=Physics
- https://your-domain.com/KCET_2026/analysis_reports/forensic_audit/report_viewer.html?subject=Chemistry
- https://your-domain.com/KCET_2026/analysis_reports/forensic_audit/report_viewer.html?subject=Math

**SEO Files:**
- https://your-domain.com/sitemap.xml
- https://your-domain.com/robots.txt

---

## 🔍 Pre-Build Script Details

### What it does:

**File:** `scripts/pre-build.sh`

```bash
#!/bin/bash
# 1. Syncs KCET_2026/ → public/KCET_2026/
# 2. Copies report_viewer.html to forensic_audit folder
# 3. Verifies all critical files exist
# 4. Shows colored output for easy debugging
```

### Files it verifies:

```
✓ public/blog/index.html
✓ public/blog/kcet-2026-solved-papers.html
✓ public/blog/ai-prediction-kcet-neet-jee.html
✓ public/sitemap.xml
✓ public/robots.txt
✓ public/og-image.png
✓ public/KCET_2026/analysis_reports/forensic_audit/index.html
✓ public/KCET_2026/analysis_reports/forensic_audit/report_viewer.html
```

### Running manually:

```bash
# Make executable (already done)
chmod +x scripts/pre-build.sh

# Run manually
./scripts/pre-build.sh
```

---

## 📋 Complete Deployment Checklist

### 1. Build Project
- [ ] Run `npm run build`
- [ ] Check for errors in console
- [ ] Verify `dist/` folder created
- [ ] Confirm all files present (9 critical URLs)

### 2. Deploy
Choose ONE method:
- [ ] **Vercel:** `cd dist && vercel --prod`
- [ ] **Netlify:** `netlify deploy --prod --dir=dist`
- [ ] **Manual:** Upload `dist/` contents via FTP

### 3. Verify Deployment
- [ ] Run `./scripts/verify-deployment.sh` (update BASE_URL first)
- [ ] All URLs return 200 status
- [ ] Blog pages load correctly
- [ ] Forensic audit dashboard accessible
- [ ] Report viewer works with subject parameters

### 4. Test SEO
- [ ] View page source on blog pages
- [ ] Verify meta tags present
- [ ] Check Open Graph tags
- [ ] Validate structured data: https://search.google.com/test/rich-results

### 5. Submit to Search Engines
- [ ] Submit sitemap to Google Search Console
- [ ] Request indexing for blog URLs
- [ ] Test social sharing (Facebook, Twitter)

---

## 🐛 Troubleshooting

### Build Fails

**Problem:** `npm run build` shows errors

**Solutions:**
1. Check pre-build script output for warnings
2. Verify KCET_2026 folder exists in project root
3. Ensure report_viewer.html exists at correct path
4. Run `npm install` to ensure dependencies installed

### Files Missing After Build

**Problem:** Some files not in `dist/` folder

**Solutions:**
1. Run pre-build script manually: `./scripts/pre-build.sh`
2. Check if files exist in `public/` folder
3. Verify Vite is copying public folder correctly
4. Look for warnings in build output

### Forensic Audit 404 Error

**Problem:** `/KCET_2026/analysis_reports/forensic_audit/` returns 404

**Solutions:**
1. Verify `public/KCET_2026` folder exists
2. Run `npm run build` (not `build:fast`)
3. Check pre-build script ran successfully
4. Manually copy: `cp -r KCET_2026 public/`

### Report Viewer Missing

**Problem:** `report_viewer.html` returns 404

**Solutions:**
1. Check file exists: `ls KCET_2026/analysis_reports/Claude/report_viewer.html`
2. Run pre-build script: `./scripts/pre-build.sh`
3. Manually copy: `cp KCET_2026/analysis_reports/Claude/report_viewer.html public/KCET_2026/analysis_reports/forensic_audit/`

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./dist
```

---

## 📊 Build Output Example

```
$ npm run build

> edujourney---universal-teacher-studio@1.5.1 prebuild
> bash scripts/pre-build.sh

🔧 Running pre-build setup...
📁 Syncing KCET_2026 folder to public/...
✓ KCET_2026 folder synced to public/
📄 Copying report_viewer.html...
✓ report_viewer.html copied to KCET_2026/analysis_reports/forensic_audit/
✓ report_viewer.html copied to public/KCET_2026/analysis_reports/forensic_audit/
🔍 Verifying critical files...
✓ public/blog/index.html
✓ public/blog/kcet-2026-solved-papers.html
✓ public/blog/ai-prediction-kcet-neet-jee.html
✓ public/sitemap.xml
✓ public/robots.txt
✓ public/og-image.png
✓ public/KCET_2026/analysis_reports/forensic_audit/index.html
✓ public/KCET_2026/analysis_reports/forensic_audit/report_viewer.html
✅ All critical files verified
🎉 Pre-build setup complete!

> edujourney---universal-teacher-studio@1.5.1 build
> npm run prebuild && vite build

vite v6.4.1 building for production...
✓ 2892 modules transformed.
dist/index.html                    1.73 kB │ gzip: 0.82 kB
dist/assets/index.css            248.04 kB │ gzip: 32.41 kB
dist/assets/index.js           5,577.13 kB │ gzip: 1,290.40 kB
✓ built in 25.77s
```

---

## 📝 Key Changes Summary

### What Changed:

**Before:**
- Manual copying of KCET_2026 folder
- Manual copying of report_viewer.html
- Forensic audit files missing after build
- Deployment failures due to missing files

**After:**
- ✅ Automated pre-build script
- ✅ All files copied automatically
- ✅ Verification built into build process
- ✅ No manual intervention needed
- ✅ Consistent deployments

### New Commands:

```bash
# Run pre-build checks (automatic in npm run build)
npm run prebuild

# Standard build with pre-build checks
npm run build

# Fast build without pre-build checks
npm run build:fast
```

---

## 🎉 Benefits

1. **Automated:** No manual file copying required
2. **Reliable:** Pre-build verification catches issues early
3. **Consistent:** Same files every build
4. **Fast:** Pre-build script runs in <1 second
5. **Debuggable:** Colored output shows exactly what happened

---

## 📞 Support

**Documentation:**
- Build Guide: `BUILD_AND_DEPLOY.md` (this file)
- Deployment Guide: `BLOG_DEPLOYMENT_GUIDE.md`
- SEO Guide: `SEO_IMPLEMENTATION_COMPLETE.md`
- Quick Start: `QUICK_START_CHECKLIST.md`

**Scripts:**
- Pre-build: `scripts/pre-build.sh`
- Verification: `scripts/verify-deployment.sh`

**Issues?**
1. Check pre-build script output
2. Run verification script
3. Review troubleshooting section above

---

**Last Updated:** April 28, 2026
**Status:** ✅ Production Ready
**Build Time:** ~25-30 seconds
**Files Generated:** 150+ files in dist/
