import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

/**
 * Express middleware to verify Discord interaction signatures (Ed25519).
 * Requirements:
 * - Set DISCORD_PUBLIC_KEY env var (hex).
 * - Use a raw body parser that sets req.rawBody (see integration example).
 */
export function discordSignatureMiddleware(req, res, next) {
  const signature = req.get('x-signature-ed25519') || req.get('X-Signature-Ed25519');
  const timestamp = req.get('x-signature-timestamp') || req.get('X-Signature-Timestamp');
  if (!signature || !timestamp) return res.status(401).send('Unauthorized');

  // Prefer the raw body saved by the body parser; fallback to JSON-stringified body
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
}

export default discordSignatureMiddleware;
