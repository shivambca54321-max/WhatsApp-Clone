import { create } from 'zustand';

export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  profilePhoto: string;
  coverPhoto?: string;
  bio?: string;
  about: string;
  status: 'online' | 'offline' | 'away' | 'dnd';
  themePreference: 'light' | 'dark' | 'amoled';
  accentColor: string;
  chatWallpaper?: string;
  createdAt?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  setToken: (token: string) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true, isLoading: false }),
  setToken: (token) => set({ token }),
  updateUser: (updatedFields) => 
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
    })),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
export default useAuthStore;
