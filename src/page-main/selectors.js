export const SELECTORS = {
    composer: [
        'div#prompt-textarea.ProseMirror[contenteditable="true"]',
        'div.ProseMirror[contenteditable="true"][id="prompt-textarea"]',
        'div.ProseMirror[contenteditable="true"]',
        'textarea#prompt-textarea',
        '[contenteditable="true"][role="textbox"]'
    ],
    form: [
        'form[data-testid*="composer"]',
        'form:has(#prompt-textarea)',
        'form'
    ],
    sendButton: [
        '[data-testid="send-button"]',
        'form button[type="submit"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="Gửi"]'
    ]
}
