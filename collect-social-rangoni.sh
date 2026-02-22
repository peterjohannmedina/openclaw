#!/bin/bash
set -euo pipefail

SITE="rangoni.com"
OUT_DIR="/tmp/rangoni"
mkdir -p "$OUT_DIR"

echo "Collecting social media links for $SITE..."

# Try direct fetch with insecure flag
wget --no-check-certificate -q -O "$OUT_DIR/index.html" "https://$SITE" || true

# Also try http
wget -q -O "$OUT_DIR/index-http.html" "http://$SITE" || true

# Extract all external links
cat "$OUT_DIR"/*.html 2>/dev/null | grep -Eoi 'href="[^"]+"|content="[^"]+"' | \
  grep -Eio '(https?://[^"]+)' | sort -u > "$OUT_DIR/all_links.txt" || true

# Filter for social media
grep -Ei '(twitter\.com|x\.com|facebook\.com|fb\.com|instagram\.com|linkedin\.com|youtube\.com|youtu\.be|tiktok\.com|threads\.net|github\.com|discord\.gg|discordapp\.com)' \
  "$OUT_DIR/all_links.txt" > "$OUT_DIR/social_links.txt" || true

# Also check meta tags
cat "$OUT_DIR"/*.html 2>/dev/null | grep -Eoi '<meta[^>]+>' | \
  grep -Ei '(twitter:|og:)' > "$OUT_DIR/meta_tags.txt" || true

echo "Results saved to $OUT_DIR"
echo "Social links found:"
cat "$OUT_DIR/social_links.txt" 2>/dev/null || echo "No social links found"
wc -l "$OUT_DIR/social_links.txt" 2>/dev/null || echo "0 social links"
