import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleApiRequest } from './src/server/apiRouter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(async (req, res, next) => {
  if (req.url.startsWith('/api/')) {
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
    const handled = await handleApiRequest(req, res, url);
    if (handled) return;
  }
  next();
});

// Serve production static assets
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[J.A.R.V.I.S] Production server online at http://localhost:${PORT}`);
});
