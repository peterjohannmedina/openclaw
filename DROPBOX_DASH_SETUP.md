# Dropbox Dash MCP Server - Setup Guide

**Installation Location:** `/home/rm/.openclaw/workspace/mcp-server-dash`  
**Status:** ✅ Installed and ready for authentication

---

## Step 1: Create Dropbox App & Get API Credentials

### 1.1 Visit Dropbox Developer Portal
🔗 **Go to:** https://www.dropbox.com/developers/apps

### 1.2 Create New App
1. Click **"Create app"** button
2. Choose API:
   - ✅ Select: **Scoped access**
3. Choose Access Type:
   - ✅ Select: **Full Dropbox** access
4. Name Your App:
   - Example: `OpenClaw MCP Server`
   - (Name must be unique across all Dropbox apps)
5. Click **"Create app"**

### 1.3 Configure Permissions
After creating the app, go to the **Permissions** tab:

**Required Scopes:**
- ✅ `files.metadata.read` - Read file metadata
- ✅ `files.content.read` - Read file contents

Click **"Submit"** to save permissions.

### 1.4 Get Your App Key
1. Go to the **Settings** tab
2. Find the **"App key"** field
3. Copy the App key (looks like: `abc123xyz456...`)
4. **Save this key** - you'll need it for configuration

---

## Step 2: Configure the MCP Server

### 2.1 Set Environment Variable

**Option A: Use .env file (Recommended)**
```bash
cd /home/rm/.openclaw/workspace/mcp-server-dash
cp .env.example .env
nano .env
```

Add your App Key:
```bash
APP_KEY=your_dropbox_app_key_here
```

**Option B: Export as environment variable**
```bash
export APP_KEY=your_dropbox_app_key_here
```

### 2.2 Update mcporter Configuration

The mcporter config has already been updated with a placeholder:

**File:** `/home/rm/.openclaw/config/mcporter.json`

Replace `YOUR_DROPBOX_APP_KEY_HERE` with your actual App Key.

Then enable the server by changing:
```json
"enabled": false  →  "enabled": true
```

---

## Step 3: Authenticate with Dropbox

### 3.1 Run the MCP Server
```bash
cd /home/rm/.openclaw/workspace/mcp-server-dash
uv run src/mcp_server_dash.py
```

### 3.2 Get OAuth URL
Use mcporter to call the authentication tool:
```bash
mcporter --config /home/rm/.openclaw/config/mcporter.json call dropbox-dash.dash_get_auth_url
```

This will return an authorization URL.

### 3.3 Authorize the App
1. **Open the URL** in your browser
2. **Log in** to your Dropbox account (if not already logged in)
3. **Grant permissions** to your app
4. **Copy the authorization code** shown after approval

### 3.4 Complete Authentication
Use the code to complete OAuth:
```bash
mcporter --config /home/rm/.openclaw/config/mcporter.json call dropbox-dash.dash_authenticate auth_code:"YOUR_CODE_HERE"
```

**Success Message:**
- Account display name and email will be shown
- Token is stored securely in system keyring

---

## Step 4: Test the MCP Server

### Search Company Content
```bash
# Search for documents
mcporter --config /home/rm/.openclaw/config/mcporter.json call dropbox-dash.dash_company_search query:"project proposal"

# Filter by file type
mcporter --config /home/rm/.openclaw/config/mcporter.json call dropbox-dash.dash_company_search query:"budget" file_type:"spreadsheet"

# Search within date range
mcporter --config /home/rm/.openclaw/config/mcporter.json call dropbox-dash.dash_company_search query:"meeting notes" start_time:"2026-02-01T00:00:00Z" end_time:"2026-02-20T23:59:59Z"
```

### Get File Details
```bash
# Use UUID from search results
mcporter --config /home/rm/.openclaw/config/mcporter.json call dropbox-dash.dash_get_file_details uuid:"UUID_FROM_SEARCH_RESULTS"
```

---

## Available Tools

### 1. `dash_get_auth_url`
- **Purpose:** Start OAuth flow
- **Args:** None
- **Returns:** Authorization URL to open in browser

### 2. `dash_authenticate`
- **Purpose:** Complete OAuth with authorization code
- **Args:**
  - `auth_code` (string, required) - Code from browser after approval
- **Returns:** Account info on success

### 3. `dash_company_search`
- **Purpose:** Search all company content indexed by Dropbox Dash
- **Args:**
  - `query` (string, required) - Search text
  - `file_type` (string, optional) - Filter: document, image, video, audio, pdf, presentation, spreadsheet
  - `connector` (string, optional) - Filter by source: confluence, dropbox, github, gmail, google_drive, jira, slack, zoom, etc.
  - `start_time` (ISO 8601, optional) - Modified after this date
  - `end_time` (ISO 8601, optional) - Modified before this date
  - `max_results` (int, optional) - Default 20, max 100
- **Returns:** Formatted list of results with UUID, Type, URL, Preview, Description, etc.

### 4. `dash_get_file_details`
- **Purpose:** Fetch detailed metadata and content snippet
- **Args:**
  - `uuid` (string, required) - UUID from search results
- **Returns:** Full metadata (Title, Link, Creator, MIME type, Content preview)

---

## Token Management

### Where Tokens Are Stored
- **Keyring:** System keyring (service name: `mcp-server-dash`)
- **Fallback:** `~/.mcp-server-dash/dropbox_token.json`

### Clear Stored Token
```bash
cd /home/rm/.openclaw/workspace/mcp-server-dash
uv run src/mcp_server_dash.py --clear-token
```

---

## Integration with OpenClaw

Once configured and authenticated, Dropbox Dash MCP is available to OpenClaw agents via mcporter:

### Search from Agent
```bash
mcporter call dropbox-dash.dash_company_search query:"infrastructure docs"
```

### Use in Automation
```bash
# Example: Daily digest of new documents
#!/bin/bash
TODAY=$(date -u +"%Y-%m-%dT00:00:00Z")
mcporter call dropbox-dash.dash_company_search \
  query:"" \
  start_time:"$TODAY" \
  max_results:50
```

---

## Troubleshooting

### "Not authenticated" error
- Run `dash_get_auth_url` and complete OAuth flow
- Check if token is stored: `cat ~/.mcp-server-dash/dropbox_token.json`

### "Invalid App Key" error
- Verify App Key is correct in `.env` or mcporter config
- Check Dropbox app permissions are enabled

### "No results" from search
- Ensure Dropbox Dash is indexing your content
- Try broader search queries
- Check connector filters (some sources may not be indexed)

---

## Security Notes

- **App Key is sensitive:** Treat it like a password
- **Token storage:** Tokens are stored in system keyring for security
- **Permissions:** Only grant necessary scopes (files.metadata.read, files.content.read)
- **.env file:** Add `.env` to `.gitignore` (already done in repo)

---

## Next Steps

1. ✅ **Installation complete** - Dropbox Dash MCP installed at workspace
2. ⏳ **Get App Key** - Create Dropbox app and copy App Key
3. ⏳ **Configure mcporter** - Add App Key to config and enable
4. ⏳ **Authenticate** - Run OAuth flow and complete auth
5. ⏳ **Test search** - Search company content and verify results

---

**Quick Reference:**

- **Dropbox Developer Console:** https://www.dropbox.com/developers/apps
- **Repo:** https://github.com/dropbox/mcp-server-dash
- **Local Install:** `/home/rm/.openclaw/workspace/mcp-server-dash`
- **Config:** `/home/rm/.openclaw/config/mcporter.json`
