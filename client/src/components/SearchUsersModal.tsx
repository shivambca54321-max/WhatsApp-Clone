import React, { useState } from 'react';
import api from '../services/api';
import { X, Search, MessageSquare, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchUsersModalProps {
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
}

export const SearchUsersModal: React.FC<SearchUsersModalProps> = ({ onClose, onSelectChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/users/search?query=${searchQuery}`);
      if (res.data.status === 'success') {
        setResults(res.data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId: string) => {
    try {
      const res = await api.post('/chats', { userId });
      if (res.data.status === 'success') {
        onSelectChat(res.data.chat._id);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addContact = async (contactId: string) => {
    try {
      const res = await api.post('/users/contacts', { contactId });
      if (res.data.status === 'success') {
        alert('Added to contacts successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add contact');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm text-white select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass w-full max-w-[460px] rounded-2xl p-6 shadow-2xl relative z-10 flex flex-col gap-4 border border-gray-800"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-wide">Find Contacts</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-500 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-[#12131b]/60 py-2.5 pr-4 pl-10 text-sm text-white outline-none focus:border-indigo-500/40"
          />
          <button type="submit" className="hidden" />
        </form>

        {/* Results feed */}
        <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1.5 pt-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-8">Search for users above to start messaging.</p>
          ) : (
            results.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/10 border border-gray-850/50 hover:bg-gray-800/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 overflow-hidden rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-center">
                    {u.profilePhoto ? (
                      <img src={u.profilePhoto} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold">{u.fullName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold truncate leading-tight">{u.fullName}</h4>
                    <span className="text-[10px] text-gray-500">@{u.username}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addContact(u.id)}
                    className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                    title="Add Contact"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startChat(u.id)}
                    className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                    title="Chat"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
export default SearchUsersModal;
