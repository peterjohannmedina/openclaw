#!/bin/bash
#
# GitHub Trending Repos Reporter
# Fetches top 5 trending repositories related to "openclaw" on GitHub,
# ensuring the results are unique from the previous day's report.
#

# --- CONFIGURATION ---
SEARCH_QUERY="openclaw"
HISTORY_FILE="/home/rm/.openclaw/workspace/memory/github_trending_history.json"
REPORT_SESSION="agent:main:main" # Send report back to the main session

# --- SCRIPT ---

echo "🔎 Starting daily GitHub trending report for '$SEARCH_QUERY'..."

# Ensure history file exists
if [ ! -f "$HISTORY_FILE" ]; then
    echo "[]" > "$HISTORY_FILE"
fi

# Get today's trending repos from GitHub API (sorted by stars, limited to 30 to find new ones)
# Note: This uses the public, unauthenticated API. Rate limits are generous but not unlimited.
API_URL="https://api.github.com/search/repositories?q=${SEARCH_QUERY}&sort=stars&order=desc&per_page=30"
TODAY_REPOS=$(curl -s -H "Accept: application/vnd.github.v3+json" "$API_URL" | jq -r '[.items[] | {full_name: .full_name, html_url: .html_url, description: .description, stars: .stargazers_count, language: .language}]')

# Get yesterday's list of repos
YESTERDAY_REPOS=$(cat "$HISTORY_FILE")

# Filter out repositories that were present yesterday
# We use jq to diff the arrays based on the 'full_name' key
UNIQUE_REPOS=$(echo "$TODAY_REPOS" | jq --argjson old "$YESTERDAY_REPOS" \
  '[.[] | select(.full_name as $name | $old | map(.full_name) | contains([$name]) | not)]')

# Take the top 5 new repos
TOP_5_NEW=$(echo "$UNIQUE_REPOS" | jq '.[0:5]')

# Prepare the report message
COUNT=$(echo "$TOP_5_NEW" | jq 'length')

if [ "$COUNT" -eq 0 ]; then
    REPORT_MESSAGE="No new trending repositories found for '$SEARCH_QUERY' today."
else
    REPORT_MESSAGE="## 📈 Top $COUNT New Trending GitHub Repos for '$SEARCH_QUERY'\n\n"
    
    # Format each repository into the message
    REPORT_MESSAGE+=$(echo "$TOP_5_NEW" | jq -r '.[] | 
      "### [" + .full_name + "](" + .html_url + ")\n" +
      "> " + .description + "\n\n" +
      "**Stars:** " + (.stars|tostring) + " | **Language:** " + .language + "\n---"')
fi

# Send the report to the main session
# (This requires the sessions_send tool to be available to the sub-agent)
# We will rely on the cron job's delivery mechanism instead for simplicity.
# For now, we just output the report.

echo "$REPORT_MESSAGE"

# Update the history file with today's full list for tomorrow's comparison
echo "$TODAY_REPOS" > "$HISTORY_FILE"

echo "✅ Report complete. History file updated."
