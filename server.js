/**
 * Local development API server.
 * Mirrors Vercel serverless routes in /api for payment, Rusdi, admin, and chat flows.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.API_PORT || 5000);

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

function adaptHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  };
}

async function mountRoute(path, modulePath) {
  const module = await import(modulePath);
  const handler = module.default;
  if (typeof handler !== 'function') {
    throw new Error(`Route ${path} does not export a default handler`);
  }
  app.all(path, adaptHandler(handler));
}

const routes = [
  ['/api/health', './api/health.js'],
  ['/api/register', './api/register.js'],
  ['/api/auth/register', './api/auth/register.js'],
  ['/api/payments', './api/payments.js'],
  ['/api/payments/invoices', './api/payments/invoices.js'],
  ['/api/payments/verify', './api/payments/verify.js'],
  ['/api/lawyer/consultations', './api/lawyer/consultations.js'],
  ['/api/consultations/status', './api/consultations/status.js'],
  ['/api/admin', './api/admin.js'],
  ['/api/chat', './api/chat.js'],
  ['/api/calls', './api/calls.js'],
  ['/api/reviews', './api/reviews.js'],
  ['/api/rusdi/chat', './api/rusdi/chat.js'],
  ['/api/rusdi/case-analysis', './api/rusdi/case-analysis.js'],
  ['/api/rusdi/lawyer-recommendation', './api/rusdi/lawyer-recommendation.js'],
  ['/api/ai-chat', './api/ai-chat.js'],
  ['/api/ai-case-analysis', './api/ai-case-analysis.js'],
  ['/api/ai-lawyer-recommendation', './api/ai-lawyer-recommendation.js']
];

for (const [path, modulePath] of routes) {
  await mountRoute(path, modulePath);
}

app.get('/api', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'YDA LAW OFFICE & Partners API is running. Use specific endpoints under /api/*.',
    health: `/api/health`
  });
});

app.listen(PORT, () => {
  console.log('=================================');
  console.log('YDA LAW OFFICE & Partners local API server running');
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log('Database: Supabase (via service role in .env)');
  console.log('Payments: Manual verification (bank transfer / e-wallet / QRIS)');
  console.log('=================================');
});
