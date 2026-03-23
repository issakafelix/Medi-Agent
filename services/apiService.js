/**
 * API Service for Chatbot
 * Centralized API calls with error handling
 */
import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-health-backend-mgcx.onrender.com/api';
const IMAGE_DESCRIBE_URL = import.meta.env.VITE_IMAGE_DESCRIBE_URL || `${API_BASE_URL}/image/describe`;
const IMAGE_GENERATE_URL = import.meta.env.VITE_IMAGE_GENERATE_URL || `${API_BASE_URL}/image/generate`;

/**
 * Helper function to retrieve Firebase tokens securely and map headers.
 */
async function getAuthHeaders(isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && auth.currentUser) {
    // Force refresh token if needed, keeping session secure
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
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
