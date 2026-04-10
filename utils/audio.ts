type LegacyAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;
let audioContextState: 'open' | 'closed' = 'open';

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  const audioWindow = window as LegacyAudioWindow;
  const AudioContextCtor = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;

  // Use the real context state instead of a separate tracking variable
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextCtor();
    audioContextState = 'open';
  }

  // Resume suspended context (e.g. after user interaction policy)
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }

  return audioContext;
};

export const playSuccessSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  try {
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (error) {
    console.error('Audio play failed', error);
  }
};
