import { publicAgentManifest } from '../agent-manifest.js';

export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  response.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  return response.status(200).json(publicAgentManifest());
}
