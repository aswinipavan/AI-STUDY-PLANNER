'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  playSound,
  previewSound,
  readSoundPreference,
  writeSoundPreference,
  type SoundCue,
} from '@/lib/soundFeedback';

/** Lets one toggle update every mounted consumer without a context provider. */
const SOUND_CHANGE_EVENT = 'app:sound-preference-change';

/**
 * Read/write the audio-feedback preference and fire cues.
 *
 * The initial value comes from a lazy `useState` initialiser that returns the
 * default on the server and the stored value in the browser — the pattern from
 * the Next.js "preventing flash before hydration" guide. Nothing here paints on
 * first render except the Settings toggle, which mounts client-side anyway.
 */
export function useSoundPreference() {
  const [enabled, setEnabled] = useState<boolean>(() => readSoundPreference());

  // Stay in sync with the toggle in Settings and with other tabs.
  useEffect(() => {
    const sync = () => setEnabled(readSoundPreference());
    window.addEventListener(SOUND_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SOUND_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setSoundEnabled = useCallback((next: boolean) => {
    writeSoundPreference(next);
    setEnabled(next);
    window.dispatchEvent(new Event(SOUND_CHANGE_EVENT));
    // Confirm the change audibly, but only when switching on.
    if (next) previewSound();
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!readSoundPreference());
  }, [setSoundEnabled]);

  // Stable identity: `playSound` re-reads the preference itself, so this does
  // not need `enabled` in its dependencies and never invalidates a memo.
  const play = useCallback((cue: SoundCue) => playSound(cue), []);

  return { soundEnabled: enabled, setSoundEnabled, toggleSound, play };
}
