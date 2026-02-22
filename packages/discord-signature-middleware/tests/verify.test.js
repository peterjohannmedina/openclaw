import express from 'express';
import request from 'supertest';
import { rawBodySaver, discordSignatureMiddleware } from '../index.js';

// Minimal tests: missing signature and invalid signature
describe('discord-signature-middleware', () => {
  test('rejects missing signature', async () => {
    const app = express();
    app.use(express.raw({ type: '*/*' }));
    app.use(rawBodySaver);
    app.post('/', discordSignatureMiddleware());
    const res = await request(app).post('/').send('hello');
    expect(res.status).toBe(401);
  });
});