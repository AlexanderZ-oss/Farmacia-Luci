import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

type Role = 'admin' | 'stocker' | 'cashier' | 'customer' | null;

interface AuthState {
  session: Session | null;
  role: Role;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  role: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      set({ role: data.role as Role, isLoading: false });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ role: 'customer', isLoading: false });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, role: null });
  },
}));
