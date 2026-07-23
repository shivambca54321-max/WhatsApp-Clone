import React, { useState, useEffect, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Phone, 
  Video, 
  MoreVertical, 
  ArrowLeft, 
  CornerUpLeft, 
  X,
  FileText,
  MapPin,
  File,
  CheckCircle,
  AlertCircle,
  Check,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveChatViewProps {
  chatId: string;
  onBack: () => void;
  initiateCall: (chatId: string, userId: string, type: 'voice' | 'video') => void;
}

export const ActiveChatView: React.FC<ActiveChatViewProps> = ({ chatId, onBack, initiateCall }) => {
  const { user } = useAuthStore();
  const { socket, onlineUsers, joinChat, leaveChat, sendTyping, sendStopTyping } = useSocket();

  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<any>(null);
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChatDetails();
    fetchMessages();
    joinChat(chatId);

    // Socket listeners for this chat
    if (socket) {
      socket.on('message-received', (newMessage: any) => {
        if (newMessage.chat.toString() === chatId) {
          setMessages((prev) => [...prev, newMessage]);
          scrollToBottom();
        }
      });

      socket.on('message-edited', (editedMessage: any) => {
        if (editedMessage.chat.toString() === chatId) {
          setMessages((prev) => 
            prev.map((msg) => (msg._id === editedMessage._id ? editedMessage : msg))
          );
        }
      });

      socket.on('message-deleted', (data: { messageId: string; deleteType: string }) => {
        if (data.deleteType === 'everyone') {
          setMessages((prev) => 
            prev.map((msg) => {
              if (msg._id === data.messageId) {
                return { ...msg, deletedForEveryone: true, text: 'This message was deleted', attachment: undefined };
              }
              return msg;
            })
          );
        } else {
          setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
        }
      });

      socket.on('reaction-updated', (data: { messageId: string; reactions: any[] }) => {
        setMessages((prev) => 
          prev.map((msg) => (msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg))
        );
      });

      socket.on('typing', (data: { room: string; userId: string }) => {
        if (data.room === chatId && data.userId !== user?.id) {
          setOtherUserTyping(true);
        }
      });

      socket.on('stop-typing', (data: { room: string; userId: string }) => {
        if (data.room === chatId && data.userId !== user?.id) {
          setOtherUserTyping(false);
        }
      });
    }

    return () => {
      leaveChat(chatId);
      if (socket) {
        socket.off('message-received');
        socket.off('message-edited');
        socket.off('message-deleted');
        socket.off('reaction-updated');
        socket.off('typing');
        socket.off('stop-typing');
      }
    };
  }, [chatId, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherUserTyping]);

  const fetchChatDetails = async () => {
    try {
      const res = await api.get('/chats');
      if (res.data.status === 'success') {
        const found = res.data.chats.find((c: any) => c._id === chatId);
        setChat(found);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${chatId}`);
      if (res.data.status === 'success') {
        setMessages(res.data.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Input functions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Typing indicators
    if (e.target.value.length > 0) {
      sendTyping(chatId);
    } else {
      sendStopTyping(chatId);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendStopTyping(chatId);
    try {
      const payload: any = {
        chatId,
        text: inputText,
        messageType: 'text',
      };

      if (replyingToMessage) {
        payload.parentMessageId = replyingToMessage._id;
      }

      await api.post('/messages', payload);
      setInputText('');
      setReplyingToMessage(null);
      scrollToBottom();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setInputText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadingFile(true);

    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('file', file);
    if (replyingToMessage) {
      formData.append('parentMessageId', replyingToMessage._id);
    }

    try {
      await api.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReplyingToMessage(null);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingFile(false);
    }
  };

  // Message Actions
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await api.post('/messages/react', { messageId, emoji });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (messageId: string, type: 'me' | 'everyone') => {
    try {
      await api.post('/messages/delete', { messageId, deleteType: type });
    } catch (e) {
      console.error(e);
    }
  };

  // Call Initiators
  const triggerCall = (type: 'voice' | 'video') => {
    if (!chat) return;
    const otherUser = chat.participants.find((p: any) => p._id !== user?.id);
    if (otherUser) {
      initiateCall(chatId, otherUser._id, type);
    }
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#07080e] text-gray-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Header Details
  let displayTitle = chat.chatName;
  let displayPhoto = chat.chatImage;
  let isOnline = false;
  let detailSub = '';

  if (!chat.isGroupChat) {
    const otherUser = chat.participants.find((p: any) => p._id !== user?.id);
    displayTitle = otherUser?.fullName || 'Velo User';
    displayPhoto = otherUser?.profilePhoto || '';
    const presence = onlineUsers[otherUser?._id] || otherUser?.status;
    isOnline = presence === 'online';
    detailSub = isOnline ? 'Online' : 'Offline';
  } else {
    detailSub = `${chat.participants.length} members`;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07080e] text-white select-none relative overflow-hidden font-sans">
      
      {/* Lumina Glassmorphism Header */}
      <div className="h-[70px] border-b border-gray-800/60 glass-header bg-[#07080e]/85 flex items-center justify-between px-6 z-20 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <button onClick={onBack} className="md:hidden text-gray-400 hover:text-white mr-1 cursor-pointer ios-bounce">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          
          <div className="relative shrink-0 ios-bounce">
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-emerald-500/40 bg-gray-900 shadow-sm">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-600 to-green-500 font-bold text-white text-sm">
                  {displayTitle.charAt(0)}
                </div>
              )}
            </div>
            {isOnline && !chat.isGroupChat && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#07080e] bg-emerald-500 online-glow" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight truncate leading-tight text-white">{displayTitle}</h3>
            <span className={`text-[11px] font-medium ${isOnline ? 'text-emerald-400' : 'text-gray-500'}`}>{detailSub}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 text-gray-400">
          <button 
            onClick={() => triggerCall('video')}
            className="p-2 rounded-xl hover:bg-gray-800/50 hover:text-white transition-all cursor-pointer ios-bounce"
            title="Video Call"
          >
            <span className="material-symbols-outlined text-[22px]">videocam</span>
          </button>
          <button 
            onClick={() => triggerCall('voice')}
            className="p-2 rounded-xl hover:bg-gray-800/50 hover:text-white transition-all cursor-pointer ios-bounce"
            title="Voice Call"
          >
            <span className="material-symbols-outlined text-[22px]">call</span>
          </button>
          <button className="p-2 rounded-xl hover:bg-gray-800/50 hover:text-white transition-all cursor-pointer ios-bounce">
            <span className="material-symbols-outlined text-[22px]">more_vert</span>
          </button>
        </div>
      </div>

      {/* Messages Feed with Chat Wallpaper Background */}
      <div 
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 chat-wallpaper relative z-10"
        style={{ 
          backgroundImage: user?.chatWallpaper ? `url(${user.chatWallpaper})` : undefined,
          backgroundSize: 'cover'
        }}
      >
        {/* Sticky Date Separator Pill */}
        <div className="sticky top-2 z-20 flex justify-center my-2">
          <span className="bg-[#141824]/90 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-bold text-gray-400 shadow-sm uppercase tracking-widest border border-gray-800/50">
            Today
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender._id === user?.id;
          return (
            <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              
              {/* Message Bubble container */}
              <div className="relative group max-w-[75%]">
                
                {/* Reply display box inside bubble */}
                {msg.parentMessage && (
                  <div className={`mb-1.5 p-2 rounded-xl text-xs border-l-4 max-w-full ${
                    isMe ? 'bg-black/30 border-emerald-400 text-gray-200' : 'bg-gray-800/40 border-emerald-500 text-gray-300'
                  }`}>
                    <p className="font-bold text-[10px] uppercase text-emerald-400">
                      {msg.parentMessage.sender.fullName}
                    </p>
                    <p className="truncate text-gray-400">{msg.parentMessage.text}</p>
                  </div>
                )}

                {/* Main bubble body */}
                <div className={`rounded-2xl px-4 py-3 text-sm shadow-md transition-all ${
                  isMe 
                    ? 'bg-gradient-to-tr from-emerald-600 to-green-500 text-white rounded-tr-none shadow-[0_4px_14px_rgba(37,211,102,0.25)] border border-emerald-400/20' 
                    : 'bg-[#12131c] border border-gray-800/80 text-gray-100 rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                }`}>
                  
                  {/* Sender name for group chats */}
                  {chat.isGroupChat && !isMe && (
                    <span className="block text-[10px] font-bold text-emerald-400 mb-1">
                      {msg.sender.fullName}
                    </span>
                  )}

                  {/* Attachment render */}
                  {msg.attachment && (
                    <div className="mb-2 max-w-full overflow-hidden rounded-xl bg-black/20 border border-white/10 p-2.5 flex items-center gap-3">
                      <span className="material-symbols-outlined text-[28px] text-emerald-300">
                        description
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{msg.attachment.fileName}</p>
                        <p className="text-[10px] text-gray-300/80">{(msg.attachment.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                      <a 
                        href={msg.attachment.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-300 hover:text-white px-2 py-1 rounded bg-white/10"
                      >
                        Download
                      </a>
                    </div>
                  )}

                  {/* Message content text */}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                  
                  {/* Timestamp and receipts */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span className="material-symbols-outlined text-[13px] fill-1 text-white">
                        {msg.readBy?.length > 0 ? 'done_all' : 'done'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Floating Actions overlay */}
                <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all z-20 ${
                  isMe ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2'
                }`}>
                  <button 
                    onClick={() => setReplyingToMessage(msg)}
                    className="p-1.5 rounded-lg bg-[#12131b] border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer ios-bounce"
                    title="Reply"
                  >
                    <span className="material-symbols-outlined text-[16px]">reply</span>
                  </button>
                  
                  {/* Emoji Quick reactions */}
                  {['👍', '❤️', '😂', '😮', '🔥', '🚀'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(msg._id, emoji)}
                      className="p-1 rounded-lg bg-[#12131b] border border-gray-800 hover:scale-110 cursor-pointer text-xs"
                    >
                      {emoji}
                    </button>
                  ))}

                  {/* Delete option */}
                  <button 
                    onClick={() => handleDelete(msg._id, isMe ? 'everyone' : 'me')}
                    className="p-1.5 rounded-lg bg-[#12131b] border border-gray-800 hover:bg-red-500/10 hover:text-red-400 text-gray-500 cursor-pointer ios-bounce"
                    title="Delete Message"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>

                {/* Reactions output display */}
                {msg.reactions?.length > 0 && (
                  <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 rounded-full bg-[#12131b] border border-gray-800 px-2 py-0.5 text-[10px] shadow-md select-none">
                    {msg.reactions.slice(0, 3).map((r: any, idx: number) => (
                      <span key={idx}>{r.emoji}</span>
                    ))}
                    <span className="text-gray-400 ml-0.5 font-bold">{msg.reactions.length}</span>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Typing indicator bubble */}
        {otherUserTyping && (
          <div className="flex items-center gap-2.5 bg-[#12131c] border border-gray-800/80 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-emerald-400 w-max shadow-sm">
            <span className="font-semibold text-gray-300">Typing</span>
            <div className="flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying indicator panel */}
      {replyingToMessage && (
        <div className="px-6 py-2.5 bg-[#07080e] border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-400 z-20">
          <div className="min-w-0">
            <p className="font-bold text-emerald-400">Replying to {replyingToMessage.sender.fullName}</p>
            <p className="truncate">{replyingToMessage.text}</p>
          </div>
          <button onClick={() => setReplyingToMessage(null)} className="text-gray-500 hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Lumina Message Input Bar (Bottom Section) */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800/60 glass-header bg-[#07080e]/90 flex items-center gap-3 relative z-20">
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer ios-bounce shrink-0"
          title="Attach File"
          disabled={uploadingFile}
        >
          {uploadingFile ? (
            <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          ) : (
            <span className="material-symbols-outlined text-[24px]">add</span>
          )}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        </button>

        <div className="flex-1 flex items-center bg-[#12131c] rounded-full px-4 py-1.5 border border-gray-800 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
          <button 
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-400 hover:text-white mr-2 cursor-pointer ios-bounce"
            title="Emoji Keyboard"
          >
            <span className="material-symbols-outlined text-[22px]">sentiment_satisfied</span>
          </button>
          
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={handleInputChange}
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-500 font-sans text-sm py-1.5 outline-none"
          />

          <div className="flex items-center gap-1.5 ml-2 text-gray-400">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-white cursor-pointer ios-bounce"
            >
              <span className="material-symbols-outlined text-[22px]">attach_file</span>
            </button>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-white cursor-pointer ios-bounce"
            >
              <span className="material-symbols-outlined text-[22px]">photo_camera</span>
            </button>
          </div>
        </div>

        <button 
          type="submit"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer ios-bounce shrink-0"
          title={inputText.trim() ? 'Send' : 'Voice Message'}
        >
          <span className="material-symbols-outlined text-[22px] fill-1">
            {inputText.trim() ? 'send' : 'mic'}
          </span>
        </button>

        {/* Emoji Keyboard panel */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4 z-50 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            <EmojiPicker 
              theme={EmojiTheme.DARK} 
              onEmojiClick={handleEmojiClick}
              width={340}
              height={400}
            />
          </div>
        )}
      </form>

    </div>
  );
};
export default ActiveChatView;
