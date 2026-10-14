import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Expo statically inlines EXPO_PUBLIC_* values only when accessed directly.
// @ts-ignore Expo's public environment keys are supplied by the deployment environment.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// @ts-ignore Expo's public environment keys are supplied by the deployment environment.
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be configured.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
