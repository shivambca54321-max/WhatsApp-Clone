import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Search, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CreateGroupModalProps {
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onSelectChat }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/users/contacts');
      if (res.data.status === 'success') {
        setContacts(res.data.contacts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSelect = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts((prev) => prev.filter((id) => id !== contactId));
    } else {
      setSelectedContacts((prev) => [...prev, contactId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('Group name is required');
      return;
    }
    if (selectedContacts.length === 0) {
      alert('Please select at least 1 contact to join the group');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/chats/group', {
        chatName: groupName,
        chatDescription: groupDescription,
        participants: selectedContacts,
      });

      if (res.data.status === 'success') {
        onSelectChat(res.data.chat._id);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((c) => 
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm text-white select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass w-full max-w-[460px] rounded-2xl p-6 shadow-2xl relative z-10 flex flex-col gap-4 border border-gray-800"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-wide">Create New Group</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-500 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Group Name</label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#12131b]/60 py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/40"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description (Optional)</label>
            <input
              type="text"
              placeholder="What is this group about?"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#12131b]/60 py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/40"
            />
          </div>

          {/* Select Members block */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Select Members</label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-[#12131b]/40 py-1.5 pr-4 pl-9 text-xs text-white outline-none focus:border-indigo-500/35"
              />
            </div>

            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1.5">
              {filteredContacts.length === 0 ? (
                <p className="text-center text-[11px] text-gray-500 py-6">No contacts found to add.</p>
              ) : (
                filteredContacts.map((contact) => {
                  const isChecked = selectedContacts.includes(contact._id);
                  return (
                    <div
                      key={contact._id}
                      onClick={() => handleToggleSelect(contact._id)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-indigo-600/10 border-indigo-500/25 text-white' 
                          : 'bg-transparent border-gray-800 hover:bg-[#12131b]/40 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 overflow-hidden rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center font-bold text-xs">
                          {contact.fullName.charAt(0)}
                        </div>
                        <span className="text-xs truncate font-medium">{contact.fullName}</span>
                      </div>
                      {isChecked && <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs tracking-wide cursor-pointer transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Group...' : 'Create Group'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
export default CreateGroupModal;
