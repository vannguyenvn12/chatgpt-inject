import { io } from "socket.io-client";
import { observeAssistantReplies } from "../chatgpt";

let socket;
let stopObserver = null;
let observing = false;
let mainConversationId = null;

export function startSocket() {
    socket = io("http://localhost:3000", {
        path: "/ws",
        transports: ["websocket"],
    });




    socket.on('connect', () => {
        console.log('[SOCKET] Connected:', socket.id);

        // Hủy observer cũ nếu có
        if (stopObserver) stopObserver();

        if (!observing) {
            stopObserver = observeAssistantReplies((replyText) => {
                console.log('[SOCKET] emit last reply (deduped):', replyText.slice(0, 80), '...');
                const payload = {
                    author: 'vangpt',
                    conversationId: mainConversationId,
                    text: replyText
                }

                socket.emit('send_last_chat_to_server', payload);
            });
            observing = true;
        }
    });

    socket.on("disconnect", (reason) => {
        console.warn("[SOCKET] Disconnected:", reason);
    });

    // Bắt sự kiện server yêu cầu gửi text
    socket.on("send_to_chatgpt", async (payload, ack) => {
        console.log("[SOCKET] Got send_to_chatgpt:", payload);
        ChatGPTInject.send(payload)
    });

    // Sự kiện từ react -> server -> extension
    socket.on('send_from_react_to_ext', async (payload) => {
        const { author, text, ts, conversationId } = payload;

        mainConversationId = conversationId;

        ChatGPTInject.send(text)
    })

    socket.on('new_conversation_to_ext', async () => {
        console.log('>>> NEW CHAT')
        window.location.href = 'https://chatgpt.com/g/g-6896f631a844819185157596b78e754c-ai-consular-officer-spouse-fiance-e'
    })
}
