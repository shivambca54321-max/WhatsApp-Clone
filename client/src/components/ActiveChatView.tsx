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
    <div className="flex-1 flex flex-col h-full bg-[#07080e] text-white select-none relative">
      
      {/* Header */}
      <div className="h-[70px] border-b border-gray-800/60 bg-[#0b0c14]/90 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={onBack} className="md:hidden text-gray-400 hover:text-white mr-1 cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="relative shrink-0">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-indigo-500/20 font-bold text-indigo-300 text-sm">
                  {displayTitle.charAt(0)}
                </div>
              )}
            </div>
            {isOnline && !chat.isGroupChat && (
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b0c14] bg-emerald-500" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate leading-tight">{displayTitle}</h3>
            <span className="text-[11px] text-gray-500">{detailSub}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => triggerCall('voice')}
            className="p-2.5 rounded-xl bg-gray-800/30 text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
            title="Voice Call"
          >
            <Phone className="h-4.5 w-4.5" />
          </button>
          <button 
            onClick={() => triggerCall('video')}
            className="p-2.5 rounded-xl bg-gray-800/30 text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
            title="Video Call"
          >
            <Video className="h-4.5 w-4.5" />
          </button>
          <button className="p-2.5 rounded-xl bg-transparent text-gray-500 hover:text-white cursor-pointer">
            <MoreVertical className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div 
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-repeat"
        style={{ 
          backgroundImage: user?.chatWallpaper ? `url(${user.chatWallpaper})` : 'none',
          backgroundSize: '360px'
        }}
      >
        {messages.map((msg) => {
          const isMe = msg.sender._id === user?.id;
          return (
            <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              
              {/* Message Bubble container */}
              <div className="relative group max-w-[70%]">
                
                {/* Reply display box inside bubble */}
                {msg.parentMessage && (
                  <div className={`mb-1.5 p-2 rounded-lg text-xs border-l-4 text-gray-400 max-w-full ${
                    isMe ? 'bg-black/20 border-indigo-500' : 'bg-gray-800/30 border-gray-600'
                  }`}>
                    <p className="font-bold text-[10px] uppercase text-indigo-400">
                      {msg.parentMessage.sender.fullName}
                    </p>
                    <p className="truncate text-gray-400">{msg.parentMessage.text}</p>
                  </div>
                )}

                {/* Main bubble body */}
                <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-md border ${
                  isMe 
                    ? 'bg-indigo-600 border-indigo-500/30 text-white rounded-tr-none' 
                    : 'bg-[#12131b] border-gray-800/80 text-gray-200 rounded-tl-none'
                }`}>
                  
                  {/* Sender name for group chats */}
                  {chat.isGroupChat && !isMe && (
                    <span className="block text-[10px] font-bold text-indigo-400 mb-1">
                      {msg.sender.fullName}
                    </span>
                  )}

                  {/* Attachment render */}
                  {msg.attachment && (
                    <div className="mb-2 max-w-full overflow-hidden rounded-xl bg-black/10 border border-black/5 p-2 flex items-center gap-3">
                      <FileText className="h-8 w-8 text-indigo-300" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{msg.attachment.fileName}</p>
                        <p className="text-[10px] text-gray-400">{(msg.attachment.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                      <a 
                        href={msg.attachment.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-bold text-indigo-300 hover:text-indigo-200"
                      >
                        Download
                      </a>
                    </div>
                  )}

                  {/* Message content text */}
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  
                  {/* Timestamp and receipts */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-gray-400/85">
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span className="text-indigo-300 ml-1">
                        {msg.readBy?.length > 0 ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      </span>
                    )}
                  </div>
                </div>

                {/* Floating Actions overlay */}
                <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all ${
                  isMe ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2'
                }`}>
                  <button 
                    onClick={() => setReplyingToMessage(msg)}
                    className="p-1 rounded bg-[#12131b] border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
                    title="Reply"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5" />
                  </button>
                  
                  {/* Emoji Quick reactions */}
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(msg._id, emoji)}
                      className="p-1 rounded bg-[#12131b] border border-gray-800 hover:scale-110 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}

                  {/* Delete option */}
                  <button 
                    onClick={() => handleDelete(msg._id, isMe ? 'everyone' : 'me')}
                    className="p-1 rounded bg-[#12131b] border border-gray-800 hover:bg-red-500/10 hover:text-red-400 text-gray-500 cursor-pointer"
                    title="Delete Message"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Reactions output display */}
                {msg.reactions?.length > 0 && (
                  <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 rounded-full bg-[#12131b] border border-gray-800 px-1.5 py-0.5 text-[10px] shadow-sm select-none">
                    {msg.reactions.slice(0, 3).map((r: any, idx: number) => (
                      <span key={idx}>{r.emoji}</span>
                    ))}
                    <span className="text-gray-500 ml-0.5 font-bold">{msg.reactions.length}</span>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Typing indicator bubble */}
        {otherUserTyping && (
          <div className="flex items-center gap-2.5 bg-[#12131b] border border-gray-800/80 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-gray-400 w-max shadow-sm">
            <span className="font-semibold">Typing</span>
            <div className="flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying indicator panel */}
      {replyingToMessage && (
        <div className="px-6 py-2.5 bg-[#0b0c14] border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-400">
          <div className="min-w-0">
            <p className="font-semibold text-indigo-400">Replying to {replyingToMessage.sender.fullName}</p>
            <p className="truncate">{replyingToMessage.text}</p>
          </div>
          <button onClick={() => setReplyingToMessage(null)} className="text-gray-500 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800/60 bg-[#0b0c14]/90 flex items-center gap-3.5 relative">
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-gray-800/30 text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
          title="Attach File"
          disabled={uploadingFile}
        >
          {uploadingFile ? (
            <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          ) : (
            <Paperclip className="h-4.5 w-4.5" />
          )}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-gray-800 bg-[#12131b] py-2.5 pr-12 pl-4 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/40"
          />
          <button 
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"
            title="Emoji Keyboard"
          >
            <Smile className="h-4.5 w-4.5" />
          </button>
        </div>

        <button 
          type="submit"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
          title="Send"
        >
          <Send className="h-4.5 w-4.5" />
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
