import type { IncomingMessage, ServerResponse } from 'http';
import { generateJarvisResponse, type ChatMessage } from './aiService.js';
import { getSystemTelemetry } from './systemService.js';

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<boolean> {
  const pathname = url.pathname;

  // Enable JSON response helper
  const sendJson = (statusCode: number, data: any) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end(JSON.stringify(data));
  };

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return true;
  }

  // GET /api/system - Real system telemetry
  if (pathname === '/api/system' && req.method === 'GET') {
    const telemetry = getSystemTelemetry();
    sendJson(200, telemetry);
    return true;
  }

  // POST /api/chat - JARVIS AI dialogue & directives
  if (pathname === '/api/chat' && req.method === 'POST') {
    try {
      let bodyStr = '';
      for await (const chunk of req) {
        bodyStr += chunk;
      }

      const body = bodyStr ? JSON.parse(bodyStr) : {};
      const message: string = (body.message || '').trim();
      const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

      if (!message) {
        sendJson(400, { error: 'Directive or query prompt is required, sir.' });
        return true;
      }

      const result = await generateJarvisResponse(message, history);

      sendJson(200, {
        response: result.response,
        directive: result.directive || null,
        timestamp: Date.now(),
        status: 'OK',
      });
      return true;
    } catch (err: any) {
      console.error('API Error /api/chat:', err);
      sendJson(500, {
        error: 'Neural relay failure',
        details: err?.message || 'Unknown processing error',
      });
      return true;
    }
  }

  return false;
}
