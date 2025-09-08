import { SELECTORS } from './selectors';
import { waitFor, qOne, sleep } from './query';
import { setComposerText, clickIfPossible, pressEnter } from './dom';

export async function ensureComposer({ timeout = 15000 } = {}) {
    const composer = await waitFor(SELECTORS.composer, { timeout });
    if (!composer) throw new Error('Không tìm thấy ô nhập ChatGPT');

    const form = qOne(SELECTORS.form) || composer.closest('form') || document.querySelector('form');
    const send = qOne(SELECTORS.sendButton, form) || qOne(SELECTORS.sendButton, document);
    return { composer, form, send };
}

export async function sendMessageToChatGPT(
    text,
    { timeout = 15000, sendStrategy = 'auto', waitForResponse = true, afterTypingDelay = 60 } = {}
) {
    const { composer, form, send } = await ensureComposer({ timeout });

    const ok = setComposerText(composer, text);
    if (!ok) throw new Error('Không thể set nội dung vào composer');

    if (afterTypingDelay) await sleep(afterTypingDelay);

    let sent = false;
    if (sendStrategy === 'auto' || sendStrategy === 'button') {
        if (form?.requestSubmit) {
            try { form.requestSubmit(); sent = true; } catch { }
        }
        if (!sent) sent = clickIfPossible(send);
    }
    if (!sent && (sendStrategy === 'auto' || sendStrategy === 'enter')) {
        sent = pressEnter(composer);
    }
    if (!sent) throw new Error('Không gửi được (nút send/Enter).');

    if (waitForResponse) await waitForStreamHint(8000).catch(() => { });
    return { ok: true };
}

async function waitForStreamHint(ms = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
        const streaming =
            document.querySelector('[data-testid="chat-assistant-streaming"]') ||
            document.querySelector('[aria-busy="true"]');
        if (streaming) return;
        await sleep(150);
    }
    throw new Error('No stream detected');
}
