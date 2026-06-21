// @ts-expect-error - jwt-decode ships no bundled types in this version
import jwtDecode from 'jwt-decode';

import { IReduxState } from '../app/types';

/**
 * The Translia config the Nuxt handoff embeds in the signed JWT `context`:
 * the transcription proxy URL, the language, the remaining credit (minutes) and
 * the meeting id. Reading it from the JWT means the fork has no hardcoded host.
 */
export type TransliaContext = {
    transcribeUrl: string;
    lang: string;
    credit: number | string | null;
    meeting?: string;
};

const DEFAULT_WS = 'wss://translia.devanchor.company/api/transcribe/stream';

/**
 * Decodes the Translia `context` from the JWT, falling back to window globals /
 * defaults when there is no JWT (e.g. alpha testing without the handoff).
 *
 * @param {string} [jwt] - The raw JWT string from the Redux store.
 * @returns {TransliaContext}
 */
export function getTransliaContext(jwt?: string): TransliaContext {
    const win: any = typeof window !== 'undefined' ? window : {};
    let ctx: any = {};

    if (jwt) {
        try {
            ctx = (jwtDecode(jwt) as any)?.context || {};
        } catch {
            ctx = {};
        }
    }

    return {
        transcribeUrl: ctx.transcribeUrl || win.TRANSLIA_TRANSCRIBE_WS || DEFAULT_WS,
        lang: ctx.lang || 'fr',
        credit: ctx.credit ?? win.TRANSLIA_CREDIT ?? null,
        meeting: ctx.meeting
    };
}

/**
 * Selector for the raw JWT string.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {string|undefined}
 */
export function selectJwt(state: IReduxState): string | undefined {
    return state['features/base/jwt']?.jwt;
}
