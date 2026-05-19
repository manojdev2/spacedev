import { create } from 'zustand';
import { User, Client } from '@/types';
import { demoUser, demoClient } from '@/data/demoData';

interface AuthState {
  user: User | null;
  client: Client | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  client: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Demo login - in production, this would validate against backend
    if (email && password) {
      set({
        user: demoUser,
        client: demoClient,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    }
    
    set({ isLoading: false });
    return false;
  },
  
  logout: () => {
    set({
      user: null,
      client: null,
      isAuthenticated: false,
    });
  },
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
