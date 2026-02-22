# Bug Report: `openclaw configure --section models` doesn't persist provider config or API keys

**Version:** OpenClaw 2026.2.19-2 (commit 45d9b20)  
**Environment:** Linux (Node.js v22.22.0)

## Description

Running `openclaw configure --section models` to add/configure a model provider (e.g., Anthropic) does **not** persist:
- The provider entry in `models.providers` (config file)
- The API key in the credentials directory

However, `openclaw onboard` **does** correctly persist both.

## Steps to Reproduce

1. Run `openclaw configure --section models`
2. Follow the interactive wizard to add the Anthropic provider and API key
3. Restart the OpenClaw gateway: `openclaw gateway restart`
4. Check config and credentials:
   - `models.providers` in config — no `anthropic` provider entry
   - Credentials directory — no Anthropic API key file (despite `anthropic:default` auth profile existing)

## Expected Behavior

`openclaw configure --section models` should persist provider configuration and API keys the same way `openclaw onboard` does.

## Actual Behavior

- Config shows agent default model as `anthropic/claude-sonnet-4.5`
- No `anthropic` provider in `models.providers`
- No Anthropic API key stored in credentials
- Gateway reports: "No anthropic provider in models.providers" and "No Anthropic API key stored"
- Running `openclaw onboard` after this **does** correctly persist the provider and API key

## Evidence

Screenshot 1: After `openclaw configure`, no provider config or API key persisted  
Screenshot 2: After `openclaw onboard`, model and token are correctly configured

**Attachments:**
- `/home/rm/.openclaw/media/inbound/7f3f6f87-7789-47cf-a186-506fe5c12f48.png` (Screenshot 1)
- `/home/rm/.openclaw/media/inbound/f77e133b-b765-4d25-b424-0d5d74d42283.png` (Screenshot 2)

## Workaround

Use `openclaw onboard` instead of `openclaw configure --section models`.

## Impact

Users following the docs/suggested command (`openclaw configure --section models`) will not have working provider configuration and will need to re-run `openclaw onboard`.
