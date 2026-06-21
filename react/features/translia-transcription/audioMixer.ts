/**
 * Mixes several audio MediaStreamTracks (the local mic + every remote
 * participant) into a single MediaStream, so the *whole* meeting can be
 * transcribed — not just the local speaker. Sources are added/removed live as
 * participants join and leave, while the output stream stays the same object so
 * the downstream Deepgram pipeline keeps streaming without interruption.
 */
export class AudioMixer {
    private ctx: AudioContext;
    private dest: MediaStreamAudioDestinationNode;
    private sources = new Map<string, MediaStreamAudioSourceNode>();

    constructor() {
        this.ctx = new AudioContext();
        this.dest = this.ctx.createMediaStreamDestination();

        // Created from a click gesture, but resume defensively (autoplay policy).
        this.ctx.resume?.().catch(() => { /* */ });
    }

    /**
     * The stable mixed-audio output stream.
     *
     * @returns {MediaStream}
     */
    get stream(): MediaStream {
        return this.dest.stream;
    }

    /**
     * Diffs the desired track set against what is connected and applies the
     * delta (connect new tracks, disconnect ones that went away).
     *
     * @param {MediaStreamTrack[]} tracks - The tracks to mix.
     * @returns {void}
     */
    setTracks(tracks: MediaStreamTrack[]): void {
        const wanted = new Map(tracks.filter(Boolean).map(t => [ t.id, t ]));

        for (const [ id, node ] of this.sources) {
            if (!wanted.has(id)) {
                try {
                    node.disconnect();
                } catch { /* */ }
                this.sources.delete(id);
            }
        }

        for (const [ id, track ] of wanted) {
            if (this.sources.has(id)) {
                continue;
            }
            try {
                const src = this.ctx.createMediaStreamSource(new MediaStream([ track ]));

                src.connect(this.dest);
                this.sources.set(id, src);
            } catch { /* track not connectable yet */ }
        }
    }

    /**
     * Disconnects every source and closes the audio context.
     *
     * @returns {void}
     */
    close(): void {
        for (const node of this.sources.values()) {
            try {
                node.disconnect();
            } catch { /* */ }
        }
        this.sources.clear();
        this.ctx.close().catch(() => { /* */ });
    }
}
