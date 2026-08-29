export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      inventory: {
        Row: {
          created_at: string
          current_quantity: number
          id: string
          material_name: string
          minimum_quantity: number
          product_id: string | null
          required_quantity: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_quantity?: number
          id?: string
          material_name: string
          minimum_quantity?: number
          product_id?: string | null
          required_quantity?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_quantity?: number
          id?: string
          material_name?: string
          minimum_quantity?: number
          product_id?: string | null
          required_quantity?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_history: {
        Row: {
          actual_quantity: number
          created_at: string
          date: string
          id: string
          planned_quantity: number
          product_id: string
          quantity_sold: number
          remaining_stock: number
          user_id: string
        }
        Insert: {
          actual_quantity?: number
          created_at?: string
          date: string
          id?: string
          planned_quantity?: number
          product_id: string
          quantity_sold?: number
          remaining_stock?: number
          user_id: string
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          date?: string
          id?: string
          planned_quantity?: number
          product_id?: string
          quantity_sold?: number
          remaining_stock?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_recommendations: {
        Row: {
          created_at: string
          current_stock: number
          expected_demand: number
          id: string
          product_id: string
          recommended_quantity: number
          safety_stock: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          expected_demand?: number
          id?: string
          product_id: string
          recommended_quantity?: number
          safety_stock?: number
          user_id: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          expected_demand?: number
          id?: string
          product_id?: string
          recommended_quantity?: number
          safety_stock?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          minimum_stock: number
          product_name: string
          production_capacity: number
          production_cost: number
          raw_material_name: string
          raw_per_unit: number
          raw_unit: string
          shelf_life: number
          unit: string
          updated_at: string
          user_id: string
          workers: number
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          minimum_stock?: number
          product_name: string
          production_capacity?: number
          production_cost?: number
          raw_material_name: string
          raw_per_unit?: number
          raw_unit?: string
          shelf_life?: number
          unit: string
          updated_at?: string
          user_id: string
          workers?: number
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          minimum_stock?: number
          product_name?: string
          production_capacity?: number
          production_cost?: number
          raw_material_name?: string
          raw_per_unit?: number
          raw_unit?: string
          shelf_life?: number
          unit?: string
          updated_at?: string
          user_id?: string
          workers?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          district: string
          email: string
          id: string
          location: string
          name: string
          planning_days: number
          safety_stock_percent: number
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          district?: string
          email: string
          id: string
          location?: string
          name: string
          planning_days?: number
          safety_stock_percent?: number
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          district?: string
          email?: string
          id?: string
          location?: string
          name?: string
          planning_days?: number
          safety_stock_percent?: number
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_history: {
        Row: {
          created_at: string
          date: string
          id: string
          location: string
          product_id: string
          quantity_sold: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          location?: string
          product_id: string
          quantity_sold?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          location?: string
          product_id?: string
          quantity_sold?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
