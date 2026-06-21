/**
 * Streams a conference audio MediaStream to Translia's Deepgram proxy
 * (wss://<translia-host>/api/transcribe/stream) and emits transcript segments.
 *
 * The Deepgram key never reaches the browser — the Translia backend holds it and
 * relays. We send 16 kHz mono linear16 PCM; Deepgram returns transcript JSON.
 */

export type TranscriptSegment = { text: string; isFinal: boolean; speaker?: number };

type SpeakerRun = { speaker: number; text: string };

// Split a Deepgram alternative into consecutive same-speaker runs. Falls back to
// the plain transcript (speaker -1) when diarization words are absent.
function splitBySpeaker(alt: any): SpeakerRun[] {
    const words = alt?.words;

    if (!Array.isArray(words) || !words.length) {
        return alt?.transcript ? [ { speaker: -1, text: alt.transcript } ] : [];
    }
    const runs: SpeakerRun[] = [];

    for (const w of words) {
        const speaker = typeof w.speaker === 'number' ? w.speaker : -1;
        const token = w.punctuated_word || w.word || '';
        const last = runs[runs.length - 1];

        if (last && last.speaker === speaker) {
            last.text += ` ${token}`;
        } else {
            runs.push({ speaker, text: token });
        }
    }

    return runs;
}

export type DeepgramOpts = {
    wsUrl: string;                 // e.g. wss://translia.devanchor.company/api/transcribe/stream
    lang?: string;
    meeting?: string;              // meeting id — lets the proxy persist the transcript
    onSegment: (s: TranscriptSegment) => void;
    onState?: (s: 'connecting' | 'ready' | 'paused' | 'stopped' | 'error') => void;
};

export class DeepgramTranscriber {
    private ws?: WebSocket;
    private ctx?: AudioContext;
    private node?: ScriptProcessorNode;
    private source?: MediaStreamAudioSourceNode;
    private paused = false;

    constructor(private opts: DeepgramOpts) {}

    async start(stream: MediaStream): Promise<void> {
        this.opts.onState?.('connecting');
        const q = new URLSearchParams({ lang: this.opts.lang || 'fr' });

        if (this.opts.meeting) {
            q.set('meeting', this.opts.meeting);
        }
        this.ws = new WebSocket(`${this.opts.wsUrl}?${q.toString()}`);
        this.ws.binaryType = 'arraybuffer';
        this.ws.onmessage = ev => {
            try {
                const m = JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data));
                if (m.type === 'ready') { this.opts.onState?.('ready'); return; }
                if (m.type === 'error') { this.opts.onState?.('error'); return; }
                const alt = m.channel?.alternatives?.[0];
                if (!alt?.transcript) { return; }
                if (m.is_final) {
                    for (const run of splitBySpeaker(alt)) {
                        this.opts.onSegment({ text: run.text, isFinal: true, speaker: run.speaker });
                    }
                } else {
                    this.opts.onSegment({ text: alt.transcript, isFinal: false });
                }
            } catch { /* ignore non-JSON */ }
        };
        this.ws.onclose = () => this.opts.onState?.('stopped');
        this.ws.onerror = () => this.opts.onState?.('error');

        // 16 kHz mono PCM via the Web Audio API (ScriptProcessor is deprecated but
        // universally supported; migrate to AudioWorklet later).
        this.ctx = new AudioContext({ sampleRate: 16000 });
        this.source = this.ctx.createMediaStreamSource(stream);
        this.node = this.ctx.createScriptProcessor(4096, 1, 1);
        this.source.connect(this.node);
        this.node.connect(this.ctx.destination);
        this.node.onaudioprocess = e => {
            if (this.paused || this.ws?.readyState !== WebSocket.OPEN) return;
            const input = e.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            this.ws.send(pcm.buffer);
        };
    }

    pause(): void { this.paused = true; this.opts.onState?.('paused'); }
    resume(): void { this.paused = false; this.opts.onState?.('ready'); }

    stop(): void {
        try { this.ws?.send(JSON.stringify({ type: 'finalize' })); } catch { /* */ }
        this.node?.disconnect();
        this.source?.disconnect();
        this.ctx?.close().catch(() => { /* */ });
        this.ws?.close();
        this.opts.onState?.('stopped');
    }
}
