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
      account_co_owners: {
        Row: {
          co_owner_user_id: string
          created_at: string
          id: string
          owner_user_id: string
        }
        Insert: {
          co_owner_user_id: string
          created_at?: string
          id?: string
          owner_user_id: string
        }
        Update: {
          co_owner_user_id?: string
          created_at?: string
          id?: string
          owner_user_id?: string
        }
        Relationships: []
      }
      agent_complaints: {
        Row: {
          agent_id: string
          category: string
          created_at: string
          id: string
          message: string
          property_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          category?: string
          created_at?: string
          id?: string
          message: string
          property_id?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          category?: string
          created_at?: string
          id?: string
          message?: string
          property_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_complaints_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          avatar: string | null
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          invitation_expires_at: string | null
          invitation_status: string | null
          invitation_token: string | null
          invited_by: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          invitation_expires_at?: string | null
          invitation_status?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          invitation_expires_at?: string | null
          invitation_status?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agent_properties: {
        Row: {
          ai_agent_id: string
          created_at: string
          id: string
          property_id: string
        }
        Insert: {
          ai_agent_id: string
          created_at?: string
          id?: string
          property_id: string
        }
        Update: {
          ai_agent_id?: string
          created_at?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_properties_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          linked_agent_id: string | null
          name: string
          owner_id: string
          personality_prompt: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          linked_agent_id?: string | null
          name: string
          owner_id: string
          personality_prompt?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          linked_agent_id?: string | null
          name?: string
          owner_id?: string
          personality_prompt?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_linked_agent_id_fkey"
            columns: ["linked_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_enabled: boolean
          ai_queued_at: string | null
          ai_queued_paused: boolean | null
          ai_queued_preview: string | null
          ai_queued_window_ms: number | null
          assigned_agent_id: string | null
          created_at: string
          id: string
          is_test: boolean
          last_extraction_at: string | null
          last_visitor_message_at: string | null
          property_id: string
          sf_export_ready_at: string | null
          sf_export_trigger: string | null
          status: string
          updated_at: string
          visitor_id: string
        }
        Insert: {
          ai_enabled?: boolean
          ai_queued_at?: string | null
          ai_queued_paused?: boolean | null
          ai_queued_preview?: string | null
          ai_queued_window_ms?: number | null
          assigned_agent_id?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          last_extraction_at?: string | null
          last_visitor_message_at?: string | null
          property_id: string
          sf_export_ready_at?: string | null
          sf_export_trigger?: string | null
          status?: string
          updated_at?: string
          visitor_id: string
        }
        Update: {
          ai_enabled?: boolean
          ai_queued_at?: string | null
          ai_queued_paused?: boolean | null
          ai_queued_preview?: string | null
          ai_queued_window_ms?: number | null
          assigned_agent_id?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          last_extraction_at?: string | null
          last_visitor_message_at?: string | null
          property_id?: string
          sf_export_ready_at?: string | null
          sf_export_trigger?: string | null
          status?: string
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_settings: {
        Row: {
          auto_purge_enabled: boolean
          created_at: string
          id: string
          last_purge_at: string | null
          property_id: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          auto_purge_enabled?: boolean
          created_at?: string
          id?: string
          last_purge_at?: string | null
          property_id: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          auto_purge_enabled?: boolean
          created_at?: string
          id?: string
          last_purge_at?: string | null
          property_id?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          notification_emails: string[] | null
          notify_on_escalation: boolean
          notify_on_new_conversation: boolean
          notify_on_phone_submission: boolean
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          notification_emails?: string[] | null
          notify_on_escalation?: boolean
          notify_on_new_conversation?: boolean
          notify_on_phone_submission?: boolean
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          notification_emails?: string[] | null
          notify_on_escalation?: boolean
          notify_on_new_conversation?: boolean
          notify_on_phone_submission?: boolean
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notification_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      get_started_submissions: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          owns_center: boolean
          phone: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          owns_center: boolean
          phone: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          owns_center?: boolean
          phone?: string
          website?: string | null
        }
        Relationships: []
      }
      health_check_results: {
        Row: {
          category: string
          created_at: string
          details: Json | null
          id: string
          latency_ms: number
          run_id: string
          status: string
          test_name: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: Json | null
          id?: string
          latency_ms?: number
          run_id: string
          status: string
          test_name: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          latency_ms?: number
          run_id?: string
          status?: string
          test_name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          sender_type: string
          sequence_number: number
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          sender_type: string
          sequence_number?: number
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
          sender_type?: string
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          property_id: string
          recipient: string
          recipient_type: string
          status: string
          visitor_name: string | null
        }
        Insert: {
          channel: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          property_id: string
          recipient: string
          recipient_type?: string
          status?: string
          visitor_name?: string | null
        }
        Update: {
          channel?: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          property_id?: string
          recipient?: string
          recipient_type?: string
          status?: string
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          page_title: string | null
          property_id: string
          url: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          page_title?: string | null
          property_id: string
          url: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          page_title?: string | null
          property_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_analytics_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      phi_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          phi_fields_accessed: string[] | null
          property_id: string | null
          resource_id: string
          resource_type: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          phi_fields_accessed?: string[] | null
          property_id?: string | null
          resource_id: string
          resource_type: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          phi_fields_accessed?: string[] | null
          property_id?: string | null
          resource_id?: string
          resource_type?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          dashboard_tour_complete: boolean
          email: string
          full_name: string | null
          id: string
          onboarding_complete: boolean
          session_timeout_minutes: number
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          dashboard_tour_complete?: boolean
          email: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          session_timeout_minutes?: number
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          dashboard_tour_complete?: boolean
          email?: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          session_timeout_minutes?: number
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          ai_base_prompt: string | null
          ai_collect_date_of_birth: boolean | null
          ai_collect_insurance_company: boolean | null
          ai_collect_member_id: boolean | null
          ai_insurance_collection_enabled: boolean | null
          ai_response_delay_max_ms: number | null
          ai_response_delay_min_ms: number | null
          auto_escalation_enabled: boolean | null
          business_address: string | null
          business_description: string | null
          business_email: string | null
          business_hours: string | null
          business_logo_url: string | null
          business_phone: string | null
          calendly_url: string | null
          created_at: string
          domain: string
          drop_apostrophes_enabled: boolean | null
          drop_capitalization_enabled: boolean | null
          escalation_keywords: string[] | null
          geo_allowed_states: string[]
          geo_blocked_message: string | null
          geo_filter_mode: string
          greeting: string | null
          human_typos_enabled: boolean | null
          id: string
          insurance_collection_prompt: string | null
          max_ai_messages_before_escalation: number | null
          name: string
          natural_lead_capture_enabled: boolean | null
          offline_message: string | null
          proactive_message: string | null
          proactive_message_delay_seconds: number | null
          proactive_message_enabled: boolean | null
          quick_reply_after_first_enabled: boolean | null
          require_email_before_chat: boolean | null
          require_insurance_card_before_chat: boolean | null
          require_name_before_chat: boolean | null
          require_phone_before_chat: boolean | null
          smart_typing_enabled: boolean | null
          typing_indicator_max_ms: number | null
          typing_indicator_min_ms: number | null
          typing_wpm: number | null
          updated_at: string
          user_id: string
          widget_color: string | null
          widget_effect_intensity: string | null
          widget_effect_interval_seconds: number | null
          widget_effect_type: string | null
          widget_icon: string | null
        }
        Insert: {
          ai_base_prompt?: string | null
          ai_collect_date_of_birth?: boolean | null
          ai_collect_insurance_company?: boolean | null
          ai_collect_member_id?: boolean | null
          ai_insurance_collection_enabled?: boolean | null
          ai_response_delay_max_ms?: number | null
          ai_response_delay_min_ms?: number | null
          auto_escalation_enabled?: boolean | null
          business_address?: string | null
          business_description?: string | null
          business_email?: string | null
          business_hours?: string | null
          business_logo_url?: string | null
          business_phone?: string | null
          calendly_url?: string | null
          created_at?: string
          domain: string
          drop_apostrophes_enabled?: boolean | null
          drop_capitalization_enabled?: boolean | null
          escalation_keywords?: string[] | null
          geo_allowed_states?: string[]
          geo_blocked_message?: string | null
          geo_filter_mode?: string
          greeting?: string | null
          human_typos_enabled?: boolean | null
          id?: string
          insurance_collection_prompt?: string | null
          max_ai_messages_before_escalation?: number | null
          name: string
          natural_lead_capture_enabled?: boolean | null
          offline_message?: string | null
          proactive_message?: string | null
          proactive_message_delay_seconds?: number | null
          proactive_message_enabled?: boolean | null
          quick_reply_after_first_enabled?: boolean | null
          require_email_before_chat?: boolean | null
          require_insurance_card_before_chat?: boolean | null
          require_name_before_chat?: boolean | null
          require_phone_before_chat?: boolean | null
          smart_typing_enabled?: boolean | null
          typing_indicator_max_ms?: number | null
          typing_indicator_min_ms?: number | null
          typing_wpm?: number | null
          updated_at?: string
          user_id: string
          widget_color?: string | null
          widget_effect_intensity?: string | null
          widget_effect_interval_seconds?: number | null
          widget_effect_type?: string | null
          widget_icon?: string | null
        }
        Update: {
          ai_base_prompt?: string | null
          ai_collect_date_of_birth?: boolean | null
          ai_collect_insurance_company?: boolean | null
          ai_collect_member_id?: boolean | null
          ai_insurance_collection_enabled?: boolean | null
          ai_response_delay_max_ms?: number | null
          ai_response_delay_min_ms?: number | null
          auto_escalation_enabled?: boolean | null
          business_address?: string | null
          business_description?: string | null
          business_email?: string | null
          business_hours?: string | null
          business_logo_url?: string | null
          business_phone?: string | null
          calendly_url?: string | null
          created_at?: string
          domain?: string
          drop_apostrophes_enabled?: boolean | null
          drop_capitalization_enabled?: boolean | null
          escalation_keywords?: string[] | null
          geo_allowed_states?: string[]
          geo_blocked_message?: string | null
          geo_filter_mode?: string
          greeting?: string | null
          human_typos_enabled?: boolean | null
          id?: string
          insurance_collection_prompt?: string | null
          max_ai_messages_before_escalation?: number | null
          name?: string
          natural_lead_capture_enabled?: boolean | null
          offline_message?: string | null
          proactive_message?: string | null
          proactive_message_delay_seconds?: number | null
          proactive_message_enabled?: boolean | null
          quick_reply_after_first_enabled?: boolean | null
          require_email_before_chat?: boolean | null
          require_insurance_card_before_chat?: boolean | null
          require_name_before_chat?: boolean | null
          require_phone_before_chat?: boolean | null
          smart_typing_enabled?: boolean | null
          typing_indicator_max_ms?: number | null
          typing_indicator_min_ms?: number | null
          typing_wpm?: number | null
          updated_at?: string
          user_id?: string
          widget_color?: string | null
          widget_effect_intensity?: string | null
          widget_effect_interval_seconds?: number | null
          widget_effect_type?: string | null
          widget_icon?: string | null
        }
        Relationships: []
      }
      property_agents: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          property_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          property_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      salesforce_exports: {
        Row: {
          conversation_id: string
          export_type: string
          exported_at: string
          exported_by: string | null
          id: string
          salesforce_lead_id: string
        }
        Insert: {
          conversation_id: string
          export_type?: string
          exported_at?: string
          exported_by?: string | null
          id?: string
          salesforce_lead_id: string
        }
        Update: {
          conversation_id?: string
          export_type?: string
          exported_at?: string
          exported_by?: string | null
          id?: string
          salesforce_lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesforce_exports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      salesforce_settings: {
        Row: {
          access_token: string | null
          auto_export_on_conversation_end: boolean
          auto_export_on_escalation: boolean
          auto_export_on_insurance_detected: boolean
          auto_export_on_phone_detected: boolean
          client_id: string | null
          client_secret: string | null
          created_at: string
          enabled: boolean
          field_mappings: Json
          id: string
          include_insurance_card_attachment: boolean
          instance_url: string | null
          insurance_card_lead_status: string | null
          login_url: string | null
          no_insurance_card_lead_status: string | null
          pending_code_verifier: string | null
          pending_oauth_expires_at: string | null
          pending_oauth_token: string | null
          property_id: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          auto_export_on_conversation_end?: boolean
          auto_export_on_escalation?: boolean
          auto_export_on_insurance_detected?: boolean
          auto_export_on_phone_detected?: boolean
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          enabled?: boolean
          field_mappings?: Json
          id?: string
          include_insurance_card_attachment?: boolean
          instance_url?: string | null
          insurance_card_lead_status?: string | null
          login_url?: string | null
          no_insurance_card_lead_status?: string | null
          pending_code_verifier?: string | null
          pending_oauth_expires_at?: string | null
          pending_oauth_token?: string | null
          property_id: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          auto_export_on_conversation_end?: boolean
          auto_export_on_escalation?: boolean
          auto_export_on_insurance_detected?: boolean
          auto_export_on_phone_detected?: boolean
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          enabled?: boolean
          field_mappings?: Json
          id?: string
          include_insurance_card_attachment?: boolean
          instance_url?: string | null
          insurance_card_lead_status?: string | null
          login_url?: string | null
          no_insurance_card_lead_status?: string | null
          pending_code_verifier?: string | null
          pending_oauth_expires_at?: string | null
          pending_oauth_token?: string | null
          property_id?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesforce_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_notification_settings: {
        Row: {
          access_token: string | null
          bot_user_id: string | null
          channel_name: string | null
          created_at: string
          enabled: boolean
          id: string
          incoming_webhook_channel: string | null
          incoming_webhook_url: string | null
          legacy_webhook_url: string | null
          notify_on_escalation: boolean
          notify_on_new_conversation: boolean
          notify_on_phone_submission: boolean
          property_id: string
          team_id: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          bot_user_id?: string | null
          channel_name?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          incoming_webhook_channel?: string | null
          incoming_webhook_url?: string | null
          legacy_webhook_url?: string | null
          notify_on_escalation?: boolean
          notify_on_new_conversation?: boolean
          notify_on_phone_submission?: boolean
          property_id: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          bot_user_id?: string | null
          channel_name?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          incoming_webhook_channel?: string | null
          incoming_webhook_url?: string | null
          legacy_webhook_url?: string | null
          notify_on_escalation?: boolean
          notify_on_new_conversation?: boolean
          notify_on_phone_submission?: boolean
          property_id?: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_notification_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          is_comped: boolean
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_comped?: boolean
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_comped?: boolean
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_call_signals: {
        Row: {
          caller_id: string
          caller_type: string
          conversation_id: string
          created_at: string
          id: string
          signal_data: Json | null
          signal_type: string
        }
        Insert: {
          caller_id: string
          caller_type: string
          conversation_id: string
          created_at?: string
          id?: string
          signal_data?: Json | null
          signal_type: string
        }
        Update: {
          caller_id?: string
          caller_type?: string
          conversation_id?: string
          created_at?: string
          id?: string
          signal_data?: Json | null
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_call_signals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          addiction_history: string | null
          age: string | null
          browser_info: string | null
          created_at: string
          current_page: string | null
          date_of_birth: string | null
          drug_of_choice: string | null
          email: string | null
          gclid: string | null
          id: string
          insurance_card_url: string | null
          insurance_company: string | null
          insurance_info: string | null
          location: string | null
          member_id: string | null
          name: string | null
          occupation: string | null
          phone: string | null
          property_id: string
          session_id: string
          treatment_interest: string | null
          urgency_level: string | null
        }
        Insert: {
          addiction_history?: string | null
          age?: string | null
          browser_info?: string | null
          created_at?: string
          current_page?: string | null
          date_of_birth?: string | null
          drug_of_choice?: string | null
          email?: string | null
          gclid?: string | null
          id?: string
          insurance_card_url?: string | null
          insurance_company?: string | null
          insurance_info?: string | null
          location?: string | null
          member_id?: string | null
          name?: string | null
          occupation?: string | null
          phone?: string | null
          property_id: string
          session_id: string
          treatment_interest?: string | null
          urgency_level?: string | null
        }
        Update: {
          addiction_history?: string | null
          age?: string | null
          browser_info?: string | null
          created_at?: string
          current_page?: string | null
          date_of_birth?: string | null
          drug_of_choice?: string | null
          email?: string | null
          gclid?: string | null
          id?: string
          insurance_card_url?: string | null
          insurance_company?: string | null
          insurance_info?: string | null
          location?: string | null
          member_id?: string | null
          name?: string | null
          occupation?: string | null
          phone?: string | null
          property_id?: string
          session_id?: string
          treatment_interest?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitors_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_client_details: { Args: { client_user_id: string }; Returns: Json }
      admin_client_overview: {
        Args: never
        Returns: {
          agents_count: number
          company_name: string
          complaints_count: number
          conversations_count: number
          created_at: string
          email: string
          full_name: string
          leads_count: number
          phones_count: number
          properties_count: number
          user_id: string
        }[]
      }
      admin_conversation_messages: {
        Args: { p_conversation_id: string }
        Returns: {
          content: string
          created_at: string
          message_id: string
          read: boolean
          sender_id: string
          sender_type: string
          sequence_number: number
        }[]
      }
      admin_conversations_browse: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          ai_enabled: boolean
          client_email: string
          client_name: string
          conversation_id: string
          created_at: string
          message_count: number
          property_domain: string
          property_name: string
          status: string
          updated_at: string
          visitor_email: string
          visitor_name: string
          visitor_phone: string
        }[]
      }
      admin_daily_stats: {
        Args: { p_days?: number }
        Returns: {
          day: string
          leads_captured: number
          new_conversations: number
          phones_captured: number
        }[]
      }
      check_onboarding_complete: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      conversation_exists: { Args: { conv_uuid: string }; Returns: boolean }
      get_account_owner_ids: { Args: { user_uuid: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_agent_by_invitation_token: {
        Args: { token: string }
        Returns: {
          email: string
          invitation_expires_at: string
          invited_by: string
          name: string
        }[]
      }
      lookup_user_id_by_email: {
        Args: { lookup_email: string }
        Returns: string
      }
      mark_onboarding_complete: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      property_exists: { Args: { property_uuid: string }; Returns: boolean }
      touch_conversation_presence: {
        Args: { p_session_id: string; p_status?: string; p_visitor_id: string }
        Returns: Json
      }
      user_is_agent_for_property: {
        Args: { property_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_owns_property: {
        Args: { property_uuid: string; user_uuid: string }
        Returns: boolean
      }
      verify_agent_invitation: {
        Args: { p_email: string; p_token: string }
        Returns: {
          email: string
          id: string
          invitation_expires_at: string
        }[]
      }
      visitor_matches_session: {
        Args: { visitor_session_id: string; visitor_uuid: string }
        Returns: boolean
      }
      visitor_owns_conversation: {
        Args: { conv_id: string; visitor_session: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "client" | "agent"
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
      app_role: ["admin", "user", "client", "agent"],
    },
  },
} as const
