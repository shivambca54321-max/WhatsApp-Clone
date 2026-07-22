import React, { useState, useEffect } from 'react';
import SidebarNav from '../components/SidebarNav';
import SidebarList from '../components/SidebarList';
import ActiveChatView from '../components/ActiveChatView';
import WebRTCCallOverlay from '../components/WebRTCCallOverlay';
import StoriesCarousel from '../components/StoriesCarousel';
import SearchUsersModal from '../components/SearchUsersModal';
import CreateGroupModal from '../components/CreateGroupModal';
import { useSocket } from '../context/SocketContext';
import useAuthStore from '../store/useAuthStore';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'calls' | 'stories' | 'settings'>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Modal open states
  const [searchOpen, setSearchOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  
  // Call Overlay state
  const [callState, setCallState] = useState({
    status: 'idle' as 'idle' | 'calling' | 'ringing' | 'incoming' | 'connected' | 'disconnected',
    chatId: null as string | null,
    otherUserId: null as string | null,
    otherUserName: '',
    callType: 'voice' as 'voice' | 'video',
    incomingSignal: null as any | null
  });

  // Story state
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  // Monitor incoming call triggers from socket
  useEffect(() => {
    if (socket) {
      socket.on('incoming-call', (data: { signal: any; from: string; name: string; callType: 'voice' | 'video'; chatId: string }) => {
        console.log('Incoming call socket event received:', data);
        setCallState({
          status: 'incoming',
          chatId: data.chatId,
          otherUserId: data.from,
          otherUserName: data.name,
          callType: data.callType,
          incomingSignal: data.signal
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('incoming-call');
      }
    };
  }, [socket]);

  // Initiate calling signal handler
  const initiateCall = (chatId: string, otherUserId: string, type: 'voice' | 'video') => {
    setCallState({
      status: 'calling',
      chatId,
      otherUserId,
      otherUserName: 'Remote User', // This will update once stream connects
      callType: type,
      incomingSignal: null
    });
  };

  return (
    <div className="flex h-screen w-screen bg-[#07080e] overflow-hidden text-white font-sans">
      
      {/* Sidebars Panel layout */}
      <div className={`flex h-full shrink-0 ${selectedChatId ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        {/* Navigation Sidebar */}
        <SidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* List Drawer Sidebar */}
        <SidebarList 
          activeTab={activeTab} 
          selectedChatId={selectedChatId}
          setSelectedChatId={setSelectedChatId}
          openCreateGroup={() => setCreateGroupOpen(true)}
          openSearchUsers={() => setSearchOpen(true)}
          openStoryOverlay={(story) => setSelectedStory(story)}
          initiateCall={initiateCall}
        />
      </div>

      {/* Main Conversation viewport */}
      <div className={`flex-1 h-full ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        {selectedChatId ? (
          <ActiveChatView 
            chatId={selectedChatId} 
            onBack={() => setSelectedChatId(null)} 
            initiateCall={initiateCall}
          />
        ) : (
          /* Empty Chat View fallback display */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#07080e] text-center p-8 relative">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
            
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600/20 to-purple-500/20 shadow-inner border border-indigo-500/10">
              <span className="text-3xl font-extrabold text-indigo-400 select-none">V</span>
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-white mb-2">Velo Secure Messaging</h2>
            <p className="text-sm text-gray-500 max-w-[340px] leading-relaxed">
              Select a conversation from the list to start chatting. Your connections are verified and synchronized in real-time.
            </p>
          </div>
        )}
      </div>

      {/* Overlays / Modals */}
      {searchOpen && (
        <SearchUsersModal 
          onClose={() => setSearchOpen(false)} 
          onSelectChat={(id) => {
            setSelectedChatId(id);
            setActiveTab('chats');
          }}
        />
      )}

      {createGroupOpen && (
        <CreateGroupModal 
          onClose={() => setCreateGroupOpen(false)} 
          onSelectChat={(id) => {
            setSelectedChatId(id);
            setActiveTab('chats');
          }}
        />
      )}

      <WebRTCCallOverlay 
        callState={callState} 
        setCallState={setCallState} 
      />

      <StoriesCarousel 
        story={selectedStory} 
        onClose={() => setSelectedStory(null)} 
      />

    </div>
  );
};
export default Dashboard;
