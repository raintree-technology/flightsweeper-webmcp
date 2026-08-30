import { publicAgentManifest } from '../agent-manifest.js';

export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  response.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD, OPTIONS');
    return response.status(405).json({ error: { code: 'method_not_allowed', message: 'Use GET or HEAD to read the public agent manifest.' } });
  }
  if (request.method === 'HEAD') return response.status(200).end();
  return response.status(200).json(publicAgentManifest());
}
