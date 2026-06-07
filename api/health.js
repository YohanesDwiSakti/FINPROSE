import { handleOptions, sendJson } from './_runtime.js';

export default function handler(req, res) {
  if (handleOptions(req, res)) return;

  sendJson(res, 200, {
    status: 'success',
    message: 'YDA LAW OFFICE & Partners backend is running on Vercel with Supabase runtime.'
  });
}
