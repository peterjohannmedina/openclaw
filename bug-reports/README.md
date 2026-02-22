# Bug Report: Discord /status Model Display Mismatch

**Created:** 2026-02-21 10:30 AM PST  
**Status:** Ready for submission to GitHub

---

## Summary

Discord `/status` command shows **"opus 4.6"** but actual runtime uses **"claude-sonnet-4-5"**.

This is a display-only bug in the Discord integration — functionality is not affected.

---

## Files in This Directory

### 1. `github-issue-discord-status.md` ⭐
**Use this for GitHub submission**
- Concise issue description
- Ready to copy/paste into GitHub issue tracker
- 2.9 KB

### 2. `discord-status-model-mismatch.md`
**Detailed technical report**
- Complete analysis with evidence
- Root cause hypotheses
- Suggested fixes
- Attach to GitHub issue as additional context
- 6.1 KB

### 3. `SUBMIT_TO_GITHUB.md`
**Submission instructions**
- Manual web submission steps
- GitHub CLI commands
- Alternative submission methods

### 4. `README.md` (this file)
**Overview and quick start**

---

## Quick Submit

### Option A: Manual (Recommended)

1. Open: https://github.com/openclaw/openclaw/issues/new
2. Title: `Discord /status displays incorrect model name`
3. Copy content from: `github-issue-discord-status.md`
4. Attach file: `discord-status-model-mismatch.md`
5. Add labels: `bug`, `discord`
6. Submit

### Option B: GitHub CLI

```bash
gh issue create \
  --repo openclaw/openclaw \
  --title "Discord /status displays incorrect model name" \
  --body-file github-issue-discord-status.md \
  --label bug
```

---

## Evidence Summary

**What Discord Shows:**
```
Model: opus 4.6
```

**What's Actually Running:**
```
🧠 Model: anthropic/claude-sonnet-4-5 · 🔑 token sk-ant…kBRgAA
```

**Runtime Metadata:**
```
model=anthropic/claude-sonnet-4-5
default_model=anthropic/claude-sonnet-4-5
```

---

## Impact

- **Severity:** Low (display bug only)
- **User confusion:** High (misleading model information)
- **Functional impact:** None (actual model selection works correctly)

---

## Next Steps

1. ✅ Bug documented (comprehensive report created)
2. ⏳ Submit to GitHub (awaiting user action)
3. ⏳ Wait for maintainer response
4. ⏳ Test fix when available

---

## Location

All files: `/home/rm/.openclaw/workspace/bug-reports/`

```
bug-reports/
├── README.md (this file)
├── github-issue-discord-status.md (submit this)
├── discord-status-model-mismatch.md (attach this)
└── SUBMIT_TO_GITHUB.md (instructions)
```

---

**Ready for submission!** 🚀
