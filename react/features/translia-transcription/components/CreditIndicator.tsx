import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { getTransliaContext, selectJwt } from '../transliaJwt';

/**
 * Translia credit indicator shown in the conference top bar (next to the timer).
 * The remaining transcription credit (minutes) is carried in the signed JWT
 * (`context.credit`) by the Translia handoff; we fall back to `window.TRANSLIA_CREDIT`
 * when there is no JWT. Hidden entirely when unknown / unlimited.
 */
export default function CreditIndicator() {
    const jwt = useSelector(selectJwt);
    const credit = useMemo(() => getTransliaContext(jwt).credit, [ jwt ]);

    if (credit === null || credit === undefined || credit === '') {
        return null;
    }

    const label = typeof credit === 'number' ? `${credit} min` : String(credit);

    return (
        <div
            style = {{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                background: 'rgba(255,255,255,.9)', borderRadius: 12, color: '#0400D3',
                fontFamily: 'Lexend, sans-serif', fontSize: 12, fontWeight: 600 }}>
            <svg width = '11' height = '10' viewBox = '0 0 11 10' fill = 'none'>
                <path
                    d = 'M8.51.13c.12 0 .23.05.3.14l1.7 2.47c.08.11.07.26-.01.37L5.64 9.35a.34.34 0 0 1-.2.12l-.08.01a.34.34 0 0 1-.28-.13L.19 3.12a.34.34 0 0 1-.01-.38L1.88.27A.34.34 0 0 1 2.18.13h6.33Z'
                    fill = '#0400D3'
                    stroke = '#0400D3'
                    strokeWidth = '0.25' />
            </svg>
            <span>{ label }</span>
        </div>
    );
}
