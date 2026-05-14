// ============================================================
// Notification Sound Utility
// Plays HMS notification sound via HTML5 Audio with:
//   1. Audio-unlock on first user interaction (browser autoplay policy)
//   2. Web Audio API oscillator fallback if WAV fails
// ============================================================

let audioElement: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let isAudioUnlocked = false;

// ---- Audio unlock (browser autoplay policy) -----------------
function unlockAudio(): void {
  if (isAudioUnlocked) return;
  try {
    // Try creating/resuming AudioContext (unlocks on most browsers)
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Also try playing the WAV element silently to unlock HTML5 Audio
    if (!audioElement) {
      audioElement = new Audio('/sounds/notification.wav');
      audioElement.preload = 'auto';
    }
    audioElement.volume = 0.01; // near-silent
    const playPromise = audioElement.play();
    if (playPromise) {
      playPromise
        .then(() => {
          audioElement!.pause();
          audioElement!.currentTime = 0;
          audioElement!.volume = 0.5;
          isAudioUnlocked = true;
        })
        .catch(() => {
          // Even if play fails, AudioContext resume might have worked
          isAudioUnlocked = true;
        });
    }
  } catch {
    isAudioUnlocked = true; // don't keep retrying
  }
}

// Attach unlock listeners once (on first import, client-side only)
if (typeof window !== 'undefined') {
  const events = ['click', 'keydown', 'touchstart', 'pointerdown'] as const;
  const handler = () => {
    unlockAudio();
    // Remove all listeners after first interaction
    events.forEach((e) => window.removeEventListener(e, handler));
  };
  events.forEach((e) => window.addEventListener(e, handler, { once: true, passive: true }));
}

// ---- HTML5 Audio helper -------------------------------------
function getAudio(): HTMLAudioElement {
  if (!audioElement) {
    audioElement = new Audio('/sounds/notification.wav');
    audioElement.preload = 'auto';
    audioElement.volume = 0.5;
  }
  return audioElement;
}

// ---- Web Audio API fallback (oscillator beep) ---------------
function playFallbackBeep(type: NotificationSoundType): void {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const ctx = audioContext;
    const now = ctx.currentTime;

    // Different patterns per type
    const patterns: Record<NotificationSoundType, Array<{ freq: number; start: number; dur: number }>> = {
      info:         [{ freq: 600, start: 0, dur: 0.12 }],
      success:      [{ freq: 800, start: 0, dur: 0.1 }, { freq: 1000, start: 0.12, dur: 0.1 }],
      warning:      [{ freq: 500, start: 0, dur: 0.1 }, { freq: 700, start: 0.15, dur: 0.1 }, { freq: 500, start: 0.3, dur: 0.1 }],
      error:        [{ freq: 300, start: 0, dur: 0.15 }, { freq: 200, start: 0.2, dur: 0.2 }],
      appointment:  [{ freq: 880, start: 0, dur: 0.1 }, { freq: 1100, start: 0.12, dur: 0.1 }, { freq: 880, start: 0.24, dur: 0.1 }],
      urgent:       [{ freq: 1000, start: 0, dur: 0.08 }, { freq: 800, start: 0.1, dur: 0.08 }, { freq: 1000, start: 0.2, dur: 0.08 }, { freq: 800, start: 0.3, dur: 0.08 }],
    };

    const notes = patterns[type] || patterns.info;

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.01);
    });
  } catch {
    // Non-critical — ignore
  }
}

// ---- Public API ---------------------------------------------

export type NotificationSoundType = 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'urgent';

/**
 * Play the notification sound.
 * Tries HTML5 Audio first; falls back to Web Audio API oscillator.
 * Audio is unlocked on first user interaction for browser autoplay policy.
 */
export function playNotificationSound(type: NotificationSoundType = 'info'): void {
  try {
    // Ensure AudioContext is ready
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const audio = getAudio();

    // Volume adjustment based on urgency
    const volumeMap: Record<NotificationSoundType, number> = {
      info: 0.4,
      success: 0.45,
      warning: 0.55,
      error: 0.6,
      appointment: 0.5,
      urgent: 0.65,
    };
    audio.volume = volumeMap[type] ?? 0.5;
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        // WAV failed — use oscillator fallback
        playFallbackBeep(type);
      });
    }
  } catch {
    // HTML5 Audio failed entirely — use oscillator fallback
    playFallbackBeep(type);
  }
}

/** Test if audio playback is available */
export function canPlayAudio(): boolean {
  try {
    const audio = getAudio();
    return audio.readyState >= 2 || audio.canPlayType('audio/wav') !== '';
  } catch {
    return false;
  }
}
