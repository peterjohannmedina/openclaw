# @openclaw/discord-signature-middleware

Express middleware to verify Discord interaction signatures (Ed25519).

Features
- Verifies x-signature-ed25519 + x-signature-timestamp
- Raw-body saver helper for express.raw integration
- Replay protection (configurable TTL)

Environment
- DISCORD_PUBLIC_KEY (hex) must be set in the process environment

Usage
```javascript
// javascript
import express from 'express';
import bodyParser from 'body-parser';
import { rawBodySaver, discordSignatureMiddleware } from '@openclaw/discord-signature-middleware';

const app = express();
app.use(bodyParser.raw({ type: '*/*' }));
app.use(rawBodySaver);

app.post('/discord/interactions', discordSignatureMiddleware(), (req, res) => {
  // handle verified interaction
  res.json({ type: 1 });
});

app.listen(3000);
```

Security
- Do NOT store bot tokens or private keys in repo files. Store tokens in a vault or environment variables.
- Rotate bot tokens regularly.

Testing
- Jest + supertest sample provided in tests/

License: MIT