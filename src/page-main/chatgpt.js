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

/**
 * Log message cuối cùng từ ChatGPT
 */
export function logLastAssistantMessage() {
    const candidates = [
        '[data-testid="assistant-message"]',
        '.markdown.prose',
        'div[data-message-author-role="assistant"]'
    ];
    let el = null;
    for (const sel of candidates) {
        const list = document.querySelectorAll(sel);
        if (list.length > 0) {
            el = list[list.length - 1];
            break;
        }
    }
    if (!el) {
        console.warn('[ChatGPT Inject] Không tìm thấy tin nhắn.');
        return null;
    }
    const text = el.innerText || el.textContent || '';
    console.log('[ChatGPT Reply]', text.trim());
    return text.trim();
}

/**
 * Quan sát ChatGPT, khi có tin nhắn mới từ assistant thì gọi callback
 */
/**
 * Quan sát ChatGPT; chỉ callback khi message cuối của assistant đã "ổn định"
 * - Debounce: đợi DOM yên 500ms rồi lấy text
 * - Dedupe: so sánh hash nội dung để không emit lặp
 * - Cleanup: trả về hàm stop()
 */
export function observeAssistantReplies(onReply) {
    const container =
        document.querySelector('[data-testid="conversation-turns"]') || document.body;

    if (!container) {
        console.warn('[Observer] Không tìm thấy container, hủy.');
        return () => { };
    }

    let debounceTimer = null;
    let lastHash = null;
    let lastLen = 0;
    let lastEmitAt = 0;

    const getLastAssistantText = () => {
        // lấy tất cả turn của assistant
        const turns = container.querySelectorAll('[data-message-author-role="assistant"]');
        const last = turns[turns.length - 1];
        if (!last) return '';

        // textContent là đủ (ChatGPT render markdown trong nhiều thẻ con)
        const text = (last.textContent || '').trim();
        return text;
    };

    const tryEmit = () => {
        const text = getLastAssistantText();
        if (!text) return;

        // Dedupe bằng hash + độ dài
        const h = hashStr(text);
        const now = Date.now();

        // throttle nhẹ: tối đa 1 emit / 1500ms
        if (now - lastEmitAt < 1500) return;

        // nếu nội dung giống hệt lần trước → bỏ
        if (h === lastHash && text.length === lastLen) return;

        lastHash = h;
        lastLen = text.length;
        lastEmitAt = now;

        onReply(text);
    };

    const obs = new MutationObserver((mutations) => {
        // Chỉ quan tâm khi có node thêm/bớt ở vùng assistant
        const meaningful = mutations.some((m) => m.type === 'childList' || m.type === 'characterData');
        if (!meaningful) return;

        // Debounce: đợi DOM “yên” 500ms
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(tryEmit, 500);
    });

    obs.observe(container, {
        childList: true,
        characterData: true,
        subtree: true,
    });

    console.log('[Observer] started (debounced + deduped)');
    return () => {
        clearTimeout(debounceTimer);
        obs.disconnect();
        console.log('[Observer] stopped');
    };
}

// Hash chuỗi nhanh, đủ để dedupe
function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return h.toString(36);
}
