/**
 * API Service for Chatbot
 * Centralized API calls with error handling
 */
// Firebase auth removed — no auth headers used now

// Default to a relative `/api` path so the Vite dev proxy handles local requests.
// In production use `VITE_API_URL` (see .env.production).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
const IMAGE_DESCRIBE_URL = import.meta.env.VITE_IMAGE_DESCRIBE_URL ?? `${API_BASE_URL}/image/describe`;
const IMAGE_GENERATE_URL = import.meta.env.VITE_IMAGE_GENERATE_URL ?? `${API_BASE_URL}/image/generate`;

/**
 * Helper function to build request headers (no Firebase auth)
 */
async function getAuthHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  // If a Firebase ID token has been registered (via setFirebaseIdToken), include it.
  try {
    const token = window.localStorage.getItem('FIREBASE_ID_TOKEN');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {
    // ignore
  }
  return headers;
}

/**
 * Allow app to register a Firebase ID token (e.g. after client-side sign-in).
 * Stores token in localStorage so subsequent API requests include it.
 */
export function setFirebaseIdToken(token) {
  try {
    if (token) window.localStorage.setItem('FIREBASE_ID_TOKEN', token);
    else window.localStorage.removeItem('FIREBASE_ID_TOKEN');
  } catch (e) {
    console.warn('Unable to persist Firebase ID token', e);
  }
}

/**
 * Send message to AI backend
 */
export async function sendMessage(message, options = {}) {
  try {
    const {
      conversationId,
      tone,
      verbosity,
      memory,
      preset,
    } = options || {};

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: await getAuthHeaders(true),
      body: JSON.stringify({
        message,
        timestamp: new Date().toISOString(),
        conversation_id: conversationId ?? undefined,
        tone,
        verbosity,
        memory,
        preset,
      }),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).detail || ''; } catch (e) { /* no JSON body */ }
      throw new Error(detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Send message and stream the AI reply as it is generated (SSE).
 * handlers.onDelta(fullTextSoFar, latestChunk) fires per chunk.
 * Resolves to { reply, conversation_id, bot_message_id }.
 */
export async function streamMessage(message, options = {}, handlers = {}) {
  const { conversationId, preset } = options || {};
  const { onDelta, onMeta } = handlers || {};

  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: await getAuthHeaders(true),
    body: JSON.stringify({
      message,
      timestamp: new Date().toISOString(),
      conversation_id: conversationId ?? undefined,
      preset,
    }),
  });

  if (!response.ok || !response.body) {
    let detail = '';
    try { detail = (await response.json()).detail || ''; } catch (e) { /* no JSON body */ }
    throw new Error(detail || `HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let meta = null;
  let botMessageId = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop(); // keep incomplete trailing event

    for (const evt of events) {
      let eventName = 'message';
      let data = '';
      for (const line of evt.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      let obj;
      try { obj = JSON.parse(data); } catch (e) { continue; }

      if (eventName === 'meta') {
        meta = obj;
        onMeta?.(obj);
      } else if (eventName === 'done') {
        botMessageId = obj.bot_message_id ?? null;
      } else if (eventName === 'error') {
        throw new Error(obj.message || 'The AI stream failed.');
      } else if (obj.delta) {
        full += obj.delta;
        onDelta?.(full, obj.delta);
      }
    }
  }

  return { reply: full, conversation_id: meta?.conversation_id ?? null, bot_message_id: botMessageId };
}

/**
 * Get chat history
 */
export async function getChatHistory(limit = 50) {
  try {
    const response = await fetch(`${API_BASE_URL}/history?limit=${limit}`, {
      headers: await getAuthHeaders(false),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
}

/**
 * List conversations
 */
export async function getConversations(limit = 50) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations?limit=${limit}`, {
      headers: await getAuthHeaders(false),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Fetch a conversation with its messages
 */
export async function getConversation(conversationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      headers: await getAuthHeaders(false),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Delete conversation
 */
export async function deleteConversation(conversationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(false),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Transcribe audio using Web Speech API (client-side)
 */
export function transcribeAudio(onResult) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error('Speech Recognition not supported');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => console.log('Recording started...');

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        onResult(transcript);
      }
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };

  return recognition;
}

/**
 * Rate message response
 */
export async function rateMessage(messageId, rating) {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/rating`, {
      method: 'POST',
      headers: await getAuthHeaders(true),
      body: JSON.stringify({ rating }), // 1 for thumbs up, -1 for thumbs down
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error rating message:', error);
    throw error;
  }
}

/**
 * Describe an uploaded image (requires backend support)
 * Expected response: { description: string } (or compatible)
 */
export async function describeImage(file) {
  if (!file) throw new Error('No file provided');

  const form = new FormData();
  form.append('image', file);

  const response = await fetch(IMAGE_DESCRIBE_URL, {
    method: 'POST',
    headers: await getAuthHeaders(false), // Fetch automatically sets multipart boundary
    body: form,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Generate an image from a prompt (requires backend support)
 * Expected response: { image_data_url: string }
 */
export async function generateImage(prompt, options = {}) {
  const text = String(prompt ?? '').trim();
  if (!text) throw new Error('No prompt provided');

  const { size } = options || {};

  const response = await fetch(IMAGE_GENERATE_URL, {
    method: 'POST',
    headers: await getAuthHeaders(true),
    body: JSON.stringify({ prompt: text, size: size ?? undefined }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function _jsonOrThrow(response) {
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).detail || ''; } catch (e) { /* no JSON body */ }
    throw new Error(detail || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

/**
 * Turn a free-text location (city/area) into coordinates.
 * Expected response: { lat, lon, display_name }
 */
export async function geocodeLocation(query) {
  const text = String(query ?? '').trim();
  if (!text) throw new Error('No location provided');

  const response = await fetch(`${API_BASE_URL}/hospitals/geocode?q=${encodeURIComponent(text)}`, {
    headers: await getAuthHeaders(false),
  });
  return _jsonOrThrow(response);
}

/**
 * Find real nearby hospitals/clinics for a coordinate pair (OpenStreetMap data).
 * Expected response: { hospitals: [{ id, name, kind, lat, lon, distance_km, address, phone }] }
 */
export async function findNearbyHospitals(lat, lon, radiusM = 5000) {
  const params = new URLSearchParams({ lat, lon, radius_m: radiusM });
  const response = await fetch(`${API_BASE_URL}/hospitals/nearby?${params.toString()}`, {
    headers: await getAuthHeaders(false),
  });
  return _jsonOrThrow(response);
}
