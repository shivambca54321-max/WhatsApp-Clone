import React from 'react';
import useAuthStore from '../store/useAuthStore';
import { 
  MessageSquare, 
  Users, 
  Phone, 
  Camera, 
  Settings, 
  LogOut, 
  User 
} from 'lucide-react';
import api from '../services/api';

interface SidebarNavProps {
  activeTab: 'chats' | 'contacts' | 'calls' | 'stories' | 'settings';
  setActiveTab: (tab: 'chats' | 'contacts' | 'calls' | 'stories' | 'settings') => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, setActiveTab }) => {
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      clearAuth();
    }
  };

  const menuItems = [
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'contacts', icon: Users, label: 'Contacts' },
    { id: 'calls', icon: Phone, label: 'Calls' },
    { id: 'stories', icon: Camera, label: 'Stories' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  return (
    <div className="flex h-full w-[76px] flex-col items-center justify-between border-r border-gray-800 bg-[#090a10] py-6 text-gray-400">
      {/* User profile avatar / Header */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative group">
          <div className="h-11 w-11 overflow-hidden rounded-xl border border-indigo-500/30 bg-gray-900 transition-all group-hover:border-indigo-500/60">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-600 font-bold text-white text-base">
                {user?.fullName.charAt(0)}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#090a10] bg-emerald-500" />
        </div>
      </div>

      {/* Center Nav tabs */}
      <div className="flex flex-col gap-5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all cursor-pointer hover:bg-gray-800/40 hover:text-white ${
                isActive ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400'
              }`}
              title={item.label}
            >
              <Icon className="h-5.5 w-5.5" />
              {isActive && (
                <div className="absolute left-0 h-6 w-1 rounded-r-full bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Logout */}
      <button
        onClick={handleLogout}
        className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
        title="Logout"
      >
        <LogOut className="h-5.5 w-5.5" />
      </button>
    </div>
  );
};

export default SidebarNav;
