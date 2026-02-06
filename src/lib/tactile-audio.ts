/**
 * Tactile Audio Engine
 *
 * Singleton for tactile sound feedback. Uses AudioContext with lazy init
 * (required by browsers - must init on user gesture). Buffer is cached
 * for instant playback.
 */

let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let isInitialized = false;
let soundDataUri: string | null = null;

/** Set the sound data URI (Base64 encoded audio). Call once at app startup. */
export function setSoundData(dataUri: string): void {
  soundDataUri = dataUri;
}

async function initAudio(): Promise<boolean> {
  if (isInitialized && audioContext && audioBuffer) {
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
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      console.warn("Tactile audio: AudioContext not supported");
      return false;
    }

    audioContext = new AudioContextClass();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

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

/** Play the tactile click sound. Handles lazy init if needed. */
export async function playTactileSound(): Promise<void> {
  if (!isInitialized) {
    const success = await initAudio();
    if (!success) return;
  }

  if (!audioContext || !audioBuffer) return;

  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.warn("Tactile audio: Playback failed", error);
  }
}
