/**
 * Subtle audio feedback.
 *
 * Every cue is synthesised with the Web Audio API rather than shipped as an
 * audio file: five short tones cost nothing in the bundle, and there is no
 * decode step, no network request, and nothing to cache.
 *
 * Rules this module keeps to:
 *  - Nothing plays until the user has interacted with the page. The AudioContext
 *    is created on the first `play()` call, which only ever happens inside a
 *    click/keypress handler, so the browser's autoplay policy is satisfied by
 *    construction rather than by asking permission.
 *  - No loops, no background audio, no overlapping cues — one short envelope per
 *    event, then every node is disconnected.
 *  - Quiet by design. Peak gain is 0.07; these are meant to sit under the UI,
 *    not announce themselves.
 *  - A single preference switches the whole thing off, and it persists.
 */

export type SoundCue =
  | 'sessionComplete'
  | 'achievement'
  | 'notification'
  | 'uploadComplete'
  | 'aiResponse';

const STORAGE_KEY = 'sound-enabled';

/** Sounds are on unless the student turned them off. */
export const SOUND_DEFAULT_ENABLED = true;

/**
 * Read the stored preference. Safe on the server (returns the default), so it
 * can be used as a lazy `useState` initialiser without a hydration mismatch —
 * see the Next.js "preventing flash before hydration" guide.
 */
export function readSoundPreference(): boolean {
  if (typeof window === 'undefined') return SOUND_DEFAULT_ENABLED;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? SOUND_DEFAULT_ENABLED : stored === 'true';
  } catch {
    // Private browsing, storage disabled, quota — never let this throw into a render.
    return SOUND_DEFAULT_ENABLED;
  }
}

export function writeSoundPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    /* preference simply will not persist */
  }
}

/**
 * Each cue is a short list of [frequency, startOffset, duration] partials.
 * Intervals are chosen so the cues are distinguishable without being musical
 * enough to get stuck in someone's head:
 *   sessionComplete — a rising perfect fifth: "done"
 *   achievement     — a major triad arpeggio: the only cue that is meant to feel like a reward
 *   notification    — a single soft ping
 *   uploadComplete  — two quick equal notes: "received"
 *   aiResponse      — a low-to-mid step, quieter than the rest
 */
const CUES: Record<SoundCue, { partials: Array<[number, number, number]>; gain: number }> = {
  sessionComplete: { partials: [[587.33, 0, 0.16], [880, 0.09, 0.22]], gain: 0.07 },
  achievement: {
    partials: [[523.25, 0, 0.14], [659.25, 0.08, 0.14], [783.99, 0.16, 0.28]],
    gain: 0.07,
  },
  notification: { partials: [[784, 0, 0.14]], gain: 0.05 },
  uploadComplete: { partials: [[659.25, 0, 0.09], [659.25, 0.11, 0.14]], gain: 0.05 },
  aiResponse: { partials: [[440, 0, 0.1], [554.37, 0.07, 0.16]], gain: 0.035 },
};

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
/** Once the browser has refused to give us audio, stop trying every click. */
let unavailable = false;

function getContext(): AudioContext | null {
  if (unavailable) return null;
  if (context) return context;
  if (typeof window === 'undefined') return null;

  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) {
    unavailable = true;
    return null;
  }

  try {
    context = new Ctor();
    return context;
  } catch {
    unavailable = true;
    return null;
  }
}

/**
 * Play a cue. A no-op when sounds are off, when the tab is hidden (a chime from
 * a background tab is never welcome), or when Web Audio is unavailable.
 *
 * Never throws — audio failing is not worth breaking an interaction over.
 */
export function playSound(cue: SoundCue): void {
  if (typeof window === 'undefined') return;
  if (!readSoundPreference()) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

  const ctx = getContext();
  if (!ctx) return;

  // Created before the first gesture in some browsers, or suspended after the
  // tab was backgrounded. `resume()` inside a gesture is allowed.
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});

  const { partials, gain } = CUES[cue];
  const start = ctx.currentTime;

  for (const [frequency, offset, duration] of partials) {
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();

    // A sine with a soft envelope; anything richer reads as a game sound.
    osc.type = 'sine';
    osc.frequency.value = frequency;

    const t0 = start + offset;
    envelope.gain.setValueAtTime(0.0001, t0);
    envelope.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(envelope);
    envelope.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
    // Release the graph so repeated cues cannot accumulate nodes.
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
    };
  }
}

/** Plays a cue so the student can hear what they are enabling. */
export function previewSound(): void {
  playSound('achievement');
}
