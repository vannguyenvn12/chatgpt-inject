import { io } from 'socket.io-client';
import { observeAssistantReplies } from '../chatgpt';

let socket;
let stopObserver = null;
let observing = false;
let mainConversationId = null;

export function startSocket() {
  socket = io('http://localhost:3000', {
    path: '/ws',
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket.id);

    // Hủy observer cũ nếu có
    if (stopObserver) stopObserver();

    if (!observing) {
      stopObserver = observeAssistantReplies((replyText) => {
        console.log(
          '[SOCKET] emit last reply (deduped):',
          replyText.slice(0, 80),
          '...'
        );
        const payload = {
          author: 'chatgpt',
          conversationId: mainConversationId,
          text: replyText,
          timestamp: Date.now(),
        };

        socket.emit('send_last_chat_to_server', payload);
      });
      observing = true;
    }

    // Kiểm tra xem có message pending sau khi redirect không
    const pendingMessage = sessionStorage.getItem('pendingMessage');
    if (pendingMessage) {
      console.log('🔄 Found pending message after redirect, processing...');
      try {
        const payload = JSON.parse(pendingMessage);

        // Đợi một chút để đảm bảo page đã load xong
        setTimeout(async () => {
          console.log('📤 Sending pending message to ChatGPT:', payload.text);
          console.log(
            '🔍 ChatGPTInject available (pending):',
            !!window.ChatGPTInject
          );
          console.log(
            '🔍 ChatGPTInject.send available (pending):',
            !!window.ChatGPTInject?.send
          );

          try {
            await window.ChatGPTInject.send(payload.text);
            console.log('✅ Pending message sent successfully to ChatGPT');
          } catch (error) {
            console.error(
              '❌ Error sending pending message to ChatGPT:',
              error
            );
          }

          // Gửi phản hồi về server
          socket.emit('message_sent_to_chatgpt', {
            ...payload,
            status: 'sent',
            timestamp: Date.now(),
          });

          // Xóa pending message
          sessionStorage.removeItem('pendingMessage');
        }, 2000);
      } catch (error) {
        console.error('Error processing pending message:', error);
        sessionStorage.removeItem('pendingMessage');
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.warn('[SOCKET] Disconnected:', reason);
  });

  // Bắt sự kiện server yêu cầu gửi text
  socket.on('send_to_chatgpt', async (payload) => {
    console.log('[SOCKET] Got send_to_chatgpt:', payload);
    window.ChatGPTInject.send(payload);
  });

  // Sự kiện từ react -> server -> extension
  socket.on('send_from_react_to_ext', async (payload) => {
    const { text, conversationId } = payload;

    mainConversationId = conversationId;

    // Kiểm tra xem có đang ở đúng GPT không
    const gptUrl =
      'https://chatgpt.com/g/g-6896f631a844819185157596b78e754c-ai-consular-officer-spouse-fiance-e?model=gpt-5';

    if (!window.location.href.includes('g-6896f631a844819185157596b78e754c')) {
      console.log('⚠️ Not on AI Consular Officer GPT, redirecting first');

      // Lưu payload để gửi lại sau khi redirect
      sessionStorage.setItem('pendingMessage', JSON.stringify(payload));

      window.location.href = gptUrl;
      return; // Dừng lại, sẽ gửi lại sau khi redirect
    }

    // Đợi một chút để đảm bảo chat mới đã được tạo
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('📤 Sending message to ChatGPT:', text);
    console.log('🔍 ChatGPTInject available:', !!window.ChatGPTInject);
    console.log(
      '🔍 ChatGPTInject.send available:',
      !!window.ChatGPTInject?.send
    );

    // Gửi message tới ChatGPT trong chat mới
    try {
      await window.ChatGPTInject.send(text);
      console.log('✅ Message sent successfully to ChatGPT');
    } catch (error) {
      console.error('❌ Error sending message to ChatGPT:', error);
    }

    // Gửi phản hồi về server để server biết đã gửi thành công
    socket.emit('message_sent_to_chatgpt', {
      ...payload,
      status: 'sent',
      timestamp: Date.now(),
    });

    // Observer sẽ tự động gửi response từ ChatGPT khi có
  });

  socket.on('new_conversation_to_ext', async () => {
    console.log(
      '>>> NEW CHAT - Opening AI Consular Officer Spouse/Fiancé(e) GPT'
    );

    // Mở link GPT cụ thể thay vì ChatGPT.com thông thường
    const gptUrl =
      'https://chatgpt.com/g/g-6896f631a844819185157596b78e754c-ai-consular-officer-spouse-fiance-e?model=gpt-5';

    try {
      // Kiểm tra xem đã ở đúng GPT chưa
      if (window.location.href.includes('g-6896f631a844819185157596b78e754c')) {
        console.log(
          '✅ Already on AI Consular Officer Spouse/Fiancé(e) GPT, creating new chat'
        );

        // Nếu đã ở đúng GPT, tạo chat mới
        const newChatButton =
          document.querySelector('[data-testid="new-chat-button"]') ||
          document.querySelector('a[href="/"]') ||
          document.querySelector('button[aria-label*="New chat"]') ||
          document.querySelector('button[aria-label*="new chat"]');

        if (newChatButton) {
          newChatButton.click();
          console.log('✅ Clicked new chat button');
        } else {
          // Fallback: reload trang để tạo chat mới
          window.location.reload();
          console.log('✅ Reloaded page for new chat');
        }
      } else {
        // Nếu chưa ở đúng GPT, redirect đến GPT cụ thể
        console.log(
          '✅ Redirecting to AI Consular Officer Spouse/Fiancé(e) GPT'
        );
        window.location.href = gptUrl;
      }
    } catch (error) {
      console.log(
        'Error opening AI Consular Officer Spouse/Fiancé(e) GPT:',
        error
      );
      // Fallback: redirect đến GPT cụ thể
      window.location.href = gptUrl;
    }
  });
}
