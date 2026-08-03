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
      available_delivery_jobs: {
        Row: {
          buyer_id: string
          created_at: string
          crop_name: string
          delivery_address: string
          delivery_fee: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          farmer_id: string
          freshness_hours: number
          harvest_date: string | null
          id: string
          listing_id: string
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          quantity: number
          scheduled_delivery_at: string | null
          scheduled_pickup_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
        }
        Insert: {
          buyer_id: string
          created_at: string
          crop_name: string
          delivery_address: string
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          farmer_id: string
          freshness_hours?: number
          harvest_date?: string | null
          id: string
          listing_id: string
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          quantity: number
          scheduled_delivery_at?: string | null
          scheduled_pickup_at?: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          crop_name?: string
          delivery_address?: string
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          farmer_id?: string
          freshness_hours?: number
          harvest_date?: string | null
          id?: string
          listing_id?: string
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          quantity?: number
          scheduled_delivery_at?: string | null
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
        }
        Relationships: []
      }
      crop_listings: {
        Row: {
          created_at: string
          crop_name: string
          description: string | null
          farmer_id: string
          freshness_hours: number
          harvest_date: string | null
          id: string
          image_url: string | null
          location: string
          pickup_lat: number | null
          pickup_lng: number | null
          price_per_unit: number
          quantity: number
          status: Database["public"]["Enums"]["listing_status"]
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crop_name: string
          description?: string | null
          farmer_id: string
          freshness_hours?: number
          harvest_date?: string | null
          id?: string
          image_url?: string | null
          location?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          price_per_unit: number
          quantity: number
          status?: Database["public"]["Enums"]["listing_status"]
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crop_name?: string
          description?: string | null
          farmer_id?: string
          freshness_hours?: number
          harvest_date?: string | null
          id?: string
          image_url?: string | null
          location?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          price_per_unit?: number
          quantity?: number
          status?: Database["public"]["Enums"]["listing_status"]
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_phone: string | null
          created_at: string
          delivery_address: string
          delivery_fee: number | null
          delivery_id: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          farmer_id: string
          farmer_phone: string | null
          id: string
          listing_id: string
          notes: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          quantity: number
          scheduled_delivery_at: string | null
          scheduled_pickup_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_phone?: string | null
          created_at?: string
          delivery_address: string
          delivery_fee?: number | null
          delivery_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          farmer_id: string
          farmer_phone?: string | null
          id?: string
          listing_id: string
          notes?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          quantity: number
          scheduled_delivery_at?: string | null
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_phone?: string | null
          created_at?: string
          delivery_address?: string
          delivery_fee?: number | null
          delivery_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          farmer_id?: string
          farmer_phone?: string | null
          id?: string
          listing_id?: string
          notes?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          quantity?: number
          scheduled_delivery_at?: string | null
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "crop_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          language: string
          location: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          language?: string
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          language?: string
          location?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_order: {
        Args: { p_order_id: string; p_partner_id: string }
        Returns: Json
      }
    }
    Enums: {
      listing_status: "active" | "sold" | "expired"
      order_status:
        | "pending"
        | "accepted"
        | "picked_up"
        | "delivered"
        | "cancelled"
      user_role: "farmer" | "buyer" | "delivery"
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
    Enums: {
      listing_status: ["active", "sold", "expired"],
      order_status: [
        "pending",
        "accepted",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      user_role: ["farmer", "buyer", "delivery"],
    },
  },
} as const
