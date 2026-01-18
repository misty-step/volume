/**
 * Tactile Audio Engine
 *
 * Singleton module for managing tactile sound feedback.
 * Handles AudioContext lifecycle, buffer caching, and playback.
 *
 * Key design decisions:
 * - Singleton pattern prevents AudioContext limit (6-10 max per page)
 * - Lazy initialization on first user gesture (required by browsers)
 * - Buffer caching for instant playback
 */

// Singleton state
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let isInitialized = false;

// Sound data (will be set by init)
let soundDataUri: string | null = null;

/**
 * Set the sound data URI (Base64 encoded audio)
 * Call this once at app startup
 */
export function setSoundData(dataUri: string): void {
  soundDataUri = dataUri;
}

/**
 * Initialize audio context and decode buffer
 * Must be called from a user gesture handler
 */
export async function initAudio(): Promise<boolean> {
  if (isInitialized && audioContext && audioBuffer) {
    // Resume if suspended (e.g., after screen lock)
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    return true;
  }

  if (!soundDataUri) {
    console.warn("Tactile audio: No sound data set. Call setSoundData() first.");
    return false;
  }

  try {
    // Create AudioContext (with webkit fallback for older Safari)
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      console.warn("Tactile audio: AudioContext not supported");
      return false;
    }

    audioContext = new AudioContextClass();

    // Resume if created in suspended state
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Decode the Base64 sound data
    const base64Data = soundDataUri.split(",")[1];
    if (!base64Data) {
      console.warn("Tactile audio: Invalid sound data URI format");
      return false;
    }
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
    isInitialized = true;
    return true;
  } catch (error) {
    console.warn("Tactile audio: Failed to initialize", error);
    return false;
  }
}

/**
 * Play the tactile click sound
 * Safe to call even if audio not initialized - will attempt lazy init
 */
export async function playTactileSound(): Promise<void> {
  // Attempt initialization if not done
  if (!isInitialized) {
    const success = await initAudio();
    if (!success) return;
  }

  if (!audioContext || !audioBuffer) return;

  try {
    // Resume context if suspended
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Create a new buffer source for each play (required by Web Audio API)
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.warn("Tactile audio: Playback failed", error);
  }
}

/**
 * Check if audio is ready to play
 */
export function isAudioReady(): boolean {
  return isInitialized && audioContext !== null && audioBuffer !== null;
}
