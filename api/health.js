import { handleOptions, sendJson } from './_runtime.js';

export default function handler(req, res) {
  if (handleOptions(req, res)) return;

  sendJson(res, 200, {
    status: 'success',
    message: 'FINPROSE backend is running on Vercel with Supabase runtime.'
  });
}
