import {
  getServiceClient, getClientIp, checkRateLimit,
  jsonResponse, errorResponse,
} from './_shared/supabase.js';

export default async function handler(req) {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse('AI analysis not configured', 500);
  }

  try {
    const { sessionId, images } = await req.json();
    const ip = getClientIp(req);
    const supabase = getServiceClient();

    // Rate limit: 10 analyses per IP per hour
    const allowed = await checkRateLimit(supabase, ip, 'analyze-photos', 3600, 10);
    if (!allowed) {
      return errorResponse('Too many analysis requests. Please wait.', 429);
    }

    // Verify upload session if provided
    if (sessionId) {
      const { data: session } = await supabase
        .from('upload_sessions')
        .select('id, status, expires_at')
        .eq('id', sessionId)
        .single();

      if (!session || session.status !== 'active' || new Date(session.expires_at) < new Date()) {
        return errorResponse('Invalid or expired upload session');
      }
    }

    if (!images || !images.length) {
      return errorResponse('No images provided');
    }

    const imageContent = images.slice(0, 10).map(img => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType,
        data: img.data,
      },
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContent,
              {
                type: 'text',
                text: `You are analyzing photos of junk/items for a junk removal service. Identify each distinct item you can see. Return ONLY a JSON array of objects with this format:
[{"item": "item name", "quantity": 1}]

Common items to look for: couch, loveseat, recliner, mattress, box spring, bed frame, dresser, nightstand, desk, office chair, dining table, dining chairs, TV, monitor, refrigerator, washer, dryer, dishwasher, microwave, cardboard boxes, trash bags, tires, lumber/wood, carpet/padding, exercise equipment, bookshelf, filing cabinet, lawn mower, grill.

Be specific but concise. Estimate quantities. Only return the JSON array, nothing else.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return errorResponse('AI analysis failed', 500);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';

    let items;
    try {
      items = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      items = match ? JSON.parse(match[0]) : [];
    }

    return jsonResponse({ items });
  } catch (e) {
    console.error('analyze-photos error:', e);
    return errorResponse('Analysis failed', 500);
  }
}

export const config = { path: '/api/analyze-photos' };
