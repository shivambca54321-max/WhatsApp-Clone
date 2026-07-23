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
    { id: 'chats', symbol: 'chat', label: 'Chats' },
    { id: 'contacts', symbol: 'groups', label: 'Contacts' },
    { id: 'calls', symbol: 'call', label: 'Calls' },
    { id: 'stories', symbol: 'motion_photos_on', label: 'Stories' },
    { id: 'settings', symbol: 'settings', label: 'Settings' },
  ] as const;

  return (
    <div className="flex h-full w-[76px] flex-col items-center justify-between border-r border-gray-800/60 bg-[#07080e] py-6 text-gray-400">
      {/* User profile avatar / Header */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative group ios-bounce">
          <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-emerald-500/40 bg-gray-900 transition-all group-hover:border-emerald-500 shadow-md">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-600 to-green-500 font-bold text-white text-base">
                {user?.fullName.charAt(0)}
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#07080e] bg-emerald-500 online-glow" />
        </div>
      </div>

      {/* Center Nav tabs */}
      <div className="flex flex-col gap-5">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all cursor-pointer ios-bounce ${
                isActive 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/10' 
                  : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
              }`}
              title={item.label}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? 'fill-1 text-emerald-400' : ''}`}>
                {item.symbol}
              </span>
              {isActive && (
                <div className="absolute left-0 h-6 w-1 rounded-r-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Logout */}
      <button
        onClick={handleLogout}
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer ios-bounce"
        title="Logout"
      >
        <span className="material-symbols-outlined text-[24px]">logout</span>
      </button>
    </div>
  );
};

export default SidebarNav;
