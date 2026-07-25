import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = Constants.expoConfig?.extra as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
} | undefined;

const supabaseUrl = extra?.supabaseUrl || 'https://dcnpabvaptjilinfyrwy.supabase.co';
const supabaseAnonKey = extra?.supabaseAnonKey || '';
export const apiBaseUrl = (extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl || 'http://localhost:3000';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
