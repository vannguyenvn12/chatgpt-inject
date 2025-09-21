import {
  ensureComposer,
  logLastAssistantMessage,
  sendMessageToChatGPT,
} from './chatgpt'; // ← NOTE: ./chatgpt (not ./lib/chatgpt)
import { startSocket } from './socket/index.js';

if (!window.ChatGPTInject) window.ChatGPTInject = {};
Object.assign(window.ChatGPTInject, {
  ensureComposer,
  send: sendMessageToChatGPT,
  log: logLastAssistantMessage,
  socketStart: startSocket,
});

window.ChatGPTInject.socketStart();

console.log('[ChatGPT Inject] API ready. Use: ChatGPTInject.send("Hello")');
