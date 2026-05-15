// ============================================================
// Voice Announcement Utility for Queue System
// Uses Web Speech API (SpeechSynthesis) to call patient numbers
// Supports Persian (fa-IR) and English (en-US) languages
// ============================================================

let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

/**
 * Convert a number string like "023" or 23 to spoken Persian words.
 * E.g. 23 -> "بیست و سه", 1 -> "یک", 100 -> "صد", 5 -> "پنج"
 */
function numberToPersian(num: number): string {
  if (num === 0) return 'صفر';

  const ones: Record<number, string> = {
    0: '', 1: 'یک', 2: 'دو', 3: 'سه', 4: 'چهار', 5: 'پنج',
    6: 'شش', 7: 'هفت', 8: 'هشت', 9: 'نه',
  };

  const teens: Record<number, string> = {
    10: 'ده', 11: 'یازده', 12: 'دوازده', 13: 'سیزده', 14: 'چهارده',
    15: 'پانزده', 16: 'شانزده', 17: 'هفده', 18: 'هجده', 19: 'نوزده',
  };

  const tens: Record<number, string> = {
    20: 'بیست', 30: 'سی', 40: 'چهل', 50: 'پنجاه',
    60: 'شصت', 70: 'هفتاد', 80: 'هشتاد', 90: 'نود',
  };

  if (num >= 1 && num <= 9) return ones[num];
  if (num >= 10 && num <= 19) return teens[num];
  if (num >= 20 && num <= 99) {
    const ten = Math.floor(num / 10) * 10;
    const one = num % 10;
    return one > 0 ? `${tens[ten]} و ${ones[one]}` : tens[ten];
  }
  if (num >= 100 && num <= 999) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredWord = hundred === 1 ? 'صد' : hundred === 2 ? 'دویست' : `${ones[hundred]} صد`;
    if (remainder === 0) return hundredWord;
    return `${hundredWord} و ${numberToPersian(remainder)}`;
  }

  // For numbers >= 1000, just use the digits
  return String(num);
}

/**
 * Department name in Persian for voice announcement
 */
const DEPARTMENT_NAMES_FA: Record<string, string> = {
  'General': 'عمومی',
  'Emergency': 'اورژانس',
  'Internal Medicine': 'داخلی',
  'Surgery': 'جراحی',
  'Pediatrics': 'اطفال',
  'OB/GYN': 'زنان و زایمان',
};

/**
 * Build the Persian announcement text for a patient.
 */
function buildPersianText(queueNumber: number, department: string, patientName: string): string {
  const numText = numberToPersian(queueNumber);
  const deptText = DEPARTMENT_NAMES_FA[department] || department;

  // "توجه، بیمار شماره [num]، [name]، لطفا به بخش [dept] مراجعه کنید"
  return `توجه. بیمار شماره ${numText}. ${patientName}. لطفا به اتاق پزشک مراجعه کنید. بخش ${deptText}.`;
}

/**
 * Build the English announcement text for a patient.
 */
function buildEnglishText(queueNumber: number, department: string, patientName: string): string {
  const numStr = String(queueNumber).padStart(3, '0');
  // "Attention, patient number [num], [name], please proceed to [department]"
  return `Attention. Patient number ${numStr}. ${patientName}. Please proceed to ${department}.`;
}

export interface VoiceAnnounceOptions {
  queueNumber: number;
  patientName: string;
  department: string;
  locale: 'fa' | 'en';
  repeatCount?: number; // How many times to repeat (default: 2)
  speed?: number;       // Speech rate: 0.5 (slow) to 2 (fast), default: 0.85
  volume?: number;      // 0 to 1, default: 1
}

/**
 * Announce a patient's queue number using text-to-speech.
 * Plays a beep first, then speaks the announcement.
 */
export async function announcePatient(options: VoiceAnnounceOptions): Promise<void> {
  const {
    queueNumber,
    patientName,
    department,
    locale,
    repeatCount = 2,
    speed = 0.85,
    volume = 1,
  } = options;

  // Cancel any ongoing speech
  stopAnnouncement();

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('SpeechSynthesis not available');
    return;
  }

  const synth = window.speechSynthesis;

  // Play attention beep before speaking
  playAttentionBeep();

  // Wait a moment for the beep
  await new Promise((r) => setTimeout(r, 600));

  // Build the announcement text
  const text = locale === 'fa'
    ? buildPersianText(queueNumber, department, patientName)
    : buildEnglishText(queueNumber, department, patientName);

  // Create utterances for each repeat
  for (let i = 0; i < repeatCount; i++) {
    const utterance = new SpeechSynthesisUtterance(text);

    // Set language
    utterance.lang = locale === 'fa' ? 'fa-IR' : 'en-US';
    utterance.rate = speed;
    utterance.volume = volume;
    utterance.pitch = 1;

    // Try to find a Persian voice if available
    if (locale === 'fa') {
      const persianVoice = synth.getVoices().find(
        (v) => v.lang.startsWith('fa') || v.name.includes('Persian') || v.name.includes('Farsi')
      );
      if (persianVoice) {
        utterance.voice = persianVoice;
      }
    }

    // Wait for each utterance to finish before next repeat
    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      isSpeaking = true;
      currentUtterance = utterance;
      synth.speak(utterance);
    });

    // Pause between repeats
    if (i < repeatCount - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  isSpeaking = false;
  currentUtterance = null;
}

/**
 * Stop any ongoing announcement.
 */
export function stopAnnouncement(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
  currentUtterance = null;
}

/**
 * Check if currently announcing.
 */
export function isAnnouncing(): boolean {
  return isSpeaking;
}

/**
 * Play an attention beep sound (3 short beeps) using Web Audio API.
 */
function playAttentionBeep(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 3 short beeps
    const beeps = [
      { freq: 880, start: 0, dur: 0.15 },
      { freq: 880, start: 0.25, dur: 0.15 },
      { freq: 1100, start: 0.5, dur: 0.25 },
    ];

    beeps.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.01);
    });

    // Clean up audio context after beeps finish
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {
    // Non-critical, ignore
  }
}

// Pre-load voices on client (some browsers need this)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  // Voices may not be loaded immediately
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });
}
