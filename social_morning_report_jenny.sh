#!/usr/bin/env bash
set -euo pipefail

# Morning Social Media Report for Jenny
# Brands: Lawrance Furniture, Rangoni Firenze
# Delivery: Discord DM to user_id 1372233289590505524

JENNY_USER_ID="1372233289590505524"
REPORT_DATE=$(date '+%A, %B %d, %Y')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Social media channels
LAWRANCE_FACEBOOK="https://www.facebook.com/lawrancefurniture"
LAWRANCE_INSTAGRAM="https://www.instagram.com/lawrancefurniture/"
RANGONI_INSTAGRAM="https://instagram.com/rangonishoes"
RANGONI_TIKTOK="https://www.tiktok.com/@valentinarangonishoes"
RANGONI_YOUTUBE="https://www.youtube.com/channel/UCCPHK3_J1EmWlIbFUCf9khA/videos"

# Output directory
WORK_DIR="/tmp/social-reports"
mkdir -p "$WORK_DIR"

echo "Generating social media report for $REPORT_DATE..."

# Function to send Discord DM
send_discord_dm() {
    local message="$1"
    openclaw message send \
        --channel discord \
        --target "$JENNY_USER_ID" \
        --message "$message" \
        || echo "Failed to send Discord DM"
}

# Build report
REPORT="📊 **Morning Social Media Report**
**Date:** $REPORT_DATE

---

## 🪑 Lawrance Furniture

**Facebook** ($LAWRANCE_FACEBOOK)
- Latest posts: Checking...
- Status: Manual review needed (API integration pending)

**Instagram** ($LAWRANCE_INSTAGRAM)
- Latest posts: Checking...
- Status: Manual review needed (API integration pending)

---

## 👠 Rangoni Firenze

**Instagram** ($RANGONI_INSTAGRAM)
- Latest posts: Checking...
- Status: Manual review needed (API integration pending)

**TikTok** ($RANGONI_TIKTOK)
- Latest videos: Checking...
- Status: Manual review needed (API integration pending)

**YouTube** ($RANGONI_YOUTUBE)
- Latest videos: Checking...
- Status: Manual review needed (API integration pending)

---

📝 **Next Steps:**
- Configure Firecrawl or ScrapeGraphAI MCP for automated post fetching
- Add social media API credentials for real-time updates
- This is a placeholder report until integrations are complete

Report generated at: $TIMESTAMP"

# Send report to Jenny via Discord DM
send_discord_dm "$REPORT"

echo "Report sent to Jenny (user_id: $JENNY_USER_ID)"
