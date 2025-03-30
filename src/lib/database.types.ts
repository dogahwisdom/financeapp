export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          role: string
          full_name: string
          student_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          role: string
          full_name: string
          student_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: string
          full_name?: string
          student_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: string
          amount: number
          description: string
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          amount: number
          description: string
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          amount?: number
          description?: string
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          balance: number
          last_transaction_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          last_transaction_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          last_transaction_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}