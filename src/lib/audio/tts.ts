import type { NarrationEventKey } from './narration-events';
import { getFallbackNarration } from './narration';

const getPreferredVoice = (): SpeechSynthesisVoice | null => {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const preferred = [
    'Google US English',
    'Google UK English Male',
    'Google UK English Female',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Microsoft David Desktop - English (United States)',
    'Daniel',
    'Alex',
    'Arthur',
  ];

  for (const name of preferred) {
    const v = voices.find((voice) => voice.name === name);
    if (v) return v;
  }

  return (
    voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  );
};

// Track the currently-speaking utterance so we can let it finish
let currentResolve: (() => void) | null = null;

const doSpeak = (text: string, resolve: () => void): void => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.92;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voice = getPreferredVoice();
  if (voice) utterance.voice = voice;

  // 45s hard timeout — Chrome sometimes silently drops onend
  const hardTimeout = setTimeout(() => {
    currentResolve = null;
    resolve();
  }, 45_000);

  utterance.onend = () => {
    clearTimeout(hardTimeout);
    currentResolve = null;
    resolve();
  };
  utterance.onerror = () => {
    clearTimeout(hardTimeout);
    currentResolve = null;
    resolve();
  };

  currentResolve = resolve;
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  window.speechSynthesis.speak(utterance);
};

export const speak = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !text) {
      resolve();
      return;
    }

    const start = () => {
      const trySpeak = () => {
        if (window.speechSynthesis.getVoices().length > 0) {
          doSpeak(text, resolve);
        } else {
          window.speechSynthesis.addEventListener('voiceschanged', () => doSpeak(text, resolve), {
            once: true,
          });
        }
      };

      // Cancel any queued/playing speech, then wait 100ms for Chrome to settle
      window.speechSynthesis.cancel();
      currentResolve?.(); // resolve any old pending promise so callers unblock
      currentResolve = null;
      setTimeout(trySpeak, 100);
    };

    start();
  });
};

/** Stop current speech and unblock any waiting speak() callers. */
export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    currentResolve?.();
    currentResolve = null;
    window.speechSynthesis.cancel();
  }
};

/** Play a short bell ding via Web Audio API (timer expired signal). */
export const playDing = (): void => {
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
  } catch {
    // Audio not available
  }
};

/** Race a promise against a timeout; on timeout the original is abandoned. */
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

export const getNarrationLine = async (
  event: NarrationEventKey,
  context?: string
): Promise<string> => {
  if ('ai' in window) {
    try {
      const ai = (
        window as unknown as {
          ai: {
            languageModel: {
              create: () => Promise<{ prompt: (s: string) => Promise<string> }>;
            };
          };
        }
      ).ai;
      const session = await withTimeout(ai.languageModel.create(), 3000, null);
      if (session) {
        const prompt = [
          'You are the narrator of a Mafia party game. Speak in a dark, dramatic, theatrical tone.',
          `Generate one short narration line (1–2 sentences) for this game event: ${event}`,
          context ? `Context: ${context}` : '',
          'Respond with only the narration text — no quotes, no labels, no extra commentary.',
        ]
          .filter(Boolean)
          .join('\n');
        const result = await withTimeout(session.prompt(prompt), 3000, '');
        if (result?.trim()) return result.trim();
      }
    } catch {
      // fall through
    }
  }
  return getFallbackNarration(event, context);
};

/**
 * Generate + speak a narration line for a game event.
 * context: optional substitution value (e.g. seat number).
 */
export const narrateEvent = async (
  event: NarrationEventKey,
  context?: string
): Promise<void> => {
  const line = await getNarrationLine(event, context);
  await speak(line);
};

export const speakSeatNumber = (seatIndex: number): void => {
  speak(`Number ${seatIndex}`);
};
