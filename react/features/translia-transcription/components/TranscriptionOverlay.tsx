import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import { getLocalJitsiAudioTrack } from '../../base/tracks/functions.any';

import TranscriptionPanel from './TranscriptionPanel';

/**
 * Floating toggle + live transcription side panel, mounted in Conference.
 *
 * Audio source (MVP): the local participant's mic. Next iteration: mix all remote
 * audio tracks so the whole meeting is transcribed. The Deepgram key stays on the
 * Translia backend — we only talk to its WS proxy.
 */
const WS_URL: string
    = (typeof window !== 'undefined' && (window as any).TRANSLIA_TRANSCRIBE_WS)
    || 'wss://translia.devanchor.company/api/transcribe/stream';

export default function TranscriptionOverlay() {
    const [ open, setOpen ] = useState(false);
    const audioTrack = useSelector((state: IReduxState) => getLocalJitsiAudioTrack(state));
    const stream = (audioTrack as any)?.getOriginalStream?.() as MediaStream | undefined;

    if (!open) {
        return (
            <button
                aria-label = 'Transcription'
                onClick = { () => setOpen(true) }
                style = {{ position: 'fixed', top: 76, right: 16, zIndex: 260, width: 40, height: 40,
                    borderRadius: 10, border: 'none', background: '#fff', cursor: 'pointer',
                    boxShadow: '0 0 4px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center' }}>
                <svg width = '18' height = '17' viewBox = '0 0 16 15' fill = 'none'>
                    <path d = 'M14.3 1.19h-4.18v-.09C10.13.49 9.64 0 9.04 0H5.95c-.6 0-1.09.49-1.09 1.1v3.06H1.7C.76 4.16 0 4.93 0 5.87v8.19c0 .3.16.56.42.69.11.06.23.08.34.08.11 0 .32-.05.46-.15L2.84 13.49c.36-.27.78-.4 1.22-.4h5.39c.94 0 1.7-.76 1.7-1.7v-1.27h3.16c.94 0 1.7-.76 1.7-1.7V2.89c0-.94-.76-1.7-1.7-1.7Z' fill = '#0400D3' />
                    <path d = 'M12.5 4.32H8.25c-.27 0-.53.23-.53.51 0 .44.27.57.53.57h4.25c.4 0 .53-.23.53-.52 0-.28-.13-.56-.53-.56ZM12.5 6.47H8.25c-.27 0-.53.23-.53.52 0 .43.27.57.53.57h4.25c.4 0 .53-.23.53-.52 0-.28-.13-.56-.53-.56Z' fill = '#D800D5' />
                </svg>
            </button>
        );
    }

    return (
        <div style = {{ position: 'fixed', top: 76, right: 16, bottom: 96, zIndex: 250 }}>
            <TranscriptionPanel
                lang = 'fr'
                onHide = { () => setOpen(false) }
                stream = { stream }
                wsUrl = { WS_URL } />
        </div>
    );
}
