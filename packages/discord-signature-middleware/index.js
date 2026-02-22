import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

/**
 * Save raw body middleware for Express (use before body parsers that consume the stream)
 * Usage: app.use(express.raw({ type: '*/*' })); app.use(rawBodySaver);
 */
export function rawBodySaver(req, res, next) {
  if (req.body && Buffer.isBuffer(req.body)) req.rawBody = req.body;
  else if (typeof req.body === 'string') req.rawBody = Buffer.from(req.body, 'utf8');
  else req.rawBody = Buffer.from('');
  next();
}

/**
 * Express middleware to verify Discord interaction signatures (Ed25519).
 * Requires DISCORD_PUBLIC_KEY (hex) in env
 */
export function discordSignatureMiddleware(options = {}) {
  const ttl = options.ttlSeconds ?? 300; // reject requests older than this

  return function (req, res, next) {
    const signature = req.get('x-signature-ed25519') || req.get('X-Signature-Ed25519');
    const timestamp = req.get('x-signature-timestamp') || req.get('X-Signature-Timestamp');
    if (!signature || !timestamp) return res.status(401).send('Unauthorized');

    // timestamp replay protection
    const ts = Number(timestamp);
    if (Number.isNaN(ts)) return res.status(400).send('Bad Request');
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > ttl) return res.status(401).send('Stale request');

    const raw = req.rawBody ?? (req.body ? Buffer.from(JSON.stringify(req.body)) : Buffer.alloc(0));

    const publicKeyHex = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKeyHex) {
      console.error('DISCORD_PUBLIC_KEY not set');
      return res.status(500).send('Server misconfigured');
    }

    try {
      const publicKey = Buffer.from(publicKeyHex, 'hex');
      const msg = Buffer.concat([Buffer.from(timestamp, 'utf8'), raw]);
      const sig = Buffer.from(signature, 'hex');

      const verified = nacl.sign.detached.verify(
        new Uint8Array(msg),
        new Uint8Array(sig),
        new Uint8Array(publicKey)
      );

      if (!verified) return res.status(401).send('Invalid request signature');
      return next();
    } catch (err) {
      console.error('Signature verification error:', err);
      return res.status(400).send('Bad Request');
    }
  };
}

export default discordSignatureMiddleware;