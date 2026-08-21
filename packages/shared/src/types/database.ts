/**
 * Database types — generated from the live schema (project eqofdedstkagqkfnksac).
 *
 * NOTE: the Supabase CLI was not authenticated when this was written, so the
 * Row/Insert/Update shapes below were taken verbatim from the generator, but
 * the `Relationships` arrays were emptied and the generic helpers simplified.
 * That only affects type inference for nested `select()` joins — column types
 * are exact. Regenerate the canonical file before relying on join inference:
 *
 *   supabase login
 *   npm run db:types      # needs SUPABASE_PROJECT_ID=eqofdedstkagqkfnksac
 *
 * Never hand-edit beyond this point (CONVENTIONS.md).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          expense_id: string | null
          file_path: string
          id: string
          mime_type: string | null
          payment_id: string | null
          size_bytes: number | null
          type: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          expense_id?: string | null
          file_path: string
          id?: string
          mime_type?: string | null
          payment_id?: string | null
          size_bytes?: number | null
          type: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          expense_id?: string | null
          file_path?: string
          id?: string
          mime_type?: string | null
          payment_id?: string | null
          size_bytes?: number | null
          type?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          ip: string | null
          site_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: number
          ip?: string | null
          site_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: number
          ip?: string | null
          site_id?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string
          id: string
          period: string
          site_id: string
          subcategory_id: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          created_by: string
          id?: string
          period: string
          site_id: string
          subcategory_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string
          id?: string
          period?: string
          site_id?: string
          subcategory_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: { id: string; is_system: boolean; name: string; sort_order: number }
        Insert: { id?: string; is_system?: boolean; name: string; sort_order?: number }
        Update: { id?: string; is_system?: boolean; name?: string; sort_order?: number }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          challan_no: string | null
          created_at: string
          created_by: string
          date: string
          description: string
          due_date: string | null
          id: string
          site_id: string
          status: string
          subcategory_id: string | null
          updated_at: string
          vendor_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          category_id: string
          challan_no?: string | null
          created_at?: string
          created_by: string
          date: string
          description: string
          due_date?: string | null
          id?: string
          site_id: string
          status?: string
          subcategory_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          challan_no?: string | null
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          site_id?: string
          status?: string
          subcategory_id?: string | null
          updated_at?: string
          vendor_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          cheque_bank: string | null
          cheque_no: string | null
          cheque_status: string | null
          created_at: string
          created_by: string
          expense_id: string
          id: string
          mode: string
          paid_by: string
          paid_on: string
          remark: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          cheque_bank?: string | null
          cheque_no?: string | null
          cheque_status?: string | null
          created_at?: string
          created_by: string
          expense_id: string
          id?: string
          mode: string
          paid_by: string
          paid_on: string
          remark?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          cheque_bank?: string | null
          cheque_no?: string | null
          cheque_status?: string | null
          created_at?: string
          created_by?: string
          expense_id?: string
          id?: string
          mode?: string
          paid_by?: string
          paid_on?: string
          remark?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: []
      }
      sites: {
        Row: {
          address: string | null
          archived_at: string | null
          created_at: string
          id: string
          name: string
          plan: string
          settings: Json
          slug: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          plan?: string
          settings?: Json
          slug: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          archived_at: string | null
          category_id: string
          created_at: string
          id: string
          name: string
          site_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id: string
          created_at?: string
          id?: string
          name: string
          site_id: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          site_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          active: boolean
          active_site_id: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          active_site_id?: string | null
          created_at?: string
          id: string
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          active_site_id?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      user_sites: {
        Row: { created_at: string; role: string; site_id: string; user_id: string }
        Insert: { created_at?: string; role: string; site_id: string; user_id: string }
        Update: { created_at?: string; role?: string; site_id?: string; user_id?: string }
        Relationships: []
      }
      vendors: {
        Row: {
          archived_at: string | null
          created_at: string
          gstin: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          site_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          site_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          site_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_expense_totals: {
        Row: {
          amount: number | null
          category_id: string | null
          challan_no: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          description: string | null
          due_date: string | null
          id: string | null
          last_paid_on: string | null
          outstanding: number | null
          payment_count: number | null
          site_id: string | null
          status: string | null
          subcategory_id: string | null
          total_paid: number | null
          updated_at: string | null
          vendor_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Relationships: []
      }
      v_monthly_category_summary: {
        Row: {
          category_id: string | null
          category_name: string | null
          entry_count: number | null
          month: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          site_id: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      v_settlement_by_user: {
        Row: {
          mode: string | null
          payment_count: number | null
          site_id: string | null
          total_paid_in: number | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      v_vendor_aging: {
        Row: {
          aging_bucket: string | null
          days_overdue: number | null
          description: string | null
          due_date: string | null
          expense_id: string | null
          outstanding: number | null
          site_id: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: []
      }
      v_vendor_totals: {
        Row: {
          archived_at: string | null
          last_transaction_date: string | null
          outstanding: number | null
          phone: string | null
          site_id: string | null
          total_billed: number | null
          total_paid: number | null
          transaction_count: number | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_has_role: { Args: { roles: string[] }; Returns: boolean }
      current_user_role: { Args: never; Returns: string }
      current_user_site_id: { Args: never; Returns: string }
      user_belongs_to_site: { Args: { target_site: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<T extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])> =
  (DefaultSchema['Tables'] & DefaultSchema['Views'])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T] extends { Update: infer U } ? U : never
