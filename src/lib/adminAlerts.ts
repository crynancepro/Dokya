// Admin Emergency Sound & Push Notification Manager
// Uses Web Audio API for guaranteed cross-platform loud looping sirens + Web Notification API

let audioCtx: AudioContext | null = null;
let alarmInterval: any = null;
let isPlaying = false;
let currentOscillator: OscillatorNode | null = null;
let currentGainNode: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a continuous, high-urgency emergency siren tone in a loop until explicitly stopped.
 */
export function startEmergencyAlarm(): void {
  if (isPlaying) return;
  isPlaying = true;

  try {
    const ctx = getAudioContext();
    let step = 0;

    const playToneStep = () => {
      if (!isPlaying) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // High contrast two-tone frequency (siren)
        const freq = step % 2 === 0 ? 880 : 1240; // A5 and D#6
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Volume ramp up and down for siren burst
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);

        step++;
      } catch (err) {
        console.warn('[Alarm WebAudio Step Error]:', err);
      }
    };

    // Immediate first tone
    playToneStep();
    alarmInterval = setInterval(playToneStep, 350);
  } catch (err) {
    console.warn('[Alarm WebAudio Init Error]:', err);
  }
}

/**
 * Stops the looping emergency siren.
 */
export function stopEmergencyAlarm(): void {
  isPlaying = false;
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (currentOscillator) {
    try {
      currentOscillator.stop();
      currentOscillator.disconnect();
    } catch (_e) {}
    currentOscillator = null;
  }
  if (currentGainNode) {
    try {
      currentGainNode.disconnect();
    } catch (_e) {}
    currentGainNode = null;
  }
}

export function isEmergencyAlarmActive(): boolean {
  return isPlaying;
}

/**
 * Requests browser notification permissions.
 */
export async function requestAdminNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

/**
 * Sends a high-priority system browser notification (works in background).
 */
export function triggerAdminPushNotification(title: string, body: string, onClick?: () => void): void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/src/assets/images/dokya_ai_logo_1788695212236.jpg',
        badge: '/src/assets/images/dokya_ai_logo_1788695212236.jpg',
        tag: 'dokya-admin-urgent-alert',
        requireInteraction: true, // Remains on screen until clicked
      });

      notif.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notif.close();
      };
    } catch (err) {
      console.warn('[Push Notification Error]:', err);
    }
  }
}
