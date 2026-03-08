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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_health_flags: {
        Row: {
          created_at: string
          flag_type: string
          id: string
          is_resolved: boolean
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flag_type: string
          id?: string
          is_resolved?: boolean
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          flag_type?: string
          id?: string
          is_resolved?: boolean
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_trust_scores: {
        Row: {
          buyer_id: string
          false_complaints: number
          id: string
          is_restricted: boolean
          restrict_reason: string | null
          restricted_at: string | null
          total_complaints: number
          total_purchases: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          false_complaints?: number
          id?: string
          is_restricted?: boolean
          restrict_reason?: string | null
          restricted_at?: string | null
          total_complaints?: number
          total_purchases?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          false_complaints?: number
          id?: string
          is_restricted?: boolean
          restrict_reason?: string | null
          restricted_at?: string | null
          total_complaints?: number
          total_purchases?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_request_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          price_amount: number | null
          sender_id: string
        }
        Insert: {
          chat_request_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          price_amount?: number | null
          sender_id: string
        }
        Update: {
          chat_request_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          price_amount?: number | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_request_id_fkey"
            columns: ["chat_request_id"]
            isOneToOne: false
            referencedRelation: "chat_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_requests: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          offered_price: number | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          offered_price?: number | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          offered_price?: number | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          brand_name: string | null
          business_address: string
          business_email: string
          company_name: string
          contact_phone: string
          created_at: string
          id: string
          logo_url: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
          verification_doc_url: string | null
          website: string | null
        }
        Insert: {
          brand_name?: string | null
          business_address: string
          business_email: string
          company_name: string
          contact_phone: string
          created_at?: string
          id?: string
          logo_url?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_doc_url?: string | null
          website?: string | null
        }
        Update: {
          brand_name?: string | null
          business_address?: string
          business_email?: string
          company_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_doc_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      complaints: {
        Row: {
          ai_analysis: Json | null
          buyer_id: string
          category: string
          created_at: string
          description: string
          id: string
          listing_id: string | null
          order_id: string | null
          proof_urls: string[] | null
          resolution: string | null
          resolved_at: string | null
          seller_id: string
          seller_responded_at: string | null
          seller_response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          buyer_id: string
          category: string
          created_at?: string
          description: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          proof_urls?: string[] | null
          resolution?: string | null
          resolved_at?: string | null
          seller_id: string
          seller_responded_at?: string | null
          seller_response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          buyer_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          listing_id?: string | null
          order_id?: string | null
          proof_urls?: string[] | null
          resolution?: string | null
          resolved_at?: string | null
          seller_id?: string
          seller_responded_at?: string | null
          seller_response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_alerts: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          keywords: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      elite_memberships: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          payment_id: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          payment_id?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          payment_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      elite_notifications: {
        Row: {
          created_at: string
          demand_alert_id: string | null
          id: string
          is_read: boolean
          listing_id: string
          match_score: number | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demand_alert_id?: string | null
          id?: string
          is_read?: boolean
          listing_id: string
          match_score?: number | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          demand_alert_id?: string | null
          id?: string
          is_read?: boolean
          listing_id?: string
          match_score?: number | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elite_notifications_demand_alert_id_fkey"
            columns: ["demand_alert_id"]
            isOneToOne: false
            referencedRelation: "demand_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elite_notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          brand: string
          category: string
          company_profile_id: string | null
          condition: string
          created_at: string
          description: string
          external_link: string | null
          hashtags: string[] | null
          id: string
          images: string[] | null
          is_negotiable: boolean
          location: string
          pickup_available: boolean
          price: number
          seller_id: string
          seller_type: string
          shipping_available: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brand?: string
          category: string
          company_profile_id?: string | null
          condition: string
          created_at?: string
          description?: string
          external_link?: string | null
          hashtags?: string[] | null
          id?: string
          images?: string[] | null
          is_negotiable?: boolean
          location?: string
          pickup_available?: boolean
          price: number
          seller_id: string
          seller_type?: string
          shipping_available?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string
          company_profile_id?: string | null
          condition?: string
          created_at?: string
          description?: string
          external_link?: string | null
          hashtags?: string[] | null
          id?: string
          images?: string[] | null
          is_negotiable?: boolean
          location?: string
          pickup_available?: boolean
          price?: number
          seller_id?: string
          seller_type?: string
          shipping_available?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          chat_notifications: boolean
          created_at: string
          elite_alerts: boolean
          id: string
          product_alerts: boolean
          promotional: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_notifications?: boolean
          created_at?: string
          elite_alerts?: boolean
          id?: string
          product_alerts?: boolean
          promotional?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_notifications?: boolean
          created_at?: string
          elite_alerts?: boolean
          id?: string
          product_alerts?: boolean
          promotional?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string
          buyer_service_fee: number | null
          commission_amount: number | null
          commission_rate: number | null
          courier_name: string | null
          created_at: string
          delivery_method: string
          escrow_released_at: string | null
          escrow_status: string
          id: string
          listing_id: string | null
          payment_method: string | null
          price: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          refund_amount: number | null
          refund_status: string | null
          seller_id: string
          seller_payout: number | null
          shipping_address: string | null
          shipping_cost: number | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_service_fee?: number | null
          commission_amount?: number | null
          commission_rate?: number | null
          courier_name?: string | null
          created_at?: string
          delivery_method?: string
          escrow_released_at?: string | null
          escrow_status?: string
          id?: string
          listing_id?: string | null
          payment_method?: string | null
          price: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          seller_id: string
          seller_payout?: number | null
          shipping_address?: string | null
          shipping_cost?: number | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_service_fee?: number | null
          commission_amount?: number | null
          commission_rate?: number | null
          courier_name?: string | null
          created_at?: string
          delivery_method?: string
          escrow_released_at?: string | null
          escrow_status?: string
          id?: string
          listing_id?: string | null
          payment_method?: string | null
          price?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          seller_id?: string
          seller_payout?: number | null
          shipping_address?: string | null
          shipping_cost?: number | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          blocked_reason: string | null
          college: string
          created_at: string
          full_name: string
          id: string
          is_blocked: boolean
          is_elite: boolean
          location: string
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
          verified: boolean
          year_of_study: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          blocked_reason?: string | null
          college?: string
          created_at?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          is_elite?: boolean
          location?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          verified?: boolean
          year_of_study?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          blocked_reason?: string | null
          college?: string
          created_at?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          is_elite?: boolean
          location?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verified?: boolean
          year_of_study?: string
        }
        Relationships: []
      }
      promotional_banners: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string
          id: string
          image_url: string
          is_active: boolean
          listing_id: string | null
          price_text: string | null
          sort_order: number
          tagline: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string
          id?: string
          image_url: string
          is_active?: boolean
          listing_id?: string | null
          price_text?: string | null
          sort_order?: number
          tagline: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string
          id?: string
          image_url?: string
          is_active?: boolean
          listing_id?: string | null
          price_text?: string | null
          sort_order?: number
          tagline?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotional_banners_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_notes: string | null
          buyer_id: string
          created_at: string
          description: string | null
          evidence_urls: string[] | null
          id: string
          listing_id: string | null
          order_id: string
          reason: string
          refund_amount: number | null
          refund_processed_at: string | null
          resolved_at: string | null
          seller_id: string
          seller_response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          buyer_id: string
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          listing_id?: string | null
          order_id: string
          reason: string
          refund_amount?: number | null
          refund_processed_at?: string | null
          resolved_at?: string | null
          seller_id: string
          seller_response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          buyer_id?: string
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          listing_id?: string | null
          order_id?: string
          reason?: string
          refund_amount?: number | null
          refund_processed_at?: string | null
          resolved_at?: string | null
          seller_id?: string
          seller_response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          reviewed_user_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewed_user_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          reviewed_user_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payout_details: {
        Row: {
          account_holder_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          ifsc_code: string | null
          is_verified: boolean
          payout_method: string
          seller_id: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          account_holder_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          ifsc_code?: string | null
          is_verified?: boolean
          payout_method?: string
          seller_id: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          account_holder_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          ifsc_code?: string | null
          is_verified?: boolean
          payout_method?: string
          seller_id?: string
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      seller_trust_scores: {
        Row: {
          block_reason: string | null
          blocked_at: string | null
          id: string
          is_blocked: boolean
          resolved_complaints: number
          seller_id: string
          total_complaints: number
          trust_score: number
          unresolved_complaints: number
          updated_at: string
        }
        Insert: {
          block_reason?: string | null
          blocked_at?: string | null
          id?: string
          is_blocked?: boolean
          resolved_complaints?: number
          seller_id: string
          total_complaints?: number
          trust_score?: number
          unresolved_complaints?: number
          updated_at?: string
        }
        Update: {
          block_reason?: string | null
          blocked_at?: string | null
          id?: string
          is_blocked?: boolean
          resolved_complaints?: number
          seller_id?: string
          total_complaints?: number
          trust_score?: number
          unresolved_complaints?: number
          updated_at?: string
        }
        Relationships: []
      }
      seller_warnings: {
        Row: {
          action_taken: string
          complaint_id: string | null
          created_at: string
          id: string
          reason: string
          seller_id: string
          warning_level: number
        }
        Insert: {
          action_taken?: string
          complaint_id?: string | null
          created_at?: string
          id?: string
          reason: string
          seller_id: string
          warning_level?: number
        }
        Update: {
          action_taken?: string
          complaint_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          seller_id?: string
          warning_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "seller_warnings_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_elite_notification: {
        Args: {
          p_demand_alert_id: string
          p_listing_id: string
          p_match_score: number
          p_message: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
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
