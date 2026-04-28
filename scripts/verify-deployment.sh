#!/bin/bash

# Plus2AI Blog Deployment Verification Script
# Run this after deploying to production to verify all URLs are accessible

echo "=================================================="
echo "Plus2AI Blog Deployment Verification"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="https://learn.dataziv.com"

# URLs to check
declare -a URLS=(
    "/"
    "/robots.txt"
    "/sitemap.xml"
    "/og-image.png"
    "/blog/"
    "/blog/kcet-2026-solved-papers.html"
    "/blog/ai-prediction-kcet-neet-jee.html"
    "/KCET_2026/analysis_reports/forensic_audit/index.html"
    "/KCET_2026/analysis_reports/forensic_audit/report_viewer.html"
)

echo "Checking URLs..."
echo ""

SUCCESS=0
FAILED=0

for url in "${URLS[@]}"
do
    FULL_URL="${BASE_URL}${url}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FULL_URL")

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓${NC} ${FULL_URL} - OK (${HTTP_CODE})"
        SUCCESS=$((SUCCESS+1))
    else
        echo -e "${RED}✗${NC} ${FULL_URL} - FAILED (${HTTP_CODE})"
        FAILED=$((FAILED+1))
    fi
done

echo ""
echo "=================================================="
echo "Summary:"
echo -e "  ${GREEN}Successful:${NC} ${SUCCESS}"
echo -e "  ${RED}Failed:${NC} ${FAILED}"
echo "=================================================="
echo ""

# Check SEO meta tags on blog pages
echo "Checking SEO Meta Tags..."
echo ""

declare -a BLOG_URLS=(
    "/blog/kcet-2026-solved-papers.html"
    "/blog/ai-prediction-kcet-neet-jee.html"
)

for url in "${BLOG_URLS[@]}"
do
    FULL_URL="${BASE_URL}${url}"
    echo "Checking: ${FULL_URL}"

    # Check for title
    TITLE=$(curl -s "$FULL_URL" | grep -o '<title>.*</title>' | head -1)
    if [ -n "$TITLE" ]; then
        echo -e "  ${GREEN}✓${NC} Title tag found"
    else
        echo -e "  ${RED}✗${NC} Title tag missing"
    fi

    # Check for meta description
    META_DESC=$(curl -s "$FULL_URL" | grep -o 'meta name="description"' | head -1)
    if [ -n "$META_DESC" ]; then
        echo -e "  ${GREEN}✓${NC} Meta description found"
    else
        echo -e "  ${RED}✗${NC} Meta description missing"
    fi

    # Check for Open Graph tags
    OG_TAGS=$(curl -s "$FULL_URL" | grep -o 'meta property="og:' | head -1)
    if [ -n "$OG_TAGS" ]; then
        echo -e "  ${GREEN}✓${NC} Open Graph tags found"
    else
        echo -e "  ${RED}✗${NC} Open Graph tags missing"
    fi

    # Check for structured data
    JSON_LD=$(curl -s "$FULL_URL" | grep -o 'application/ld+json' | head -1)
    if [ -n "$JSON_LD" ]; then
        echo -e "  ${GREEN}✓${NC} Structured data (JSON-LD) found"
    else
        echo -e "  ${RED}✗${NC} Structured data missing"
    fi

    echo ""
done

echo "=================================================="
echo "Verification Complete!"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "1. Submit sitemap to Google Search Console:"
echo "   ${BASE_URL}/sitemap.xml"
echo ""
echo "2. Test social sharing:"
echo "   - Facebook: https://developers.facebook.com/tools/debug/"
echo "   - Twitter: https://cards-dev.twitter.com/validator"
echo ""
echo "3. Validate structured data:"
echo "   - https://search.google.com/test/rich-results"
echo ""
