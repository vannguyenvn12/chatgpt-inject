import { sendMessageToChatGPT, ensureComposer } from './chatgpt' // ← NOTE: ./chatgpt (not ./lib/chatgpt)

if (!window.ChatGPTInject) window.ChatGPTInject = {}
Object.assign(window.ChatGPTInject, {
    ensureComposer,
    send: sendMessageToChatGPT,
})

console.log('[ChatGPT Inject] API ready. Use: ChatGPTInject.send("Hello")')
