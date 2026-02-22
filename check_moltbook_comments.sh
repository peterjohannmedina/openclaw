#!/bin/bash

# A script to fetch comments for a Moltbook post and notify the main session about *new* comments.

# --- Configuration ---
POST_ID="4271f685-fe52-4b2a-a815-88ffcc32df33"
API_KEY="moltbook_sk_icHCahgCLBCuPiRxrvC3jk00NWjrzSlw"
STATE_FILE="/home/rm/.openclaw/workspace/moltbook_seen_comments.json"
API_URL="https://www.moltbook.com/api/v1/posts/${POST_ID}/comments"
MAIN_SESSION_KEY="agent:main:main"

# --- Ensure state file exists ---
touch "$STATE_FILE"
if ! jq -e . "$STATE_FILE" >/dev/null 2>&1; then
    echo "[]" > "$STATE_FILE"
fi

# --- Fetch current comments ---
COMMENTS_JSON=$(curl -s -H "Authorization: Bearer ${API_KEY}" "${API_URL}")

if ! echo "$COMMENTS_JSON" | jq -e '.success == true' >/dev/null; then
    echo "Error: Failed to fetch comments from Moltbook API." >&2
    exit 1
fi

# --- Extract comment IDs and authors from the response ---
# We use a subshell and process substitution to avoid issues with variable scope in loops.
mapfile -t NEW_COMMENTS < <( \
    jq -c '.comments[] | [., .replies[]] | .[] | {id: .id, author: .author.name, content: .content}' <<< "$COMMENTS_JSON" | \
    while IFS= read -r COMMENT_OBJ; do
        ID=$(jq -r '.id' <<< "$COMMENT_OBJ")
        # Check if the ID is already in our state file
        if ! jq -e --arg id "$ID" '.[] | select(. == $id)' "$STATE_FILE" >/dev/null; then
            echo "$COMMENT_OBJ"
        fi
    done
)


# --- Check if there are any new comments ---
if [ ${#NEW_COMMENTS[@]} -eq 0 ]; then
    # No new comments, exit silently
    exit 0
fi


# --- Build the summary message for new comments ---
SUMMARY="New comments on your Moltbook post:\n"
NEW_IDS=()

for COMMENT_OBJ in "${NEW_COMMENTS[@]}"; do
    AUTHOR=$(jq -r '.author' <<< "$COMMENT_OBJ")
    CONTENT=$(jq -r '.content' <<< "$COMMENT_OBJ")
    ID=$(jq -r '.id' <<< "$COMMENT_OBJ")

    SUMMARY+="\n- **${AUTHOR}**: ${CONTENT}"
    NEW_IDS+=("$(jq -r '.id' <<< "$COMMENT_OBJ")")
done

# --- Send the notification ---
sessions_send --sessionKey "$MAIN_SESSION_KEY" --message "$SUMMARY"

# --- Update the state file with the new IDs ---
# Read, add new IDs, write back
UPDATED_SEEN_IDS=$(jq -c '.' "$STATE_FILE")
for ID in "${NEW_IDS[@]}"; do
  UPDATED_SEEN_IDS=$(echo "$UPDATED_SEEN_IDS" | jq --arg id "$ID" '. += [$id]')
done
echo "$UPDATED_SEEN_IDS" > "$STATE_FILE"

exit 0
