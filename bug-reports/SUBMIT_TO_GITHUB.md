# How to Submit Bug Report to GitHub

## Quick Submit (Copy/Paste)

1. **Go to:** https://github.com/openclaw/openclaw/issues/new
2. **Title:** `Discord /status displays incorrect model name`
3. **Copy content from:** `github-issue-discord-status.md`
4. **Attach:** `discord-status-model-mismatch.md` (detailed report)
5. **Submit**

---

## Automated Submit (if you have GitHub CLI)

```bash
# Install GitHub CLI if needed
# sudo apt install gh

# Login to GitHub
gh auth login

# Create issue from file
gh issue create \
  --repo openclaw/openclaw \
  --title "Discord /status displays incorrect model name" \
  --body-file /home/rm/.openclaw/workspace/bug-reports/github-issue-discord-status.md \
  --label bug
```

---

## Manual Submit via Web

### Step 1: Navigate to Issues
Open: https://github.com/openclaw/openclaw/issues/new

### Step 2: Fill Form

**Title:**
```
Discord /status displays incorrect model name
```

**Description:**
Open and copy: `/home/rm/.openclaw/workspace/bug-reports/github-issue-discord-status.md`

### Step 3: Add Labels (if available)
- `bug`
- `discord`
- `display`

### Step 4: Attach Detailed Report
- Click "Attach files by dragging & dropping"
- Upload: `/home/rm/.openclaw/workspace/bug-reports/discord-status-model-mismatch.md`

### Step 5: Submit
Click "Submit new issue"

---

## Files Created

1. **github-issue-discord-status.md** (2.9 KB)
   - Formatted GitHub issue ready to copy/paste
   - Concise summary for issue tracker

2. **discord-status-model-mismatch.md** (6.1 KB)
   - Comprehensive bug report
   - Full evidence and analysis
   - Attach to GitHub issue

3. **SUBMIT_TO_GITHUB.md** (this file)
   - Submission instructions

---

## Alternative: Email to Maintainers

If GitHub submission doesn't work, you can email the bug report to OpenClaw maintainers (check repo README for contact info).

Attach both files:
- `github-issue-discord-status.md`
- `discord-status-model-mismatch.md`

---

**Location:** `/home/rm/.openclaw/workspace/bug-reports/`
