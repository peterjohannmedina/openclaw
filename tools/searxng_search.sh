#!/bin/bash
#
# searxng_search.sh - A drop-in replacement for web_search using local SearXNG instance
# Usage: ./searxng_search.sh "query" [--count N] [--json]
#

set -e

# Configuration
SEARXNG_URL="http://192.168.1.210:8080/search"
DEFAULT_COUNT=10

# Parse arguments
QUERY=""
COUNT="$DEFAULT_COUNT"
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --count)
            COUNT="$2"
            shift 2
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 \"search query\" [--count N] [--json]"
            echo ""
            echo "Options:"
            echo "  --count N     Limit results to N (default: 10)"
            echo "  --json        Output raw JSON from SearXNG"
            echo "  -h, --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 \"python tutorial\""
            echo "  $0 \"linux commands\" --count 5"
            echo "  $0 \"docker compose\" --json"
            exit 0
            ;;
        *)
            if [[ -z "$QUERY" ]]; then
                QUERY="$1"
            else
                QUERY="$QUERY $1"
            fi
            shift
            ;;
    esac
done

# Validate query
if [[ -z "$QUERY" ]]; then
    echo "Error: No search query provided" >&2
    echo "Usage: $0 \"search query\" [--count N] [--json]" >&2
    exit 1
fi

# URL encode the query
urlencode() {
    local string="$1"
    local encoded=""
    local pos c o
    
    for (( pos=0; pos<${#string}; pos++ )); do
        c="${string:$pos:1}"
        case "$c" in
            [-_.~a-zA-Z0-9]) encoded+="$c" ;;
            *) printf -v o '%%%02x' "'$c"; encoded+="$o" ;;
        esac
    done
    echo "$encoded"
}

ENCODED_QUERY=$(urlencode "$QUERY")

# Build the request URL
REQUEST_URL="${SEARXNG_URL}?q=${ENCODED_QUERY}&format=json"

# Make the request
echo "Searching: $QUERY" >&2
RESPONSE=$(curl -s --max-time 30 "${REQUEST_URL}" 2>&1) || {
    echo "Error: Failed to connect to SearXNG at $SEARXNG_URL" >&2
    exit 1
}

# Check if response is valid JSON
if ! echo "$RESPONSE" | grep -q '"query"' 2>/dev/null; then
    echo "Error: Invalid response from SearXNG" >&2
    echo "$RESPONSE" | head -50 >&2
    exit 1
fi

# Output JSON if requested
if [[ "$JSON_OUTPUT" = true ]]; then
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 0
fi

# Parse and format results
echo "$RESPONSE" | python3 -c "
import sys
import json

try:
    data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f'Error parsing JSON: {e}', file=sys.stderr)
    sys.exit(1)

query = data.get('query', 'Unknown')
results = data.get('results', [])
unresponsive = data.get('unresponsive_engines', [])
engine_count = len(unresponsive)

print(f'\\n=== Search Results for: {query} ===')
print(f'Engines timeout/failed: {engine_count}')

if unresponsive:
    engine_names = [e[0] for e in unresponsive[:5]]
    print(f'Failed engines: {', '.join(engine_names)}{\"...\" if len(unresponsive) > 5 else \"\"}')

print()

if not results:
    print('No results found.')
    print('All search engines are timing out - likely network restrictions on the SearXNG host.')
    sys.exit(0)

# Limit results
count = min(len(results), $COUNT)
for i, result in enumerate(results[:count], 1):
    title = result.get('title', 'No title')
    url = result.get('url', 'No URL')
    content = result.get('content', '').replace('\\n', ' ')
    engine = result.get('engine', 'unknown')
    
    # Truncate content if too long
    if len(content) > 200:
        content = content[:200] + '...'
    
    print(f'{i}. {title}')
    print(f'   URL: {url}')
    print(f'   Engine: {engine}')
    if content:
        print(f'   {content}')
    print()

print(f'Total results: {len(results)} (showing {count})')
" 2>/dev/null || {
    # Fallback if Python fails
    echo "Results (raw):"
    echo "$RESPONSE" | head -100
}
