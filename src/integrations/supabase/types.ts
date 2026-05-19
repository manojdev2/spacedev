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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          admin_notes: string | null
          appointment_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          end_time: string
          id: string
          location_id: string
          notes: string | null
          reminder_sent: boolean
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          appointment_date: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          end_time: string
          id?: string
          location_id: string
          notes?: string | null
          reminder_sent?: boolean
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          appointment_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          end_time?: string
          id?: string
          location_id?: string
          notes?: string | null
          reminder_sent?: boolean
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "location_services"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_booking_settings: {
        Row: {
          advance_booking_days: number
          booking_enabled: boolean
          buffer_between_appointments: number
          created_at: string
          id: string
          location_id: string
          max_appointments_per_slot: number
          min_notice_hours: number
          slot_interval_minutes: number
          updated_at: string
        }
        Insert: {
          advance_booking_days?: number
          booking_enabled?: boolean
          buffer_between_appointments?: number
          created_at?: string
          id?: string
          location_id: string
          max_appointments_per_slot?: number
          min_notice_hours?: number
          slot_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          advance_booking_days?: number
          booking_enabled?: boolean
          buffer_between_appointments?: number
          created_at?: string
          id?: string
          location_id?: string
          max_appointments_per_slot?: number
          min_notice_hours?: number
          slot_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_booking_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_photos: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          location_id: string
          updated_at: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          location_id: string
          updated_at?: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          location_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_photos_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_services: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          duration_minutes: number
          id: string
          is_active: boolean
          location_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_services_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          category: Database["public"]["Enums"]["location_category"]
          city: string
          country: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          lat: number
          lng: number
          name: string
          opening_hours: Json
          organization_id: string
          phone: string
          services: string[] | null
          state: string
          updated_at: string
          website: string | null
          zip_code: string
        }
        Insert: {
          address: string
          category?: Database["public"]["Enums"]["location_category"]
          city: string
          country?: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          lat: number
          lng: number
          name: string
          opening_hours?: Json
          organization_id: string
          phone: string
          services?: string[] | null
          state: string
          updated_at?: string
          website?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          category?: Database["public"]["Enums"]["location_category"]
          city?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          lat?: number
          lng?: number
          name?: string
          opening_hours?: Json
          organization_id?: string
          phone?: string
          services?: string[] | null
          state?: string
          updated_at?: string
          website?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string
          error_message: string | null
          external_message_id: string | null
          id: string
          message_content: string
          metadata: Json | null
          notification_type: string
          recipient_phone: string
          recipient_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          message_content: string
          metadata?: Json | null
          notification_type: string
          recipient_phone: string
          recipient_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          message_content?: string
          metadata?: Json | null
          notification_type?: string
          recipient_phone?: string
          recipient_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          appointment_reminders: boolean
          created_at: string
          id: string
          marketing_messages: boolean
          phone_country_code: string
          phone_number: string
          store_alerts: boolean
          submission_updates: boolean
          updated_at: string
          user_id: string | null
          verification_code: string | null
          verification_expires_at: string | null
          verified: boolean
          whatsapp_enabled: boolean
        }
        Insert: {
          appointment_reminders?: boolean
          created_at?: string
          id?: string
          marketing_messages?: boolean
          phone_country_code?: string
          phone_number: string
          store_alerts?: boolean
          submission_updates?: boolean
          updated_at?: string
          user_id?: string | null
          verification_code?: string | null
          verification_expires_at?: string | null
          verified?: boolean
          whatsapp_enabled?: boolean
        }
        Update: {
          appointment_reminders?: boolean
          created_at?: string
          id?: string
          marketing_messages?: boolean
          phone_country_code?: string
          phone_number?: string
          store_alerts?: boolean
          submission_updates?: boolean
          updated_at?: string
          user_id?: string | null
          verification_code?: string | null
          verification_expires_at?: string | null
          verified?: boolean
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo: string | null
          max_locations: number
          name: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo?: string | null
          max_locations?: number
          name: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo?: string | null
          max_locations?: number
          name?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateway_settings: {
        Row: {
          created_at: string
          gateway_type: string
          id: string
          is_enabled: boolean
          is_live_mode: boolean
          live_api_key: string | null
          live_secret_key: string | null
          live_webhook_secret: string | null
          organization_id: string
          settings: Json | null
          test_api_key: string | null
          test_secret_key: string | null
          test_webhook_secret: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gateway_type: string
          id?: string
          is_enabled?: boolean
          is_live_mode?: boolean
          live_api_key?: string | null
          live_secret_key?: string | null
          live_webhook_secret?: string | null
          organization_id: string
          settings?: Json | null
          test_api_key?: string | null
          test_secret_key?: string | null
          test_webhook_secret?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gateway_type?: string
          id?: string
          is_enabled?: boolean
          is_live_mode?: boolean
          live_api_key?: string | null
          live_secret_key?: string | null
          live_webhook_secret?: string | null
          organization_id?: string
          settings?: Json | null
          test_api_key?: string | null
          test_secret_key?: string | null
          test_webhook_secret?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_helpfuls: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpfuls_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          review_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          review_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          review_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string | null
          created_at: string
          id: string
          location_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          location_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          location_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_submissions: {
        Row: {
          additional_notes: string | null
          address: string
          business_name: string
          category: string
          city: string
          contact_email: string
          contact_name: string
          contact_phone: string
          country: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          services: string[] | null
          state: string
          status: string
          updated_at: string
          website: string | null
          zip_code: string
        }
        Insert: {
          additional_notes?: string | null
          address: string
          business_name: string
          category?: string
          city: string
          contact_email: string
          contact_name: string
          contact_phone: string
          country?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services?: string[] | null
          state: string
          status?: string
          updated_at?: string
          website?: string | null
          zip_code: string
        }
        Update: {
          additional_notes?: string | null
          address?: string
          business_name?: string
          category?: string
          city?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          country?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services?: string[] | null
          state?: string
          status?: string
          updated_at?: string
          website?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      territories: {
        Row: {
          assigned_team_id: string | null
          assigned_user_id: string | null
          center_lat: number | null
          center_lng: number | null
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          polygon_coordinates: Json | null
          priority: number
          radius_miles: number | null
          territory_type: string
          updated_at: string
          zip_codes: string[] | null
        }
        Insert: {
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          center_lat?: number | null
          center_lng?: number | null
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          polygon_coordinates?: Json | null
          priority?: number
          radius_miles?: number | null
          territory_type: string
          updated_at?: string
          zip_codes?: string[] | null
        }
        Update: {
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          center_lat?: number | null
          center_lng?: number | null
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          polygon_coordinates?: Json | null
          priority?: number
          radius_miles?: number | null
          territory_type?: string
          updated_at?: string
          zip_codes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "territories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_demand: {
        Row: {
          demand_type: string | null
          demand_weight: number
          id: string
          lat: number
          lng: number
          metadata: Json | null
          organization_id: string
          timestamp: string
        }
        Insert: {
          demand_type?: string | null
          demand_weight?: number
          id?: string
          lat: number
          lng: number
          metadata?: Json | null
          organization_id: string
          timestamp?: string
        }
        Update: {
          demand_type?: string | null
          demand_weight?: number
          id?: string
          lat?: number
          lng?: number
          metadata?: Json | null
          organization_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_demand_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_location_views: {
        Row: {
          id: string
          location_id: string
          source: string | null
          user_id: string
          view_duration_seconds: number | null
          viewed_at: string
        }
        Insert: {
          id?: string
          location_id: string
          source?: string | null
          user_id: string
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          source?: string | null
          user_id?: string
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_views_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      appointment_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      location_category:
        | "retail"
        | "warehouse"
        | "service-center"
        | "headquarters"
        | "branch"
      payment_method: "stripe" | "paypal" | "crypto" | "bank_transfer"
      subscription_plan: "starter" | "professional" | "enterprise"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
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
      app_role: ["admin", "staff"],
      appointment_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      location_category: [
        "retail",
        "warehouse",
        "service-center",
        "headquarters",
        "branch",
      ],
      payment_method: ["stripe", "paypal", "crypto", "bank_transfer"],
      subscription_plan: ["starter", "professional", "enterprise"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
      ],
    },
  },
} as const
