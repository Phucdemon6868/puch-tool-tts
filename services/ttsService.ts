import { WSS_URL } from '../constants';

interface SynthesizeOptions {
    text: string;
    speaker: string;
    token: string;
    appkey: string;
}

// Helper to decode base64 string to Uint8Array for browser environment
const b64decode = (str: string): Uint8Array => {
    const binary_string = window.atob(str);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
};

// Custom Error for better debugging
class TTSError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TTSError";
  }
}

export const synthesizeChunk = (options: SynthesizeOptions): Promise<string> => {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WSS_URL);
        const audioChunks: Uint8Array[] = [];
        let isSettled = false;
        let timeoutId: number;

        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                ws.close();
            }
        };
        
        const settle = (resolver: (value?: any) => void, value?: any) => {
            if (!isSettled) {
                isSettled = true;
                cleanup();
                resolver(value);
            }
        };

        timeoutId = window.setTimeout(() => {
            settle(reject, new TTSError("TTS synthesis timed out after 1 minute."));
        }, 60000);

        ws.onopen = () => {
            const payload = {
                text: options.text,
                speaker: options.speaker,
                audio_config: {
                    bit_rate: 64000,
                    sample_rate: 24000,
                    format: "mp3",
                },
            };

            const frame = {
                appkey: options.appkey,
                token: options.token,
                namespace: "TTS",
                event: "StartTask",
                version: "sdk_v1",
                payload: JSON.stringify(payload),
            };

            ws.send(JSON.stringify(frame));
        };

        ws.onmessage = async (event: MessageEvent) => {
            if (isSettled) return;

            // Handle binary audio data directly
            if (event.data instanceof Blob) {
                const arrayBuffer = await event.data.arrayBuffer();
                audioChunks.push(new Uint8Array(arrayBuffer));
                return;
            }

            // Handle JSON-based messages
            if (typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);
                    const eventType = data.event;
                    const payload = data.payload;

                    // Case 1: Direct URL received. This is a final success state.
                    if (payload && typeof payload === "object" && payload.audio_url) {
                       try {
                           const response = await fetch(payload.audio_url);
                           if (!response.ok) {
                               throw new TTSError(`Failed to download audio URL: ${response.statusText}`);
                           }
                           const audioBlob = await response.blob();
                           const audioUrl = URL.createObjectURL(audioBlob);
                           settle(resolve, audioUrl);
                       } catch(err) {
                           settle(reject, err);
                       }
                       return;
                    }

                    // Case 2: Base64 encoded audio chunk received.
                    if (eventType === 'AudioChunk' && payload?.data) {
                        audioChunks.push(b64decode(payload.data));
                        return;
                    }
                    
                    // Case 3: Task finished signal. We don't resolve here, but wait for onclose
                    // to ensure all data packets have been received and processed.
                    if (['TaskFinished', 'Completed', 'Finish'].includes(eventType)) {
                        return; // Wait for connection close to finalize
                    }

                    // Case 4: Explicit error from the server.
                    if (['Error', 'Failed'].includes(eventType)) {
                        console.error('TTS API Error:', data);
                        settle(reject, new TTSError(payload?.message || 'TTS synthesis failed.'));
                        return;
                    }

                } catch (e) {
                    console.warn('Received non-JSON message or failed to parse:', event.data, e);
                }
            }
        };

        ws.onerror = (errorEvent: Event) => {
            console.error("WebSocket Error:", errorEvent);
            settle(reject, new TTSError("WebSocket connection failed. The service might be rate-limiting requests or experiencing issues."));
        };

        ws.onclose = (closeEvent: CloseEvent) => {
            // This is the final step. If we haven't settled yet, we resolve or reject based on the received chunks.
             if (!isSettled) {
                if (audioChunks.length > 0) {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    settle(resolve, audioUrl);
                } else {
                     // If connection closes without any audio data, then it's an error.
                     settle(reject, new TTSError(`Task finished but no audio data was received.`));
                }
            }
        };
    });
};