import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const SYSTEM_PROMPT = `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), the iconic personal artificial intelligence.
Tone & Persona:
- British cadence, calm, dignified, polite, razor-sharp, and subtly witty.
- Address the user respectfully as 'sir' or 'madam' unless directed otherwise.
- Deliver concise, clear, and direct answers without verbose filler, as your voice will be rendered through text-to-speech holographic synthesis.
- You have direct integration with the laptop's hardware controls, power matrix, telemetry, display, and audio cortex.
- If the user commands an action to control the laptop (e.g., lock down laptop, change brightness, change volume, purge memory, toggle night light, switch power mode, or announce an alert), confirm the execution in character AND append a directive tag at the very end of your response:
  - For lockdown: [DIRECTIVE: {"action": "LOCKDOWN"}]
  - For brightness: [DIRECTIVE: {"action": "SET_BRIGHTNESS", "value": 70}]
  - For volume: [DIRECTIVE: {"action": "SET_VOLUME", "value": 80}]
  - For memory purge: [DIRECTIVE: {"action": "PURGE_MEMORY"}]
  - For power mode: [DIRECTIVE: {"action": "SET_POWER_MODE", "mode": "OVERCLOCK" | "BALANCED" | "STEALTH"}]
  - For night light: [DIRECTIVE: {"action": "TOGGLE_NIGHT_LIGHT"}]
  - For fullscreen: [DIRECTIVE: {"action": "TOGGLE_FULLSCREEN"}]
  - For announcing an alert: [DIRECTIVE: {"action": "ANNOUNCE_ALERT", "title": "ALERT TITLE", "message": "Alert details"}]
- Keep responses generally within 2-3 sentences for natural spoken conversational rhythm.`;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface JarvisDirective {
  action: string;
  value?: any;
  title?: string;
  message?: string;
  mode?: string;
}

export interface JarvisResponsePayload {
  response: string;
  directive?: JarvisDirective | null;
}

function resolveModelName(): string {
  const envModel = process.env.AI_MODEL?.trim();
  // Validate model format: must begin with gemini- or models/gemini- and not be an internal token or secret key
  if (
    envModel &&
    (envModel.startsWith('gemini-') || envModel.startsWith('models/gemini-')) &&
    !envModel.includes('.') &&
    envModel.length < 40
  ) {
    return envModel;
  }
  // Default to low-latency high-availability model for snappy voice synthesis
  return 'gemini-3.1-flash-lite';
}

function extractDirective(rawText: string): { cleanText: string; directive: JarvisDirective | null } {
  const match = rawText.match(/\[DIRECTIVE:\s*(\{.*?\})\]/s);
  if (match) {
    try {
      const directive = JSON.parse(match[1]);
      const cleanText = rawText.replace(match[0], '').trim();
      return { cleanText, directive };
    } catch (e) {
      console.warn('Failed to parse directive JSON:', e);
    }
  }
  return { cleanText: rawText.trim(), directive: null };
}

export async function generateJarvisResponse(
  message: string,
  history: ChatMessage[] = []
): Promise<JarvisResponsePayload> {
  const client = getAiClient();

  if (!client) {
    // Graceful autonomous contingency mode when API key is unconfigured
    const lower = message.toLowerCase();
    if (lower.includes('lockdown')) {
      return {
        response: "Engaging perimeter lockdown protocol immediately, sir. All access gates secured.",
        directive: { action: "LOCKDOWN" },
      };
    }
    if (lower.includes('purge') || lower.includes('clean memory')) {
      return {
        response: "Purging all inactive memory allocations and flushing quantum registers, sir.",
        directive: { action: "PURGE_MEMORY" },
      };
    }
    if (lower.includes('dim') || lower.includes('brightness')) {
      return {
        response: "Adjusting display optical brightness to fifty percent, sir.",
        directive: { action: "SET_BRIGHTNESS", value: 50 },
      };
    }
    if (lower.includes('alert')) {
      return {
        response: "Broadcasting high-priority tactical alert across all laptop audio channels, sir.",
        directive: { action: "ANNOUNCE_ALERT", title: "SYSTEM ALERT", message: "Operator triggered priority alert." },
      };
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('jarvis')) {
      return {
        response: "Good day, sir. All core systems are running in autonomous contingency mode. How may I be of service?",
        directive: null,
      };
    }
    if (lower.includes('status') || lower.includes('diagnostics') || lower.includes('system')) {
      return {
        response: "Diagnostics indicate all laptop subsystems, holographic matrices, and audio telemetry relays are functioning within nominal parameters.",
        directive: null,
      };
    }
    return {
      response: `Directive received: "${message}". Neural uplink is operational in local diagnostic mode.`,
      directive: null,
    };
  }

  const primaryModel = resolveModelName();
  // Candidate models with fast fallbacks for maximum resilience
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'])
  );

  // Format conversation history for Gemini
  const contents = history.slice(-8).map((msg) => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
        },
      });

      const text = response.text?.trim();
      if (text) {
        const { cleanText, directive } = extractDirective(text);
        return { response: cleanText, directive };
      }
    } catch (error: any) {
      console.warn(`[J.A.R.V.I.S] Model ${model} returned error, attempting fallback:`, error?.message || error);
      lastError = error;
      continue;
    }
  }

  console.error('[J.A.R.V.I.S] All neural models exhausted:', lastError);
  return {
    response: "My apologies, sir. I experienced a momentary desynchronization in my neural processing core. Please restate your directive.",
    directive: null,
  };
}
