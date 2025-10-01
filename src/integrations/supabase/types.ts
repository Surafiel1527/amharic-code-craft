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
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
          rate_limit: number | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
          rate_limit?: number | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
          rate_limit?: number | null
          usage_count?: number | null
          user_id?: string
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
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          github: string | null
          id: string
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
          forked_from: string | null
          html_code: string
          id: string
          is_favorite: boolean | null
          is_public: boolean | null
          prompt: string
          share_token: string | null
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          created_at?: string
          forked_from?: string | null
          html_code: string
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          prompt: string
          share_token?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
          views_count?: number | null
        }
        Update: {
          created_at?: string
          forked_from?: string | null
          html_code?: string
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          prompt?: string
          share_token?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_error_rate: {
        Args: { time_window?: unknown }
        Returns: number
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
      notify_admins: {
        Args: {
          notification_data?: Json
          notification_message: string
          notification_title: string
          notification_type: string
        }
        Returns: undefined
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
