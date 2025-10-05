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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          current_file: string | null
          cursor_position: Json | null
          id: string
          last_active: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          current_file?: string | null
          cursor_position?: Json | null
          id?: string
          last_active?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          current_file?: string | null
          cursor_position?: Json | null
          id?: string
          last_active?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_chat_messages: {
        Row: {
          content: string
          created_at: string
          customization_id: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          customization_id?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          customization_id?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_messages_customization_id_fkey"
            columns: ["customization_id"]
            isOneToOne: false
            referencedRelation: "admin_customizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_customizations: {
        Row: {
          applied_at: string | null
          applied_changes: Json
          code_changes: string | null
          created_at: string
          customization_type: string
          id: string
          prompt: string
          status: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          applied_changes?: Json
          code_changes?: string | null
          created_at?: string
          customization_type: string
          id?: string
          prompt: string
          status?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          applied_changes?: Json
          code_changes?: string | null
          created_at?: string
          customization_type?: string
          id?: string
          prompt?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_improvements: {
        Row: {
          after_metrics: Json | null
          analysis: Json | null
          approved_by: string | null
          before_metrics: Json | null
          created_at: string | null
          deployed_at: string | null
          id: string
          improvement_type: string
          new_version: string | null
          old_version: string | null
          reason: string
          status: string | null
          success_improvement: number | null
        }
        Insert: {
          after_metrics?: Json | null
          analysis?: Json | null
          approved_by?: string | null
          before_metrics?: Json | null
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          improvement_type: string
          new_version?: string | null
          old_version?: string | null
          reason: string
          status?: string | null
          success_improvement?: number | null
        }
        Update: {
          after_metrics?: Json | null
          analysis?: Json | null
          approved_by?: string | null
          before_metrics?: Json | null
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          improvement_type?: string
          new_version?: string | null
          old_version?: string | null
          reason?: string
          status?: string | null
          success_improvement?: number | null
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          best_approach: string
          category: string
          code_examples: Json | null
          common_mistakes: Json | null
          confidence_score: number | null
          created_at: string | null
          id: string
          learned_from_cases: number | null
          pattern_name: string
          success_rate: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          best_approach: string
          category: string
          code_examples?: Json | null
          common_mistakes?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          learned_from_cases?: number | null
          pattern_name: string
          success_rate?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          best_approach?: string
          category?: string
          code_examples?: Json | null
          common_mistakes?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          learned_from_cases?: number | null
          pattern_name?: string
          success_rate?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_plugins: {
        Row: {
          config_schema: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          install_count: number | null
          is_public: boolean | null
          plugin_code: string
          plugin_name: string
          rating: number | null
          updated_at: string
          version: string
        }
        Insert: {
          config_schema: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          install_count?: number | null
          is_public?: boolean | null
          plugin_code: string
          plugin_name: string
          rating?: number | null
          updated_at?: string
          version?: string
        }
        Update: {
          config_schema?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          install_count?: number | null
          is_public?: boolean | null
          plugin_code?: string
          plugin_name?: string
          rating?: number | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      ai_workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
          user_id: string
          workflow_name: string
          workflow_steps: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id: string
          workflow_name: string
          workflow_steps: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
          workflow_name?: string
          workflow_steps?: Json
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          encrypted: boolean | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_rotated_at: string | null
          last_used_at: string | null
          rate_limit: number | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          encrypted?: boolean | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_rotated_at?: string | null
          last_used_at?: string | null
          rate_limit?: number | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          encrypted?: boolean | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_rotated_at?: string | null
          last_used_at?: string | null
          rate_limit?: number | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      architecture_plans: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          architecture_overview: string
          component_breakdown: Json
          conversation_id: string
          created_at: string
          estimated_complexity: string | null
          file_structure: Json
          id: string
          plan_type: string
          potential_challenges: Json | null
          recommended_approach: string | null
          technology_stack: Json
          user_request: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          architecture_overview: string
          component_breakdown?: Json
          conversation_id: string
          created_at?: string
          estimated_complexity?: string | null
          file_structure?: Json
          id?: string
          plan_type?: string
          potential_challenges?: Json | null
          recommended_approach?: string | null
          technology_stack?: Json
          user_request: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          architecture_overview?: string
          component_breakdown?: Json
          conversation_id?: string
          created_at?: string
          estimated_complexity?: string | null
          file_structure?: Json
          id?: string
          plan_type?: string
          potential_challenges?: Json | null
          recommended_approach?: string | null
          technology_stack?: Json
          user_request?: string
        }
        Relationships: []
      }
      assistant_conversations: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_fixes: {
        Row: {
          ai_confidence: number | null
          applied_at: string | null
          created_at: string
          error_id: string
          explanation: string
          fix_type: string
          fixed_code: string
          id: string
          original_code: string | null
          rolled_back_at: string | null
          status: string
          verification_result: Json | null
          verified_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          applied_at?: string | null
          created_at?: string
          error_id: string
          explanation: string
          fix_type: string
          fixed_code: string
          id?: string
          original_code?: string | null
          rolled_back_at?: string | null
          status?: string
          verification_result?: Json | null
          verified_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          applied_at?: string | null
          created_at?: string
          error_id?: string
          explanation?: string
          fix_type?: string
          fixed_code?: string
          id?: string
          original_code?: string | null
          rolled_back_at?: string | null
          status?: string
          verification_result?: Json | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_fixes_error_id_fkey"
            columns: ["error_id"]
            isOneToOne: false
            referencedRelation: "detected_errors"
            referencedColumns: ["id"]
          },
        ]
      }
      code_analysis: {
        Row: {
          analysis_type: string
          created_at: string
          id: string
          issues: Json | null
          project_id: string
          score: number | null
          suggestions: Json | null
        }
        Insert: {
          analysis_type: string
          created_at?: string
          id?: string
          issues?: Json | null
          project_id: string
          score?: number | null
          suggestions?: Json | null
        }
        Update: {
          analysis_type?: string
          created_at?: string
          id?: string
          issues?: Json | null
          project_id?: string
          score?: number | null
          suggestions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "code_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      code_documentation: {
        Row: {
          api_docs: Json | null
          created_at: string
          doc_type: string
          documented_code: string
          file_path: string
          id: string
          original_code: string
          project_id: string | null
          readme_content: string | null
          user_id: string
        }
        Insert: {
          api_docs?: Json | null
          created_at?: string
          doc_type?: string
          documented_code: string
          file_path: string
          id?: string
          original_code: string
          project_id?: string | null
          readme_content?: string | null
          user_id: string
        }
        Update: {
          api_docs?: Json | null
          created_at?: string
          doc_type?: string
          documented_code?: string
          file_path?: string
          id?: string
          original_code?: string
          project_id?: string | null
          readme_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_documentation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_sessions: {
        Row: {
          active_users: Json
          created_by: string
          ended_at: string | null
          id: string
          is_active: boolean
          project_id: string
          session_name: string
          started_at: string
        }
        Insert: {
          active_users?: Json
          created_by: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          session_name: string
          started_at?: string
        }
        Update: {
          active_users?: Json
          created_by?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
          session_name?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_messages: {
        Row: {
          code_block: string | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          code_block?: string | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          code_block?: string | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "team_ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      component_dependencies: {
        Row: {
          complexity_score: number | null
          component_name: string
          component_type: string
          conversation_id: string
          created_at: string
          criticality: string | null
          depends_on: Json | null
          id: string
          last_modified_at: string
          used_by: Json | null
        }
        Insert: {
          complexity_score?: number | null
          component_name: string
          component_type: string
          conversation_id: string
          created_at?: string
          criticality?: string | null
          depends_on?: Json | null
          id?: string
          last_modified_at?: string
          used_by?: Json | null
        }
        Update: {
          complexity_score?: number | null
          component_name?: string
          component_type?: string
          conversation_id?: string
          created_at?: string
          criticality?: string | null
          depends_on?: Json | null
          id?: string
          last_modified_at?: string
          used_by?: Json | null
        }
        Relationships: []
      }
      component_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          preview_image: string | null
          tags: string[] | null
          template_code: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          preview_image?: string | null
          tags?: string[] | null
          template_code: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          preview_image?: string | null
          tags?: string[] | null
          template_code?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      conversation_learnings: {
        Row: {
          confidence: number | null
          context: Json | null
          conversation_id: string | null
          created_at: string
          id: string
          last_reinforced_at: string
          learned_pattern: string
          pattern_category: string
          times_reinforced: number | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          context?: Json | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          last_reinforced_at?: string
          learned_pattern: string
          pattern_category: string
          times_reinforced?: number | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          context?: Json | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          last_reinforced_at?: string
          learned_pattern?: string
          pattern_category?: string
          times_reinforced?: number | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          current_code: string | null
          id: string
          project_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_code?: string | null
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_code?: string | null
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_project_patterns: {
        Row: {
          confidence_score: number | null
          contexts: Json | null
          first_seen_at: string
          id: string
          last_used_at: string
          pattern_code: string
          pattern_name: string
          pattern_type: string
          success_rate: number | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          contexts?: Json | null
          first_seen_at?: string
          id?: string
          last_used_at?: string
          pattern_code: string
          pattern_name: string
          pattern_type: string
          success_rate?: number | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          contexts?: Json | null
          first_seen_at?: string
          id?: string
          last_used_at?: string
          pattern_code?: string
          pattern_name?: string
          pattern_type?: string
          success_rate?: number | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      customization_snapshots: {
        Row: {
          created_at: string
          customizations: Json
          description: string | null
          id: string
          name: string
          screenshot_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customizations?: Json
          description?: string | null
          id?: string
          name: string
          screenshot_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customizations?: Json
          description?: string | null
          id?: string
          name?: string
          screenshot_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      database_alert_config: {
        Row: {
          alert_type: string
          created_at: string | null
          credential_id: string | null
          enabled: boolean | null
          id: string
          notification_channels: Json | null
          threshold: Json
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          credential_id?: string | null
          enabled?: boolean | null
          id?: string
          notification_channels?: Json | null
          threshold: Json
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          credential_id?: string | null
          enabled?: boolean | null
          id?: string
          notification_channels?: Json | null
          threshold?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_alert_config_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "database_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      database_audit_log: {
        Row: {
          action: string
          created_at: string | null
          credential_id: string | null
          details: Json | null
          id: string
          ip_address: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          credential_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          status: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          credential_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_audit_log_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "database_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      database_connection_errors: {
        Row: {
          ai_analysis: Json | null
          created_at: string | null
          credential_id: string | null
          error_context: Json | null
          error_message: string
          fix_applied: boolean | null
          id: string
          provider: string
          resolved: boolean | null
          resolved_at: string | null
          suggested_fixes: Json | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string | null
          credential_id?: string | null
          error_context?: Json | null
          error_message: string
          fix_applied?: boolean | null
          id?: string
          provider: string
          resolved?: boolean | null
          resolved_at?: string | null
          suggested_fixes?: Json | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string | null
          credential_id?: string | null
          error_context?: Json | null
          error_message?: string
          fix_applied?: boolean | null
          id?: string
          provider?: string
          resolved?: boolean | null
          resolved_at?: string | null
          suggested_fixes?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_connection_errors_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "database_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      database_connection_health: {
        Row: {
          alerts_sent: boolean | null
          check_timestamp: string | null
          credential_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          status: string
        }
        Insert: {
          alerts_sent?: boolean | null
          check_timestamp?: string | null
          credential_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status: string
        }
        Update: {
          alerts_sent?: boolean | null
          check_timestamp?: string | null
          credential_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_connection_health_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "database_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      database_connection_patterns: {
        Row: {
          common_environment: string | null
          configuration: Json
          created_at: string | null
          id: string
          last_success_at: string | null
          notes: string | null
          provider: string
          success_count: number | null
        }
        Insert: {
          common_environment?: string | null
          configuration: Json
          created_at?: string | null
          id?: string
          last_success_at?: string | null
          notes?: string | null
          provider: string
          success_count?: number | null
        }
        Update: {
          common_environment?: string | null
          configuration?: Json
          created_at?: string | null
          id?: string
          last_success_at?: string | null
          notes?: string | null
          provider?: string
          success_count?: number | null
        }
        Relationships: []
      }
      database_connection_retries: {
        Row: {
          attempt_number: number
          attempted_at: string | null
          backoff_delay_ms: number | null
          credential_id: string | null
          error_message: string | null
          id: string
          retry_strategy: Json | null
          success: boolean
        }
        Insert: {
          attempt_number: number
          attempted_at?: string | null
          backoff_delay_ms?: number | null
          credential_id?: string | null
          error_message?: string | null
          id?: string
          retry_strategy?: Json | null
          success: boolean
        }
        Update: {
          attempt_number?: number
          attempted_at?: string | null
          backoff_delay_ms?: number | null
          credential_id?: string | null
          error_message?: string | null
          id?: string
          retry_strategy?: Json | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "database_connection_retries_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "database_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      database_credentials: {
        Row: {
          connection_name: string
          created_at: string | null
          credentials: Json
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          provider: string
          test_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connection_name: string
          created_at?: string | null
          credentials: Json
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          provider: string
          test_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connection_name?: string
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          provider?: string
          test_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      database_knowledge_base: {
        Row: {
          category: string
          code_examples: Json | null
          confidence_score: number | null
          created_at: string | null
          description: string
          id: string
          last_used_at: string | null
          learned_from_error_id: string | null
          provider: string
          solution: string
          success_rate: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          code_examples?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          description: string
          id?: string
          last_used_at?: string | null
          learned_from_error_id?: string | null
          provider: string
          solution: string
          success_rate?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          code_examples?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          id?: string
          last_used_at?: string | null
          learned_from_error_id?: string | null
          provider?: string
          solution?: string
          success_rate?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "database_knowledge_base_learned_from_error_id_fkey"
            columns: ["learned_from_error_id"]
            isOneToOne: false
            referencedRelation: "database_connection_errors"
            referencedColumns: ["id"]
          },
        ]
      }
      database_performance_metrics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          credential_id: string | null
          failed_requests: number | null
          id: string
          max_response_time_ms: number | null
          metric_date: string | null
          min_response_time_ms: number | null
          successful_requests: number | null
          total_requests: number | null
          uptime_percentage: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          credential_id?: string | null
          failed_requests?: number | null
          id?: string
          max_response_time_ms?: number | null
          metric_date?: string | null
          min_response_time_ms?: number | null
          successful_requests?: number | null
          total_requests?: number | null
          uptime_percentage?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          credential_id?: string | null
          failed_requests?: number | null
          id?: string
          max_response_time_ms?: number | null
          metric_date?: string | null
          min_response_time_ms?: number | null
          successful_requests?: number | null
          total_requests?: number | null
          uptime_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "database_performance_metrics_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "database_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      database_provider_docs: {
        Row: {
          cache_expires_at: string | null
          documentation: Json
          fetched_at: string | null
          id: string
          provider: string
          version: string | null
        }
        Insert: {
          cache_expires_at?: string | null
          documentation: Json
          fetched_at?: string | null
          id?: string
          provider: string
          version?: string | null
        }
        Update: {
          cache_expires_at?: string | null
          documentation?: Json
          fetched_at?: string | null
          id?: string
          provider?: string
          version?: string | null
        }
        Relationships: []
      }
      dependency_audits: {
        Row: {
          audit_score: number | null
          created_at: string
          current_dependencies: Json
          id: string
          project_id: string | null
          security_issues: Json
          suggested_additions: Json
          suggested_removals: Json
          user_id: string
          version_conflicts: Json
        }
        Insert: {
          audit_score?: number | null
          created_at?: string
          current_dependencies?: Json
          id?: string
          project_id?: string | null
          security_issues?: Json
          suggested_additions?: Json
          suggested_removals?: Json
          user_id: string
          version_conflicts?: Json
        }
        Update: {
          audit_score?: number | null
          created_at?: string
          current_dependencies?: Json
          id?: string
          project_id?: string | null
          security_issues?: Json
          suggested_additions?: Json
          suggested_removals?: Json
          user_id?: string
          version_conflicts?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dependency_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_error_patterns: {
        Row: {
          created_at: string
          diagnosis: string | null
          error_pattern: string
          error_type: string
          failure_count: number
          id: string
          last_used_at: string | null
          learned_at: string
          prevention_tips: Json | null
          provider: string
          related_errors: Json | null
          solution: Json
          success_count: number
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          error_pattern: string
          error_type: string
          failure_count?: number
          id?: string
          last_used_at?: string | null
          learned_at?: string
          prevention_tips?: Json | null
          provider: string
          related_errors?: Json | null
          solution: Json
          success_count?: number
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          error_pattern?: string
          error_type?: string
          failure_count?: number
          id?: string
          last_used_at?: string | null
          learned_at?: string
          prevention_tips?: Json | null
          provider?: string
          related_errors?: Json | null
          solution?: Json
          success_count?: number
        }
        Relationships: []
      }
      deployments: {
        Row: {
          build_duration: number | null
          created_at: string
          environment: string
          error_message: string | null
          id: string
          project_id: string | null
          ready_at: string | null
          status: string
          user_id: string
          vercel_deployment_id: string
          vercel_project_id: string
          vercel_url: string
        }
        Insert: {
          build_duration?: number | null
          created_at?: string
          environment?: string
          error_message?: string | null
          id?: string
          project_id?: string | null
          ready_at?: string | null
          status?: string
          user_id: string
          vercel_deployment_id: string
          vercel_project_id: string
          vercel_url: string
        }
        Update: {
          build_duration?: number | null
          created_at?: string
          environment?: string
          error_message?: string | null
          id?: string
          project_id?: string | null
          ready_at?: string | null
          status?: string
          user_id?: string
          vercel_deployment_id?: string
          vercel_project_id?: string
          vercel_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_errors: {
        Row: {
          auto_fix_enabled: boolean | null
          created_at: string
          error_context: Json | null
          error_message: string
          error_type: string
          file_path: string | null
          fix_attempts: number | null
          function_name: string | null
          id: string
          line_number: number | null
          resolved_at: string | null
          severity: string
          source: string
          stack_trace: string | null
          status: string
        }
        Insert: {
          auto_fix_enabled?: boolean | null
          created_at?: string
          error_context?: Json | null
          error_message: string
          error_type: string
          file_path?: string | null
          fix_attempts?: number | null
          function_name?: string | null
          id?: string
          line_number?: number | null
          resolved_at?: string | null
          severity?: string
          source: string
          stack_trace?: string | null
          status?: string
        }
        Update: {
          auto_fix_enabled?: boolean | null
          created_at?: string
          error_context?: Json | null
          error_message?: string
          error_type?: string
          file_path?: string | null
          fix_attempts?: number | null
          function_name?: string | null
          id?: string
          line_number?: number | null
          resolved_at?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
          status?: string
        }
        Relationships: []
      }
      error_fix_feedback: {
        Row: {
          applied_solution: Json | null
          created_at: string
          error_context: Json | null
          fix_applied_at: string
          fix_worked: boolean
          id: string
          pattern_id: string
          project_id: string | null
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          applied_solution?: Json | null
          created_at?: string
          error_context?: Json | null
          fix_applied_at?: string
          fix_worked: boolean
          id?: string
          pattern_id: string
          project_id?: string | null
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          applied_solution?: Json | null
          created_at?: string
          error_context?: Json | null
          fix_applied_at?: string
          fix_worked?: boolean
          id?: string
          pattern_id?: string
          project_id?: string | null
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_fix_feedback_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "universal_error_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      error_patterns: {
        Row: {
          affected_model: string | null
          auto_fix_success_rate: number | null
          common_user_prompts: Json | null
          error_pattern: string
          error_type: string
          fix_applied: boolean | null
          frequency: number | null
          id: string
          last_seen_at: string | null
          learned_at: string | null
          resolution_status: string | null
          solution: string | null
        }
        Insert: {
          affected_model?: string | null
          auto_fix_success_rate?: number | null
          common_user_prompts?: Json | null
          error_pattern: string
          error_type: string
          fix_applied?: boolean | null
          frequency?: number | null
          id?: string
          last_seen_at?: string | null
          learned_at?: string | null
          resolution_status?: string | null
          solution?: string | null
        }
        Update: {
          affected_model?: string | null
          auto_fix_success_rate?: number | null
          common_user_prompts?: Json | null
          error_pattern?: string
          error_type?: string
          fix_applied?: boolean | null
          frequency?: number | null
          id?: string
          last_seen_at?: string | null
          learned_at?: string | null
          resolution_status?: string | null
          solution?: string | null
        }
        Relationships: []
      }
      external_integrations: {
        Row: {
          config: Json | null
          created_at: string
          credentials: Json
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean | null
          last_tested_at: string | null
          test_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          credentials: Json
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean | null
          last_tested_at?: string | null
          test_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          credentials?: Json
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          test_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      featured_projects: {
        Row: {
          display_order: number | null
          featured_at: string
          featured_by: string
          id: string
          project_id: string
        }
        Insert: {
          display_order?: number | null
          featured_at?: string
          featured_by: string
          id?: string
          project_id: string
        }
        Update: {
          display_order?: number | null
          featured_at?: string
          featured_by?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fix_verifications: {
        Row: {
          created_at: string
          details: Json | null
          fix_id: string
          id: string
          passed: boolean
          verification_type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          fix_id: string
          id?: string
          passed: boolean
          verification_type: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          fix_id?: string
          id?: string
          passed?: boolean
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fix_verifications_fix_id_fkey"
            columns: ["fix_id"]
            isOneToOne: false
            referencedRelation: "auto_fixes"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          created_at: string
          id: string
          image_data: string
          project_id: string | null
          prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_data: string
          project_id?: string | null
          prompt: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_data?: string
          project_id?: string | null
          prompt?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_analytics: {
        Row: {
          code_worked: boolean | null
          conversation_history: Json | null
          cost_estimate: number | null
          created_at: string | null
          error_message: string | null
          existing_code_context: string | null
          feedback_type: Database["public"]["Enums"]["feedback_type"] | null
          generated_code: string
          generation_time_ms: number | null
          id: string
          model_used: string
          modifications_made: string | null
          project_id: string | null
          prompt_version: string
          status: Database["public"]["Enums"]["generation_status"]
          system_prompt: string
          time_to_accept_seconds: number | null
          tokens_used: number | null
          updated_at: string | null
          user_id: string | null
          user_modified: boolean | null
          user_prompt: string
          user_satisfaction_score: number | null
        }
        Insert: {
          code_worked?: boolean | null
          conversation_history?: Json | null
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          existing_code_context?: string | null
          feedback_type?: Database["public"]["Enums"]["feedback_type"] | null
          generated_code: string
          generation_time_ms?: number | null
          id?: string
          model_used: string
          modifications_made?: string | null
          project_id?: string | null
          prompt_version?: string
          status: Database["public"]["Enums"]["generation_status"]
          system_prompt: string
          time_to_accept_seconds?: number | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_modified?: boolean | null
          user_prompt: string
          user_satisfaction_score?: number | null
        }
        Update: {
          code_worked?: boolean | null
          conversation_history?: Json | null
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          existing_code_context?: string | null
          feedback_type?: Database["public"]["Enums"]["feedback_type"] | null
          generated_code?: string
          generation_time_ms?: number | null
          id?: string
          model_used?: string
          modifications_made?: string | null
          project_id?: string | null
          prompt_version?: string
          status?: Database["public"]["Enums"]["generation_status"]
          system_prompt?: string
          time_to_accept_seconds?: number | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_modified?: boolean | null
          user_prompt?: string
          user_satisfaction_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_analytics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_iterations: {
        Row: {
          analysis_results: Json
          created_at: string
          id: string
          improvements_made: Json
          iteration_number: number
          parent_generation_id: string | null
          quality_score_after: number | null
          quality_score_before: number | null
          refinement_type: string
        }
        Insert: {
          analysis_results: Json
          created_at?: string
          id?: string
          improvements_made: Json
          iteration_number: number
          parent_generation_id?: string | null
          quality_score_after?: number | null
          quality_score_before?: number | null
          refinement_type: string
        }
        Update: {
          analysis_results?: Json
          created_at?: string
          id?: string
          improvements_made?: Json
          iteration_number?: number
          parent_generation_id?: string | null
          quality_score_after?: number | null
          quality_score_before?: number | null
          refinement_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_iterations_parent_generation_id_fkey"
            columns: ["parent_generation_id"]
            isOneToOne: false
            referencedRelation: "generation_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_usage_logs: {
        Row: {
          action_type: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          integration_id: string
          request_data: Json | null
          response_data: Json | null
          success: boolean
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          integration_id: string
          request_data?: Json | null
          response_data?: Json | null
          success: boolean
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          integration_id?: string
          request_data?: Json | null
          response_data?: Json | null
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_usage_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "external_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          generated_code: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          generated_code?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          generated_code?: string | null
          id?: string
          role?: string
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
      model_performance: {
        Row: {
          cost_estimate: number | null
          created_at: string
          execution_time_ms: number | null
          id: string
          model_name: string
          quality_score: number | null
          success: boolean
          task_type: string
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          model_name: string
          quality_score?: number | null
          success: boolean
          task_type: string
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          model_name?: string
          quality_score?: number | null
          success?: boolean
          task_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      multi_model_logs: {
        Row: {
          cost_estimate: number | null
          created_at: string
          duration_ms: number | null
          execution_id: string | null
          id: string
          input_data: Json
          model_used: string
          output_data: Json | null
          step_number: number
          success: boolean
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          duration_ms?: number | null
          execution_id?: string | null
          id?: string
          input_data: Json
          model_used: string
          output_data?: Json | null
          step_number: number
          success: boolean
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          duration_ms?: number | null
          execution_id?: string | null
          id?: string
          input_data?: Json
          model_used?: string
          output_data?: Json | null
          step_number?: number
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "multi_model_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orchestration_runs: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          phases_completed: Json | null
          request: string
          results: Json | null
          status: string | null
          total_duration_ms: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          phases_completed?: Json | null
          request: string
          results?: Json | null
          status?: string | null
          total_duration_ms?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          phases_completed?: Json | null
          request?: string
          results?: Json | null
          status?: string | null
          total_duration_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orchestration_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_cache: {
        Row: {
          cache_key: string
          created_at: string
          hit_count: number | null
          id: string
          last_accessed_at: string
          pattern_data: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          hit_count?: number | null
          id?: string
          last_accessed_at?: string
          pattern_data: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          hit_count?: number | null
          id?: string
          last_accessed_at?: string
          pattern_data?: Json
        }
        Relationships: []
      }
      pattern_feedback: {
        Row: {
          accepted: boolean
          context: string | null
          created_at: string
          feedback_text: string | null
          id: string
          pattern_id: string | null
          user_id: string
        }
        Insert: {
          accepted: boolean
          context?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          pattern_id?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean
          context?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          pattern_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_feedback_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "cross_project_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_optimizations: {
        Row: {
          after_performance: Json
          applied: boolean | null
          applied_at: string | null
          before_performance: Json
          created_at: string
          id: string
          improvement_percentage: number | null
          optimization_type: string
          workflow_id: string
        }
        Insert: {
          after_performance: Json
          applied?: boolean | null
          applied_at?: string | null
          before_performance: Json
          created_at?: string
          id?: string
          improvement_percentage?: number | null
          optimization_type: string
          workflow_id: string
        }
        Update: {
          after_performance?: Json
          applied?: boolean | null
          applied_at?: string | null
          before_performance?: Json
          created_at?: string
          id?: string
          improvement_percentage?: number | null
          optimization_type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_optimizations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ai_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      plugin_installations: {
        Row: {
          config: Json | null
          id: string
          installed_at: string
          is_active: boolean | null
          plugin_id: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          id?: string
          installed_at?: string
          is_active?: boolean | null
          plugin_id: string
          user_id: string
        }
        Update: {
          config?: Json | null
          id?: string
          installed_at?: string
          is_active?: boolean | null
          plugin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_installations_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "ai_plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_templates: {
        Row: {
          author_id: string | null
          category: string | null
          code: Json
          created_at: string
          description: string | null
          id: string
          preview_image: string | null
          price: number
          purchases_count: number | null
          rating: number | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          code: Json
          created_at?: string
          description?: string | null
          id?: string
          preview_image?: string | null
          price?: number
          purchases_count?: number | null
          rating?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          code?: Json
          created_at?: string
          description?: string | null
          id?: string
          preview_image?: string | null
          price?: number
          purchases_count?: number | null
          rating?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_knowledge: {
        Row: {
          applicability_score: number | null
          code_examples: Json | null
          content: string
          created_at: string
          domain: string
          id: string
          knowledge_type: string
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          applicability_score?: number | null
          code_examples?: Json | null
          content: string
          created_at?: string
          domain: string
          id?: string
          knowledge_type: string
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          applicability_score?: number | null
          code_examples?: Json | null
          content?: string
          created_at?: string
          domain?: string
          id?: string
          knowledge_type?: string
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          github: string | null
          id: string
          profile_visibility: string | null
          twitter: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          github?: string | null
          id: string
          profile_visibility?: string | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          github?: string | null
          id?: string
          profile_visibility?: string | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_environment_variables: {
        Row: {
          created_at: string
          id: string
          key: string
          project_id: string
          target: string[]
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          project_id: string
          target?: string[]
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          project_id?: string
          target?: string[]
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_environment_variables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_content: string
          file_path: string
          file_type: string
          id: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_content: string
          file_path: string
          file_type: string
          id?: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_content?: string
          file_path?: string
          file_type?: string
          id?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_memory: {
        Row: {
          architectural_decisions: Json | null
          architecture: string | null
          code_structure: string | null
          coding_patterns: Json | null
          component_relationships: Json | null
          conversation_id: string
          created_at: string | null
          custom_instructions: string | null
          features: string[] | null
          file_structure: string | null
          id: string
          last_plan: Json | null
          performance_notes: string | null
          recent_changes: Json | null
          security_considerations: string | null
          tech_stack: string[] | null
          updated_at: string | null
        }
        Insert: {
          architectural_decisions?: Json | null
          architecture?: string | null
          code_structure?: string | null
          coding_patterns?: Json | null
          component_relationships?: Json | null
          conversation_id: string
          created_at?: string | null
          custom_instructions?: string | null
          features?: string[] | null
          file_structure?: string | null
          id?: string
          last_plan?: Json | null
          performance_notes?: string | null
          recent_changes?: Json | null
          security_considerations?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
        }
        Update: {
          architectural_decisions?: Json | null
          architecture?: string | null
          code_structure?: string | null
          coding_patterns?: Json | null
          component_relationships?: Json | null
          conversation_id?: string
          created_at?: string | null
          custom_instructions?: string | null
          features?: string[] | null
          file_structure?: string | null
          id?: string
          last_plan?: Json | null
          performance_notes?: string | null
          recent_changes?: Json | null
          security_considerations?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_ratings: {
        Row: {
          created_at: string
          id: string
          project_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_ratings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          changes_summary: string | null
          created_at: string
          html_code: string
          id: string
          performance_score: number | null
          project_id: string
          quality_score: number | null
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          created_at?: string
          html_code: string
          id?: string
          performance_score?: number | null
          project_id: string
          quality_score?: number | null
          version_number: number
        }
        Update: {
          changes_summary?: string | null
          created_at?: string
          html_code?: string
          id?: string
          performance_score?: number | null
          project_id?: string
          quality_score?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          forked_from: string | null
          html_code: string
          id: string
          is_favorite: boolean | null
          is_public: boolean | null
          prompt: string
          share_token: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          forked_from?: string | null
          html_code: string
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          prompt: string
          share_token?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
          views_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          forked_from?: string | null
          html_code?: string
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          prompt?: string
          share_token?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          average_satisfaction: number | null
          created_at: string | null
          created_by: string | null
          id: string
          improvements_made: Json | null
          is_active: boolean | null
          notes: string | null
          parent_version: string | null
          success_rate: number | null
          system_prompt: string
          total_uses: number | null
          traffic_percentage: number | null
          updated_at: string | null
          version: string
        }
        Insert: {
          average_satisfaction?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          improvements_made?: Json | null
          is_active?: boolean | null
          notes?: string | null
          parent_version?: string | null
          success_rate?: number | null
          system_prompt: string
          total_uses?: number | null
          traffic_percentage?: number | null
          updated_at?: string | null
          version: string
        }
        Update: {
          average_satisfaction?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          improvements_made?: Json | null
          is_active?: boolean | null
          notes?: string | null
          parent_version?: string | null
          success_rate?: number | null
          system_prompt?: string
          total_uses?: number | null
          traffic_percentage?: number | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      refactoring_suggestions: {
        Row: {
          applied_at: string | null
          complexity_after: number | null
          complexity_before: number | null
          component_name: string
          confidence_score: number
          created_at: string
          id: string
          original_code: string
          project_id: string | null
          reasoning: string
          status: string
          suggested_code: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          complexity_after?: number | null
          complexity_before?: number | null
          component_name: string
          confidence_score: number
          created_at?: string
          id?: string
          original_code: string
          project_id?: string | null
          reasoning: string
          status?: string
          suggested_code: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          complexity_after?: number | null
          complexity_before?: number | null
          component_name?: string
          confidence_score?: number
          created_at?: string
          id?: string
          original_code?: string
          project_id?: string | null
          reasoning?: string
          status?: string
          suggested_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refactoring_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
        }
        Relationships: []
      }
      system_improvements: {
        Row: {
          after_state: string
          applied_at: string | null
          before_state: string
          created_at: string
          created_by: string | null
          id: string
          improvement_type: string
          reason: string
          status: string | null
          success_metric: number | null
        }
        Insert: {
          after_state: string
          applied_at?: string | null
          before_state: string
          created_at?: string
          created_by?: string | null
          id?: string
          improvement_type: string
          reason: string
          status?: string | null
          success_metric?: number | null
        }
        Update: {
          after_state?: string
          applied_at?: string | null
          before_state?: string
          created_at?: string
          created_by?: string | null
          id?: string
          improvement_type?: string
          reason?: string
          status?: string | null
          success_metric?: number | null
        }
        Relationships: []
      }
      team_ai_sessions: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          is_active: boolean | null
          participants: Json | null
          session_name: string
          shared_context: Json | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          participants?: Json | null
          session_name: string
          shared_context?: Json | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          participants?: Json | null
          session_name?: string
          shared_context?: Json | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      team_learning_contributions: {
        Row: {
          contribution_type: string
          created_at: string
          id: string
          impact_score: number | null
          pattern_learned: string
          times_reused: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          contribution_type: string
          created_at?: string
          id?: string
          impact_score?: number | null
          pattern_learned: string
          times_reused?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          contribution_type?: string
          created_at?: string
          id?: string
          impact_score?: number | null
          pattern_learned?: string
          times_reused?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "team_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_members: number | null
          name: string
          owner_id: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_members?: number | null
          name: string
          owner_id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_members?: number | null
          name?: string
          owner_id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_purchases: {
        Row: {
          amount: number
          id: string
          purchased_at: string
          stripe_payment_id: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          purchased_at?: string
          stripe_payment_id?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          purchased_at?: string
          stripe_payment_id?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_purchases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "premium_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string
          created_at: string
          description: string
          html_code: string
          id: string
          is_featured: boolean | null
          preview_image: string | null
          prompt: string
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          html_code: string
          id?: string
          is_featured?: boolean | null
          preview_image?: string | null
          prompt: string
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          html_code?: string
          id?: string
          is_featured?: boolean | null
          preview_image?: string | null
          prompt?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      test_suites: {
        Row: {
          code_to_test: string
          coverage_estimate: number | null
          created_at: string
          description: string | null
          generated_tests: string
          id: string
          name: string
          project_id: string | null
          status: string
          test_framework: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code_to_test: string
          coverage_estimate?: number | null
          created_at?: string
          description?: string | null
          generated_tests: string
          id?: string
          name: string
          project_id?: string | null
          status?: string
          test_framework?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code_to_test?: string
          coverage_estimate?: number | null
          created_at?: string
          description?: string | null
          generated_tests?: string
          id?: string
          name?: string
          project_id?: string | null
          status?: string
          test_framework?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_suites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_error_patterns: {
        Row: {
          affected_technologies: Json | null
          common_triggers: Json | null
          confidence_score: number | null
          created_at: string
          diagnosis: Json
          error_category: string
          error_pattern: string
          error_signature: string
          error_subcategory: string | null
          failure_count: number
          fix_type: string
          id: string
          last_success_at: string | null
          last_used_at: string | null
          learned_at: string
          learned_from_project_id: string | null
          learned_from_user_id: string | null
          prevention_tips: Json | null
          related_errors: Json | null
          root_cause: string
          solution: Json
          success_count: number
          times_encountered: number | null
        }
        Insert: {
          affected_technologies?: Json | null
          common_triggers?: Json | null
          confidence_score?: number | null
          created_at?: string
          diagnosis: Json
          error_category: string
          error_pattern: string
          error_signature: string
          error_subcategory?: string | null
          failure_count?: number
          fix_type: string
          id?: string
          last_success_at?: string | null
          last_used_at?: string | null
          learned_at?: string
          learned_from_project_id?: string | null
          learned_from_user_id?: string | null
          prevention_tips?: Json | null
          related_errors?: Json | null
          root_cause: string
          solution: Json
          success_count?: number
          times_encountered?: number | null
        }
        Update: {
          affected_technologies?: Json | null
          common_triggers?: Json | null
          confidence_score?: number | null
          created_at?: string
          diagnosis?: Json
          error_category?: string
          error_pattern?: string
          error_signature?: string
          error_subcategory?: string | null
          failure_count?: number
          fix_type?: string
          id?: string
          last_success_at?: string | null
          last_used_at?: string | null
          learned_at?: string
          learned_from_project_id?: string | null
          learned_from_user_id?: string | null
          prevention_tips?: Json | null
          related_errors?: Json | null
          root_cause?: string
          solution?: Json
          success_count?: number
          times_encountered?: number | null
        }
        Relationships: []
      }
      user_coding_preferences: {
        Row: {
          avoid_patterns: Json | null
          code_style: Json | null
          comment_style: string | null
          created_at: string
          framework_preferences: Json | null
          id: string
          naming_convention: string | null
          preferred_patterns: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avoid_patterns?: Json | null
          code_style?: Json | null
          comment_style?: string | null
          created_at?: string
          framework_preferences?: Json | null
          id?: string
          naming_convention?: string | null
          preferred_patterns?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avoid_patterns?: Json | null
          code_style?: Json | null
          comment_style?: string | null
          created_at?: string
          framework_preferences?: Json | null
          id?: string
          naming_convention?: string | null
          preferred_patterns?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          learned_from_interactions: number | null
          preference_type: string
          preference_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          learned_from_interactions?: number | null
          preference_type: string
          preference_value?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          learned_from_interactions?: number | null
          preference_type?: string
          preference_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          current_file: string | null
          cursor_position: Json | null
          id: string
          last_seen_at: string
          metadata: Json | null
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          current_file?: string | null
          cursor_position?: Json | null
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          current_file?: string | null
          cursor_position?: Json | null
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "team_ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_activity_at: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vercel_connections: {
        Row: {
          access_token: string
          connected_at: string
          id: string
          last_used_at: string | null
          team_id: string | null
          team_name: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          id?: string
          last_used_at?: string | null
          team_id?: string | null
          team_name?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          id?: string
          last_used_at?: string | null
          team_id?: string | null
          team_name?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          current_step: number | null
          error_message: string | null
          execution_data: Json | null
          id: string
          results: Json | null
          started_at: string
          status: string
          total_steps: number
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          results?: Json | null
          started_at?: string
          status?: string
          total_steps: number
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          results?: Json | null
          started_at?: string
          status?: string
          total_steps?: number
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ai_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_uptime_percentage: {
        Args: { p_credential_id: string; p_hours?: number }
        Returns: number
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_error_rate: {
        Args: { time_window?: unknown }
        Returns: number
      }
      get_privacy_audit: {
        Args: Record<PropertyKey, never>
        Returns: {
          private_count: number
          public_count: number
          table_name: string
          total_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_ip_address?: string
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type: string
          p_severity?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      notify_admins: {
        Args: {
          notification_data?: Json
          notification_message: string
          notification_title: string
          notification_type: string
        }
        Returns: undefined
      }
      verify_user_privacy: {
        Args: { check_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      feedback_type:
        | "thumbs_up"
        | "thumbs_down"
        | "modified"
        | "accepted"
        | "rejected"
      generation_status: "success" | "partial_success" | "failure" | "error"
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
      app_role: ["admin", "user"],
      feedback_type: [
        "thumbs_up",
        "thumbs_down",
        "modified",
        "accepted",
        "rejected",
      ],
      generation_status: ["success", "partial_success", "failure", "error"],
    },
  },
} as const
