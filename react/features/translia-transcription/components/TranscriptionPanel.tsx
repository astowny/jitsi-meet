import React, { useEffect, useRef, useState } from 'react';

import { DeepgramTranscriber, type TranscriptSegment } from '../deepgramClient';

/**
 * Translia live-transcription side panel (maquette: "Transcription en cours").
 *
 * Self-contained for now: pass the conference audio `stream` + the Translia proxy
 * `wsUrl`. Next iteration: mount it in Conference, source the mixed audio from the
 * jitsi-meet track Redux state, and persist segments back to the meeting.
 */
type Props = {
    stream?: MediaStream;
    wsUrl: string;
    lang?: string;
    onHide?: () => void;
};

const BLUE = '#0400D3';
const MAGENTA = '#D800D5';

export default function TranscriptionPanel({ stream, wsUrl, lang = 'fr', onHide }: Props) {
    const [finals, setFinals] = useState<string[]>([]);
    const [interim, setInterim] = useState('');
    const [paused, setPaused] = useState(false);
    const [state, setState] = useState<string>('connecting');
    const ref = useRef<DeepgramTranscriber | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!stream) return;
        const t = new DeepgramTranscriber({
            wsUrl, lang,
            onState: setState,
            onSegment: (s: TranscriptSegment) => {
                if (s.isFinal) { setFinals(f => [ ...f, s.text ]); setInterim(''); }
                else setInterim(s.text);
            }
        });
        ref.current = t;
        t.start(stream);
        return () => t.stop();
    }, [ stream, wsUrl, lang ]);

    useEffect(() => {
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
    }, [ finals, interim ]);

    const toggle = () => {
        if (!ref.current) return;
        if (paused) { ref.current.resume(); setPaused(false); }
        else { ref.current.pause(); setPaused(true); }
    };

    return (
        <div style = {{ width: 353, background: '#fff', borderRadius: 16, padding: 18, display: 'flex',
            flexDirection: 'column', height: '100%', fontFamily: 'Lexend, sans-serif' }}>
            <div style = {{ display: 'flex', alignItems: 'center', gap: 8, color: BLUE, fontWeight: 600, fontSize: 16 }}>
                <svg width = '16' height = '15' viewBox = '0 0 16 15' fill = 'none'>
                    <path d = 'M14.3 1.19h-4.18v-.09C10.13.49 9.64 0 9.04 0H5.95c-.6 0-1.09.49-1.09 1.1v3.06H1.7C.76 4.16 0 4.93 0 5.87v8.19c0 .3.16.56.42.69.11.06.23.08.34.08.11 0 .32-.05.46-.15L2.84 13.49c.36-.27.78-.4 1.22-.4h5.39c.94 0 1.7-.76 1.7-1.7v-1.27h3.16c.94 0 1.7-.76 1.7-1.7V2.89c0-.94-.76-1.7-1.7-1.7Z' fill = { BLUE } />
                    <path d = 'M12.5 4.32H8.25c-.27 0-.53.23-.53.51 0 .44.27.57.53.57h4.25c.4 0 .53-.23.53-.52 0-.28-.13-.56-.53-.56ZM12.5 6.47H8.25c-.27 0-.53.23-.53.52 0 .43.27.57.53.57h4.25c.4 0 .53-.23.53-.52 0-.28-.13-.56-.53-.56Z' fill = { MAGENTA } />
                </svg>
                <span style = {{ flex: 1 }}>Transcription en cours</span>
                <button onClick = { onHide } title = 'Masquer'
                    style = {{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}>✕</button>
            </div>
            <div style = {{ height: 1, background: BLUE, opacity: .3, margin: '10px 0' }} />

            <div ref = { bodyRef } style = {{ flex: 1, overflowY: 'auto', fontSize: 14, lineHeight: '18px',
                color: MAGENTA, textAlign: 'justify' }}>
                { finals.join(' ') }{ interim ? <span style = {{ opacity: .6 }}> { interim }</span> : null }
                { !finals.length && !interim ? <span style = {{ color: '#B9B6B6' }}>{ state === 'ready' ? '…' : 'Connexion…' }</span> : null }
            </div>

            <button onClick = { toggle }
                style = {{ marginTop: 12, height: 40, borderRadius: 12, background: BLUE, color: '#fff',
                    border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                { paused
                    ? <><svg width = '11' height = '14' viewBox = '0 0 11 14'><path d = 'M9.97 7.71c.57-.4.57-1.24 0-1.64L1.57.18C.91-.28 0 .19 0 1v11.77c0 .81.91 1.28 1.57.82l8.4-5.88Z' fill = '#fff' /></svg> Reprendre la transcription</>
                    : <><svg width = '11' height = '13' viewBox = '0 0 11 13'><rect width = '4.1' height = '12.3' rx = '2' fill = '#fff' /><rect x = '6.14' width = '4.1' height = '12.3' rx = '2' fill = '#fff' /></svg> Suspendre la transcription</> }
            </button>
        </div>
    );
}
