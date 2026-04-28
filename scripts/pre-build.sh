#!/bin/bash

# Pre-build script for Plus2AI
# Ensures KCET_2026 forensic audit files are properly copied before build

set -e  # Exit on error

echo "🔧 Running pre-build setup..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Ensure public/KCET_2026 exists and is up to date
echo -e "${YELLOW}📁 Syncing KCET_2026 folder to public/...${NC}"

if [ -d "KCET_2026" ]; then
    # Remove old version in public if exists
    if [ -d "public/KCET_2026" ]; then
        rm -rf public/KCET_2026
    fi

    # Copy fresh version to public
    cp -r KCET_2026 public/
    echo -e "${GREEN}✓ KCET_2026 folder synced to public/${NC}"
else
    echo "⚠️  Warning: KCET_2026 folder not found in project root"
fi

# Step 2: Copy report_viewer.html to forensic_audit folder
echo -e "${YELLOW}📄 Copying report_viewer.html...${NC}"

REPORT_VIEWER_SOURCE="KCET_2026/analysis_reports/Claude/report_viewer.html"
REPORT_VIEWER_DEST_1="KCET_2026/analysis_reports/forensic_audit/"
REPORT_VIEWER_DEST_2="public/KCET_2026/analysis_reports/forensic_audit/"

if [ -f "$REPORT_VIEWER_SOURCE" ]; then
    # Copy to source KCET_2026 folder
    if [ -d "$REPORT_VIEWER_DEST_1" ]; then
        cp "$REPORT_VIEWER_SOURCE" "$REPORT_VIEWER_DEST_1"
        echo -e "${GREEN}✓ report_viewer.html copied to KCET_2026/analysis_reports/forensic_audit/${NC}"
    fi

    # Copy to public KCET_2026 folder
    if [ -d "$REPORT_VIEWER_DEST_2" ]; then
        cp "$REPORT_VIEWER_SOURCE" "$REPORT_VIEWER_DEST_2"
        echo -e "${GREEN}✓ report_viewer.html copied to public/KCET_2026/analysis_reports/forensic_audit/${NC}"
    fi
else
    echo "⚠️  Warning: report_viewer.html not found at $REPORT_VIEWER_SOURCE"
fi

# Step 3: Verify critical files exist
echo -e "${YELLOW}🔍 Verifying critical files...${NC}"

CRITICAL_FILES=(
    "public/blog/index.html"
    "public/blog/kcet-2026-solved-papers.html"
    "public/blog/ai-prediction-kcet-neet-jee.html"
    "public/sitemap.xml"
    "public/robots.txt"
    "public/og-image.png"
    "public/KCET_2026/analysis_reports/forensic_audit/index.html"
    "public/KCET_2026/analysis_reports/forensic_audit/report_viewer.html"
)

ALL_EXIST=true
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "❌ Missing: $file"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}✅ All critical files verified${NC}"
else
    echo -e "⚠️  Some files are missing. Build may be incomplete."
fi

echo -e "${GREEN}🎉 Pre-build setup complete!${NC}"
echo ""
