Patch: Add @openclaw/discord-signature-middleware

Summary
- New package providing Express middleware to verify Discord Ed25519 interaction signatures.
- Includes rawBodySaver, middleware, tests, README, LICENSE, CHANGELOG and package.json.

Files added
- packages/discord-signature-middleware/index.js
- packages/discord-signature-middleware/package.json
- packages/discord-signature-middleware/README.md
- packages/discord-signature-middleware/tests/verify.test.js
- packages/discord-signature-middleware/CHANGELOG.md
- packages/discord-signature-middleware/LICENSE

Commit/Branch (local)

```bash
git checkout -b feat/discord-signature-middleware
git add packages/discord-signature-middleware
git commit -m "feat(discord): add Ed25519 signature verification middleware package"
```

PR instructions
- Push branch to fork and open PR against upstream main. Include CHANGELOG entry and CI.
- Add GH Actions job: run npm ci && npm test in packages/discord-signature-middleware

Security notes
- Ensure DISCORD_PUBLIC_KEY is provided via environment or secret manager.
- Remove any plaintext bot tokens from config before merge.

