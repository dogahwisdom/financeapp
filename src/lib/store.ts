import { create } from 'zustand';
import { supabase } from './supabase';
import { Database } from './database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type Account = Database['public']['Tables']['accounts']['Row'];

interface AppState {
  transactions: Transaction[];
  account: Account | null;
  loading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  fetchAccount: () => Promise<void>;
  createTransaction: (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  transactions: [],
  account: null,
  loading: false,
  error: null,

  fetchTransactions: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ transactions: data || [] });
    } catch (error) {
      set({ error: 'Failed to fetch transactions' });
    } finally {
      set({ loading: false });
    }
  },

  fetchAccount: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .single();

      if (error) throw error;
      set({ account: data });
    } catch (error) {
      set({ error: 'Failed to fetch account' });
    } finally {
      set({ loading: false });
    }
  },

  createTransaction: async (transaction) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase
        .from('transactions')
        .insert([transaction]);

      if (error) throw error;
      get().fetchTransactions();
      get().fetchAccount();
    } catch (error) {
      set({ error: 'Failed to create transaction' });
    } finally {
      set({ loading: false });
    }
  },
}));