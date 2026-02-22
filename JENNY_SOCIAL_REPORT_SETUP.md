# Jenny's Morning Social Media Report - Setup Guide

**Recipient:** Jenny (Discord user_id: 1372233289590505524)  
**Brands:** Lawrance Furniture, Rangoni Firenze  
**Delivery:** Discord DM, weekday mornings

---

## Social Media Channels Monitored

### Lawrance Furniture
- Facebook: https://www.facebook.com/lawrancefurniture
- Instagram: https://www.instagram.com/lawrancefurniture/

### Rangoni Firenze
- Instagram: https://instagram.com/rangonishoes
- TikTok: https://www.tiktok.com/@valentinarangonishoes
- YouTube: https://www.youtube.com/channel/UCCPHK3_J1EmWlIbFUCf9khA/videos

---

## Current Status

**Script:** `/home/rm/.openclaw/workspace/social_morning_report_jenny.sh`  
**Status:** ⏳ Placeholder report (awaiting MCP integration)

The script currently sends a placeholder report. To enable real post summaries, you need to:
1. Configure Firecrawl or ScrapeGraphAI MCP with API keys
2. OR set up social media API access (Facebook Graph API, Instagram API, TikTok API, YouTube Data API)

---

## Setup Cron Job

To schedule the report for weekday mornings, create a cron job.

### Example: Deliver at 8:00 AM PT on weekdays

```bash
# Add to OpenClaw cron (recommended)
# This will use OpenClaw's built-in cron system

# Or add to system cron
crontab -e
```

Add this line for 8:00 AM Monday-Friday (Pacific Time):

```cron
0 8 * * 1-5 /home/rm/.openclaw/workspace/social_morning_report_jenny.sh
```

### Using OpenClaw Cron (Recommended)

To create an OpenClaw cron job instead of system cron:

```bash
# Create cron job via OpenClaw CLI (if available)
# or manually add to openclaw.json cron configuration
```

Example OpenClaw cron config:

```json
{
  "id": "jenny-social-report",
  "agentId": "main",
  "name": "Jenny's Morning Social Media Report",
  "enabled": true,
  "schedule": {
    "kind": "cron",
    "expr": "0 8 * * 1-5",
    "tz": "America/Los_Angeles"
  },
  "sessionTarget": "isolated",
  "wakeMode": "now",
  "payload": {
    "kind": "agentTurn",
    "message": "/home/rm/.openclaw/workspace/social_morning_report_jenny.sh"
  },
  "delivery": {
    "mode": "none"
  }
}
```

---

## Test the Report Now

To test sending a report to Jenny immediately:

```bash
bash /home/rm/.openclaw/workspace/social_morning_report_jenny.sh
```

This will send a placeholder report to Jenny's Discord DMs.

---

## Upgrading to Real-Time Post Summaries

### Phase 1: MCP Integration (Recommended)

Once you configure Firecrawl or ScrapeGraphAI with API keys:

1. Update the script to call MCP tools:
   ```bash
   # Example: Use Firecrawl to scrape Instagram
   mcporter call firecrawl.scrape url:"https://www.instagram.com/rangonishoes" render_heavy_js:true
   
   # Example: Use ScrapeGraphAI to extract structured data
   mcporter call scrapegraph.smartscraper \
     user_prompt:"Extract the latest 3 posts with captions and timestamps" \
     website_url:"https://www.instagram.com/rangonishoes"
   ```

2. Parse the results and format into the report

### Phase 2: Social Media API Integration (Most Reliable)

For production-quality reports, use official APIs:

**Facebook/Instagram:**
- Get Facebook Graph API access token
- Use Graph API endpoints to fetch posts
- API: https://developers.facebook.com/docs/graph-api

**TikTok:**
- Apply for TikTok Developer access
- Use TikTok API to fetch videos
- API: https://developers.tiktok.com

**YouTube:**
- Get YouTube Data API key (Google Cloud)
- Use `playlistItems.list` endpoint
- API: https://developers.google.com/youtube/v3

---

## Customization Options

### Change Delivery Time

Edit the cron expression in the cron job:
- `0 8 * * 1-5` = 8:00 AM weekdays
- `0 7 * * 1-5` = 7:00 AM weekdays
- `30 9 * * 1-5` = 9:30 AM weekdays

### Add More Brands

Edit `/home/rm/.openclaw/workspace/social_morning_report_jenny.sh` and add new channel URLs to the report template.

### Change Recipient

Edit the script and update `JENNY_USER_ID` to a different Discord user ID.

---

## Troubleshooting

### Report not sending
1. Check OpenClaw gateway is running: `openclaw gateway status`
2. Check Discord plugin is configured: `openclaw status`
3. Test Discord messaging manually: `openclaw message send --channel discord --target 1372233289590505524 --message "Test"`

### Cron not running
1. Check cron logs: `journalctl -u cron` or `/var/log/syslog`
2. Verify script is executable: `ls -l /home/rm/.openclaw/workspace/social_morning_report_jenny.sh`
3. Test script manually: `bash /home/rm/.openclaw/workspace/social_morning_report_jenny.sh`

---

## Next Steps

1. ✅ Script created and ready
2. ⏳ Configure cron schedule (choose delivery time)
3. ⏳ Add Firecrawl or ScrapeGraphAI API keys (from tomorrow's setup)
4. ⏳ Upgrade script to fetch real posts via MCP
5. ⏳ Test and refine report format with Jenny

---

**Files Created:**
- Script: `/home/rm/.openclaw/workspace/social_morning_report_jenny.sh`
- Setup Guide: `/home/rm/.openclaw/workspace/JENNY_SOCIAL_REPORT_SETUP.md`
- Social data: `/tmp/lawrance/social-report.json`, `/tmp/rangonistore/social-report.json`
