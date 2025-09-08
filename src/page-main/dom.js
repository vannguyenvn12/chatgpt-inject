export function isContentEditable(el) {
    return !!el && el.getAttribute && el.getAttribute('contenteditable') === 'true';
}

export function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

function pasteViaClipboardEvent(el, text) {
    try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const ev = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
        });
        el.dispatchEvent(ev);
        return true;
    } catch { return false; }
}

function insertViaExecCommand(el, text) {
    try {
        el.focus();
        // chọn hết nội dung cũ
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
        // chèn như người dùng gõ
        const ok = document.execCommand('insertText', false, text);
        return !!ok;
    } catch { return false; }
}

function setInnerHTMLFallback(el, text) {
    // fallback cuối cùng (không khuyến nghị, nhưng hữu ích)
    const esc = (s) => s.replace(/[&<>"']/g, m =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    el.innerHTML = `<p>${esc(text)}</p>`;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
    return true;
}

export function setContentEditableProseMirror(el, text) {
    // Thứ tự: paste → execCommand → innerHTML
    if (pasteViaClipboardEvent(el, text)) return true;
    if (insertViaExecCommand(el, text)) return true;
    return setInnerHTMLFallback(el, text);
}

export function setComposerText(el, text) {
    if (!el) return false;
    if (isContentEditable(el)) {
        return setContentEditableProseMirror(el, text);
    }
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
        setNativeValue(el, text);
        try { el.style.height = 'auto'; } catch { }
        return true;
    }
    return false;
}

export function clickIfPossible(btn) {
    if (!btn) return false;
    const ariaDisabled = btn.getAttribute('aria-disabled');
    if (btn.disabled || ariaDisabled === 'true') return false;
    btn.click();
    return true;
}

export function pressEnter(target) {
    try {
        target.focus();
        const kd = target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        const ku = target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
        return !!(kd && ku);
    } catch { return false; }
}
