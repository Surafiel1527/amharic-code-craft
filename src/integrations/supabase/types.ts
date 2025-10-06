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
      admin_approval_queue: {
        Row: {
          approval_score: number | null
          auto_approved: boolean | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          metadata: Json | null
          priority: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          submitted_by: string
        }
        Insert: {
          approval_score?: number | null
          auto_approved?: boolean | null
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          metadata?: Json | null
          priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_by: string
        }
        Update: {
          approval_score?: number | null
          auto_approved?: boolean | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json | null
          priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_by?: string
        }
        Relationships: []
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
      ai_feedback_patterns: {
        Row: {
          avg_user_rating: number | null
          created_at: string
          id: string
          improved_prompt: string
          last_used_at: string | null
          learned_from_feedback_count: number | null
          metadata: Json | null
          original_prompt: string
          pattern_category: string
          success_rate: number | null
          times_used: number | null
        }
        Insert: {
          avg_user_rating?: number | null
          created_at?: string
          id?: string
          improved_prompt: string
          last_used_at?: string | null
          learned_from_feedback_count?: number | null
          metadata?: Json | null
          original_prompt: string
          pattern_category: string
          success_rate?: number | null
          times_used?: number | null
        }
        Update: {
          avg_user_rating?: number | null
          created_at?: string
          id?: string
          improved_prompt?: string
          last_used_at?: string | null
          learned_from_feedback_count?: number | null
          metadata?: Json | null
          original_prompt?: string
          pattern_category?: string
          success_rate?: number | null
          times_used?: number | null
        }
        Relationships: []
      }
      ai_generation_jobs: {
        Row: {
          completed_at: string | null
          completed_steps: number | null
          conversation_id: string | null
          created_at: string
          current_step: string | null
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          output_data: Json | null
          progress: number | null
          project_id: string | null
          retry_count: number | null
          started_at: string | null
          status: string
          total_steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number | null
          conversation_id?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type: string
          output_data?: Json | null
          progress?: number | null
          project_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          total_steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number | null
          conversation_id?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          output_data?: Json | null
          progress?: number | null
          project_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          total_steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_improvement_logs: {
        Row: {
          after_metric: number
          applied_at: string
          before_metric: number
          changes_made: Json
          confidence_score: number | null
          id: string
          improvement_percentage: number | null
          improvement_type: string
          validated_at: string | null
          validation_status: string | null
        }
        Insert: {
          after_metric: number
          applied_at?: string
          before_metric: number
          changes_made: Json
          confidence_score?: number | null
          id?: string
          improvement_percentage?: number | null
          improvement_type: string
          validated_at?: string | null
          validation_status?: string | null
        }
        Update: {
          after_metric?: number
          applied_at?: string
          before_metric?: number
          changes_made?: Json
          confidence_score?: number | null
          id?: string
          improvement_percentage?: number | null
          improvement_type?: string
          validated_at?: string | null
          validation_status?: string | null
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
      ai_package_suggestions: {
        Row: {
          accepted: boolean | null
          alternatives: Json | null
          created_at: string | null
          id: string
          maintenance_score: number | null
          overall_score: number | null
          popularity_score: number | null
          project_id: string | null
          reason: string
          security_score: number | null
          suggested_package: string
          use_case: string
          user_id: string | null
        }
        Insert: {
          accepted?: boolean | null
          alternatives?: Json | null
          created_at?: string | null
          id?: string
          maintenance_score?: number | null
          overall_score?: number | null
          popularity_score?: number | null
          project_id?: string | null
          reason: string
          security_score?: number | null
          suggested_package: string
          use_case: string
          user_id?: string | null
        }
        Update: {
          accepted?: boolean | null
          alternatives?: Json | null
          created_at?: string | null
          id?: string
          maintenance_score?: number | null
          overall_score?: number | null
          popularity_score?: number | null
          project_id?: string | null
          reason?: string
          security_score?: number | null
          suggested_package?: string
          use_case?: string
          user_id?: string | null
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
      alert_rules: {
        Row: {
          condition: string
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          metric_type: string
          notification_channels: Json | null
          rule_name: string
          threshold: number
          updated_at: string | null
        }
        Insert: {
          condition: string
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          metric_type: string
          notification_channels?: Json | null
          rule_name: string
          threshold: number
          updated_at?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          metric_type?: string
          notification_channels?: Json | null
          rule_name?: string
          threshold?: number
          updated_at?: string | null
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
      auto_fix_suggestions: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          confidence_score: number | null
          created_at: string | null
          fix_explanation: string
          fixed_code: string
          id: string
          issue_description: string
          issue_type: string
          original_code: string
          user_id: string
          validation_result_id: string | null
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          fix_explanation: string
          fixed_code: string
          id?: string
          issue_description: string
          issue_type: string
          original_code: string
          user_id: string
          validation_result_id?: string | null
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          fix_explanation?: string
          fixed_code?: string
          id?: string
          issue_description?: string
          issue_type?: string
          original_code?: string
          user_id?: string
          validation_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_fix_suggestions_validation_result_id_fkey"
            columns: ["validation_result_id"]
            isOneToOne: false
            referencedRelation: "validation_results"
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
      auto_snapshot_config: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          interval_minutes: number | null
          max_snapshots: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          interval_minutes?: number | null
          max_snapshots?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          interval_minutes?: number | null
          max_snapshots?: number | null
          user_id?: string
        }
        Relationships: []
      }
      build_quality_gates: {
        Row: {
          block_on_fail: boolean | null
          created_at: string | null
          enabled: boolean | null
          id: string
          max_critical_issues: number | null
          max_security_issues: number | null
          min_code_quality_score: number | null
          min_test_coverage: number | null
          project_id: string | null
          require_tests: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          block_on_fail?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_critical_issues?: number | null
          max_security_issues?: number | null
          min_code_quality_score?: number | null
          min_test_coverage?: number | null
          project_id?: string | null
          require_tests?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          block_on_fail?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_critical_issues?: number | null
          max_security_issues?: number | null
          min_code_quality_score?: number | null
          min_test_coverage?: number | null
          project_id?: string | null
          require_tests?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      code_analysis_cache: {
        Row: {
          analyzed_at: string | null
          bundle_size_kb: number | null
          cache_expires_at: string | null
          code_hash: string
          complexity_score: number | null
          eslint_results: Json | null
          id: string
          language: string
          performance_metrics: Json | null
          typescript_diagnostics: Json | null
        }
        Insert: {
          analyzed_at?: string | null
          bundle_size_kb?: number | null
          cache_expires_at?: string | null
          code_hash: string
          complexity_score?: number | null
          eslint_results?: Json | null
          id?: string
          language: string
          performance_metrics?: Json | null
          typescript_diagnostics?: Json | null
        }
        Update: {
          analyzed_at?: string | null
          bundle_size_kb?: number | null
          cache_expires_at?: string | null
          code_hash?: string
          complexity_score?: number | null
          eslint_results?: Json | null
          id?: string
          language?: string
          performance_metrics?: Json | null
          typescript_diagnostics?: Json | null
        }
        Relationships: []
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
      code_reviews: {
        Row: {
          code_length: number
          created_at: string
          filename: string
          grade: string
          id: string
          improvements_count: number
          language: string
          maintainability_score: number
          overall_score: number
          performance_score: number
          security_score: number
          user_id: string
        }
        Insert: {
          code_length: number
          created_at?: string
          filename: string
          grade: string
          id?: string
          improvements_count?: number
          language: string
          maintainability_score: number
          overall_score: number
          performance_score: number
          security_score: number
          user_id: string
        }
        Update: {
          code_length?: number
          created_at?: string
          filename?: string
          grade?: string
          id?: string
          improvements_count?: number
          language?: string
          maintainability_score?: number
          overall_score?: number
          performance_score?: number
          security_score?: number
          user_id?: string
        }
        Relationships: []
      }
      code_sync: {
        Row: {
          code_content: string
          collaboration_session_id: string
          cursor_position: number | null
          file_path: string
          id: string
          synced_at: string | null
          user_id: string
        }
        Insert: {
          code_content: string
          collaboration_session_id: string
          cursor_position?: number | null
          file_path?: string
          id?: string
          synced_at?: string | null
          user_id: string
        }
        Update: {
          code_content?: string
          collaboration_session_id?: string
          cursor_position?: number | null
          file_path?: string
          id?: string
          synced_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      complete_project_packages: {
        Row: {
          created_at: string | null
          dependencies_count: number | null
          id: string
          package_data: Json
          project_name: string
          status: string | null
          total_dependencies: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dependencies_count?: number | null
          id?: string
          package_data: Json
          project_name: string
          status?: string | null
          total_dependencies?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dependencies_count?: number | null
          id?: string
          package_data?: Json
          project_name?: string
          status?: string | null
          total_dependencies?: number | null
          user_id?: string
        }
        Relationships: []
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
      creator_analytics: {
        Row: {
          creator_id: string
          id: string
          metric_type: string
          metric_value: number
          plugin_id: string | null
          recorded_at: string
          time_period: string
        }
        Insert: {
          creator_id: string
          id?: string
          metric_type: string
          metric_value: number
          plugin_id?: string | null
          recorded_at?: string
          time_period: string
        }
        Update: {
          creator_id?: string
          id?: string
          metric_type?: string
          metric_value?: number
          plugin_id?: string | null
          recorded_at?: string
          time_period?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_analytics_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "ai_plugins"
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
      custom_domains: {
        Row: {
          created_at: string
          dns_records: Json | null
          domain_name: string
          id: string
          project_id: string | null
          ssl_status: string | null
          user_id: string
          vercel_config_id: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dns_records?: Json | null
          domain_name: string
          id?: string
          project_id?: string | null
          ssl_status?: string | null
          user_id: string
          vercel_config_id?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dns_records?: Json | null
          domain_name?: string
          id?: string
          project_id?: string | null
          ssl_status?: string | null
          user_id?: string
          vercel_config_id?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      debug_sessions: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          language: string
          severity: string
          solutions_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          language: string
          severity: string
          solutions_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          language?: string
          severity?: string
          solutions_count?: number
          user_id?: string
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
      dependency_conflicts: {
        Row: {
          ai_confidence: number | null
          conflict_reason: string
          conflicting_with: string
          created_at: string | null
          id: string
          package_name: string
          resolution_suggestion: string | null
          resolved: boolean | null
          resolved_at: string | null
          user_id: string | null
          version_requested: string
        }
        Insert: {
          ai_confidence?: number | null
          conflict_reason: string
          conflicting_with: string
          created_at?: string | null
          id?: string
          package_name: string
          resolution_suggestion?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          user_id?: string | null
          version_requested: string
        }
        Update: {
          ai_confidence?: number | null
          conflict_reason?: string
          conflicting_with?: string
          created_at?: string | null
          id?: string
          package_name?: string
          resolution_suggestion?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          user_id?: string | null
          version_requested?: string
        }
        Relationships: []
      }
      deployment_analytics: {
        Row: {
          deployment_id: string
          id: string
          measured_at: string
          metadata: Json | null
          metric_type: string
          metric_value: number
        }
        Insert: {
          deployment_id: string
          id?: string
          measured_at?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
        }
        Update: {
          deployment_id?: string
          id?: string
          measured_at?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deployment_analytics_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "vercel_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_builds: {
        Row: {
          build_step: string
          completed_at: string | null
          created_at: string
          deployment_id: string
          duration_ms: number | null
          id: string
          output_log: string | null
          status: string
        }
        Insert: {
          build_step: string
          completed_at?: string | null
          created_at?: string
          deployment_id: string
          duration_ms?: number | null
          id?: string
          output_log?: string | null
          status?: string
        }
        Update: {
          build_step?: string
          completed_at?: string | null
          created_at?: string
          deployment_id?: string
          duration_ms?: number | null
          id?: string
          output_log?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_builds_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "vercel_deployments"
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
      deployment_health_checks: {
        Row: {
          check_type: string
          checked_at: string
          deployment_id: string
          error_details: Json | null
          id: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          check_type: string
          checked_at?: string
          deployment_id: string
          error_details?: Json | null
          id?: string
          response_time_ms?: number | null
          status?: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          deployment_id?: string
          error_details?: Json | null
          id?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_health_checks_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "vercel_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_learnings: {
        Row: {
          conditions: Json | null
          confidence_score: number | null
          created_at: string
          id: string
          impact_score: number | null
          last_applied_at: string | null
          learned_from_deployments: number | null
          pattern_name: string
          pattern_type: string
          recommendation: string
          success_rate: number | null
          times_applied: number | null
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          impact_score?: number | null
          last_applied_at?: string | null
          learned_from_deployments?: number | null
          pattern_name: string
          pattern_type: string
          recommendation: string
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          impact_score?: number | null
          last_applied_at?: string | null
          learned_from_deployments?: number | null
          pattern_name?: string
          pattern_type?: string
          recommendation?: string
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deployment_rollbacks: {
        Row: {
          completed_at: string | null
          created_at: string
          from_deployment_id: string
          id: string
          metadata: Json | null
          reason: string
          rollback_status: string
          to_deployment_id: string | null
          triggered_by: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          from_deployment_id: string
          id?: string
          metadata?: Json | null
          reason: string
          rollback_status?: string
          to_deployment_id?: string | null
          triggered_by: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          from_deployment_id?: string
          id?: string
          metadata?: Json | null
          reason?: string
          rollback_status?: string
          to_deployment_id?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_rollbacks_from_deployment_id_fkey"
            columns: ["from_deployment_id"]
            isOneToOne: false
            referencedRelation: "vercel_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_rollbacks_to_deployment_id_fkey"
            columns: ["to_deployment_id"]
            isOneToOne: false
            referencedRelation: "vercel_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_validations: {
        Row: {
          auto_fixed: boolean | null
          completed_at: string | null
          created_at: string
          deployment_id: string
          id: string
          issues: Json | null
          recommendations: Json | null
          status: string
          validation_type: string
        }
        Insert: {
          auto_fixed?: boolean | null
          completed_at?: string | null
          created_at?: string
          deployment_id: string
          id?: string
          issues?: Json | null
          recommendations?: Json | null
          status?: string
          validation_type: string
        }
        Update: {
          auto_fixed?: boolean | null
          completed_at?: string | null
          created_at?: string
          deployment_id?: string
          id?: string
          issues?: Json | null
          recommendations?: Json | null
          status?: string
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_validations_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "vercel_deployments"
            referencedColumns: ["id"]
          },
        ]
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
      generated_tests: {
        Row: {
          coverage_percentage: number | null
          created_at: string | null
          execution_results: Json | null
          execution_status: string | null
          id: string
          source_code: string
          test_code: string
          test_framework: string
          test_type: string
          user_id: string
        }
        Insert: {
          coverage_percentage?: number | null
          created_at?: string | null
          execution_results?: Json | null
          execution_status?: string | null
          id?: string
          source_code: string
          test_code: string
          test_framework: string
          test_type: string
          user_id: string
        }
        Update: {
          coverage_percentage?: number | null
          created_at?: string | null
          execution_results?: Json | null
          execution_status?: string | null
          id?: string
          source_code?: string
          test_code?: string
          test_framework?: string
          test_type?: string
          user_id?: string
        }
        Relationships: []
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
      installed_packages: {
        Row: {
          auto_detected: boolean | null
          id: string
          installed_at: string | null
          metadata: Json | null
          package_name: string
          project_id: string | null
          user_id: string
          version: string
        }
        Insert: {
          auto_detected?: boolean | null
          id?: string
          installed_at?: string | null
          metadata?: Json | null
          package_name: string
          project_id?: string | null
          user_id: string
          version: string
        }
        Update: {
          auto_detected?: boolean | null
          id?: string
          installed_at?: string | null
          metadata?: Json | null
          package_name?: string
          project_id?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "installed_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      language_detections: {
        Row: {
          confidence: number
          created_at: string
          detected_language: string
          framework: string | null
          id: string
          recommended_runtime: string
          user_id: string
          user_request: string
        }
        Insert: {
          confidence: number
          created_at?: string
          detected_language: string
          framework?: string | null
          id?: string
          recommended_runtime: string
          user_id: string
          user_request: string
        }
        Update: {
          confidence?: number
          created_at?: string
          detected_language?: string
          framework?: string | null
          id?: string
          recommended_runtime?: string
          user_id?: string
          user_request?: string
        }
        Relationships: []
      }
      learned_patterns: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          last_used_at: string | null
          pattern_data: Json
          pattern_name: string
          pattern_type: string
          success_rate: number | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          pattern_data?: Json
          pattern_name: string
          pattern_type: string
          success_rate?: number | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          pattern_data?: Json
          pattern_name?: string
          pattern_type?: string
          success_rate?: number | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mega_mind_orchestrations: {
        Row: {
          analysis_phase: Json | null
          completed_at: string | null
          context: Json | null
          created_at: string | null
          dependencies_installed: Json | null
          dependency_phase: Json | null
          errors_fixed: Json | null
          files_generated: Json | null
          generation_phase: Json | null
          id: string
          original_request: string
          request_type: string
          started_at: string | null
          status: string | null
          user_id: string
          verification_phase: Json | null
        }
        Insert: {
          analysis_phase?: Json | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          dependencies_installed?: Json | null
          dependency_phase?: Json | null
          errors_fixed?: Json | null
          files_generated?: Json | null
          generation_phase?: Json | null
          id?: string
          original_request: string
          request_type: string
          started_at?: string | null
          status?: string | null
          user_id: string
          verification_phase?: Json | null
        }
        Update: {
          analysis_phase?: Json | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          dependencies_installed?: Json | null
          dependency_phase?: Json | null
          errors_fixed?: Json | null
          files_generated?: Json | null
          generation_phase?: Json | null
          id?: string
          original_request?: string
          request_type?: string
          started_at?: string | null
          status?: string | null
          user_id?: string
          verification_phase?: Json | null
        }
        Relationships: []
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
      multi_modal_generations: {
        Row: {
          created_at: string
          generation_time_ms: number
          has_code: boolean
          id: string
          images_generated: number
          included_code: boolean
          included_images: boolean
          prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_time_ms: number
          has_code?: boolean
          id?: string
          images_generated?: number
          included_code?: boolean
          included_images?: boolean
          prompt: string
          user_id: string
        }
        Update: {
          created_at?: string
          generation_time_ms?: number
          has_code?: boolean
          id?: string
          images_generated?: number
          included_code?: boolean
          included_images?: boolean
          prompt?: string
          user_id?: string
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
      optimization_suggestions: {
        Row: {
          applied_at: string | null
          auto_applied: boolean | null
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          severity: string
          suggested_fix: string
          suggestion_type: string
        }
        Insert: {
          applied_at?: string | null
          auto_applied?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          severity: string
          suggested_fix: string
          suggestion_type: string
        }
        Update: {
          applied_at?: string | null
          auto_applied?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          severity?: string
          suggested_fix?: string
          suggestion_type?: string
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
      package_automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          failure_count: number | null
          id: string
          is_active: boolean | null
          priority: number | null
          project_id: string | null
          rule_name: string
          rule_type: string
          success_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          project_id?: string | null
          rule_name: string
          rule_type: string
          success_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          project_id?: string | null
          rule_name?: string
          rule_type?: string
          success_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_automation_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      package_dependency_tree: {
        Row: {
          created_at: string | null
          dependencies: Json | null
          dev_dependencies: Json | null
          id: string
          package_name: string
          peer_dependencies: Json | null
          total_size_bytes: number | null
          updated_at: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          dependencies?: Json | null
          dev_dependencies?: Json | null
          id?: string
          package_name: string
          peer_dependencies?: Json | null
          total_size_bytes?: number | null
          updated_at?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          dependencies?: Json | null
          dev_dependencies?: Json | null
          id?: string
          package_name?: string
          peer_dependencies?: Json | null
          total_size_bytes?: number | null
          updated_at?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      package_install_logs: {
        Row: {
          action: string
          auto_detected: boolean | null
          created_at: string | null
          error_message: string | null
          id: string
          package_name: string
          success: boolean | null
          user_id: string
          version: string
        }
        Insert: {
          action: string
          auto_detected?: boolean | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          package_name: string
          success?: boolean | null
          user_id: string
          version: string
        }
        Update: {
          action?: string
          auto_detected?: boolean | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          package_name?: string
          success?: boolean | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      package_installations: {
        Row: {
          created_at: string
          errors: Json | null
          id: string
          installation_time_ms: number
          packages: Json
          success: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          id?: string
          installation_time_ms: number
          packages?: Json
          success?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          errors?: Json | null
          id?: string
          installation_time_ms?: number
          packages?: Json
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      package_monitors: {
        Row: {
          auto_fix_enabled: boolean | null
          check_interval_hours: number | null
          created_at: string
          findings_count: number | null
          id: string
          is_active: boolean | null
          last_check_at: string | null
          monitor_type: string
          next_check_at: string | null
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_fix_enabled?: boolean | null
          check_interval_hours?: number | null
          created_at?: string
          findings_count?: number | null
          id?: string
          is_active?: boolean | null
          last_check_at?: string | null
          monitor_type: string
          next_check_at?: string | null
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_fix_enabled?: boolean | null
          check_interval_hours?: number | null
          created_at?: string
          findings_count?: number | null
          id?: string
          is_active?: boolean | null
          last_check_at?: string | null
          monitor_type?: string
          next_check_at?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_monitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      package_operations: {
        Row: {
          changes_made: Json | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          from_version: string | null
          id: string
          operation_type: string
          package_name: string
          project_id: string | null
          rollback_data: Json | null
          started_at: string | null
          status: string
          to_version: string | null
          triggered_by: string
          user_id: string
        }
        Insert: {
          changes_made?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          from_version?: string | null
          id?: string
          operation_type: string
          package_name: string
          project_id?: string | null
          rollback_data?: Json | null
          started_at?: string | null
          status?: string
          to_version?: string | null
          triggered_by?: string
          user_id: string
        }
        Update: {
          changes_made?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          from_version?: string | null
          id?: string
          operation_type?: string
          package_name?: string
          project_id?: string | null
          rollback_data?: Json | null
          started_at?: string | null
          status?: string
          to_version?: string | null
          triggered_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_operations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      package_security_scans: {
        Row: {
          created_at: string | null
          critical_count: number | null
          high_count: number | null
          id: string
          low_count: number | null
          medium_count: number | null
          package_name: string
          scan_date: string | null
          scan_status: string | null
          user_id: string | null
          version: string
          vulnerabilities: Json | null
          vulnerability_count: number | null
        }
        Insert: {
          created_at?: string | null
          critical_count?: number | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          package_name: string
          scan_date?: string | null
          scan_status?: string | null
          user_id?: string | null
          version: string
          vulnerabilities?: Json | null
          vulnerability_count?: number | null
        }
        Update: {
          created_at?: string | null
          critical_count?: number | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          package_name?: string
          scan_date?: string | null
          scan_status?: string | null
          user_id?: string | null
          version?: string
          vulnerabilities?: Json | null
          vulnerability_count?: number | null
        }
        Relationships: []
      }
      package_updates: {
        Row: {
          auto_update_approved: boolean | null
          breaking_changes: boolean | null
          changelog: string | null
          created_at: string | null
          current_version: string
          id: string
          installed_at: string | null
          latest_version: string
          package_name: string
          update_type: string
          user_id: string | null
        }
        Insert: {
          auto_update_approved?: boolean | null
          breaking_changes?: boolean | null
          changelog?: string | null
          created_at?: string | null
          current_version: string
          id?: string
          installed_at?: string | null
          latest_version: string
          package_name: string
          update_type: string
          user_id?: string | null
        }
        Update: {
          auto_update_approved?: boolean | null
          breaking_changes?: boolean | null
          changelog?: string | null
          created_at?: string | null
          current_version?: string
          id?: string
          installed_at?: string | null
          latest_version?: string
          package_name?: string
          update_type?: string
          user_id?: string | null
        }
        Relationships: []
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
      pattern_recognition_cache: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          occurrence_count: number | null
          pattern_signature: string
          pattern_type: string
          recommended_action: Json | null
          success_rate: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          occurrence_count?: number | null
          pattern_signature: string
          pattern_type: string
          recommended_action?: Json | null
          success_rate?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          occurrence_count?: number | null
          pattern_signature?: string
          pattern_type?: string
          recommended_action?: Json | null
          success_rate?: number | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_creator: number
          amount_platform: number
          amount_total: number
          buyer_id: string
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          payment_status: string
          plugin_id: string | null
          receipt_url: string | null
          seller_id: string
          stripe_customer_id: string | null
          stripe_payment_id: string
          updated_at: string
        }
        Insert: {
          amount_creator: number
          amount_platform: number
          amount_total: number
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          payment_status: string
          plugin_id?: string | null
          receipt_url?: string | null
          seller_id: string
          stripe_customer_id?: string | null
          stripe_payment_id: string
          updated_at?: string
        }
        Update: {
          amount_creator?: number
          amount_platform?: number
          amount_total?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          plugin_id?: string | null
          receipt_url?: string | null
          seller_id?: string
          stripe_customer_id?: string | null
          stripe_payment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "ai_plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_cache: {
        Row: {
          cache_key: string
          cache_value: Json
          created_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          last_accessed_at: string | null
          ttl_seconds: number
        }
        Insert: {
          cache_key: string
          cache_value: Json
          created_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          ttl_seconds?: number
        }
        Update: {
          cache_key?: string
          cache_value?: Json
          created_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          ttl_seconds?: number
        }
        Relationships: []
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
      plugin_security_scans: {
        Row: {
          created_at: string
          id: string
          plugin_id: string
          recommendations: Json | null
          scan_status: string
          scan_type: string
          scanned_at: string | null
          security_score: number | null
          severity_level: string | null
          vulnerabilities_found: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          plugin_id: string
          recommendations?: Json | null
          scan_status?: string
          scan_type: string
          scanned_at?: string | null
          security_score?: number | null
          severity_level?: string | null
          vulnerabilities_found?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          plugin_id?: string
          recommendations?: Json | null
          scan_status?: string
          scan_type?: string
          scanned_at?: string | null
          security_score?: number | null
          severity_level?: string | null
          vulnerabilities_found?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "plugin_security_scans_plugin_id_fkey"
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
      proactive_insights: {
        Row: {
          acted_upon: boolean | null
          based_on: Json | null
          created_at: string | null
          id: string
          insight_type: string
          priority: string | null
          suggestions: Json
          user_id: string
        }
        Insert: {
          acted_upon?: boolean | null
          based_on?: Json | null
          created_at?: string | null
          id?: string
          insight_type: string
          priority?: string | null
          suggestions?: Json
          user_id: string
        }
        Update: {
          acted_upon?: boolean | null
          based_on?: Json | null
          created_at?: string | null
          id?: string
          insight_type?: string
          priority?: string | null
          suggestions?: Json
          user_id?: string
        }
        Relationships: []
      }
      production_metrics: {
        Row: {
          endpoint: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          recorded_at: string | null
          user_id: string | null
        }
        Insert: {
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          recorded_at?: string | null
          user_id?: string | null
        }
        Update: {
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          recorded_at?: string | null
          user_id?: string | null
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
      python_executions: {
        Row: {
          code_length: number
          created_at: string
          execution_time_ms: number
          exit_code: number
          has_error: boolean
          id: string
          packages_installed: number
          success: boolean
          user_id: string
        }
        Insert: {
          code_length: number
          created_at?: string
          execution_time_ms: number
          exit_code: number
          has_error?: boolean
          id?: string
          packages_installed?: number
          success?: boolean
          user_id: string
        }
        Update: {
          code_length?: number
          created_at?: string
          execution_time_ms?: number
          exit_code?: number
          has_error?: boolean
          id?: string
          packages_installed?: number
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      python_projects: {
        Row: {
          created_at: string
          dependencies_count: number
          files_count: number
          id: string
          project_name: string
          project_type: string
          user_id: string
          user_request: string
        }
        Insert: {
          created_at?: string
          dependencies_count?: number
          files_count?: number
          id?: string
          project_name: string
          project_type: string
          user_id: string
          user_request: string
        }
        Update: {
          created_at?: string
          dependencies_count?: number
          files_count?: number
          id?: string
          project_name?: string
          project_type?: string
          user_id?: string
          user_request?: string
        }
        Relationships: []
      }
      quality_metrics: {
        Row: {
          id: string
          metric_data: Json | null
          metric_type: string
          metric_value: number
          project_id: string | null
          recorded_at: string
          threshold_met: boolean | null
          trend: string | null
          user_id: string
        }
        Insert: {
          id?: string
          metric_data?: Json | null
          metric_type: string
          metric_value: number
          project_id?: string | null
          recorded_at?: string
          threshold_met?: boolean | null
          trend?: string | null
          user_id: string
        }
        Update: {
          id?: string
          metric_data?: Json | null
          metric_type?: string
          metric_value?: number
          project_id?: string | null
          recorded_at?: string
          threshold_met?: boolean | null
          trend?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      security_scans: {
        Row: {
          code_length: number
          created_at: string
          dependencies_count: number
          framework: string
          id: string
          language: string
          overall_risk: string
          risk_score: number
          user_id: string
          vulnerabilities_count: number
        }
        Insert: {
          code_length: number
          created_at?: string
          dependencies_count?: number
          framework: string
          id?: string
          language: string
          overall_risk: string
          risk_score: number
          user_id: string
          vulnerabilities_count?: number
        }
        Update: {
          code_length?: number
          created_at?: string
          dependencies_count?: number
          framework?: string
          id?: string
          language?: string
          overall_risk?: string
          risk_score?: number
          user_id?: string
          vulnerabilities_count?: number
        }
        Relationships: []
      }
      security_vulnerabilities: {
        Row: {
          affected_component: string
          cve_id: string | null
          description: string
          detected_at: string | null
          id: string
          metadata: Json | null
          remediation: string | null
          resolved_at: string | null
          severity: string
          status: string | null
          vulnerability_type: string
        }
        Insert: {
          affected_component: string
          cve_id?: string | null
          description: string
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          remediation?: string | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          vulnerability_type: string
        }
        Update: {
          affected_component?: string
          cve_id?: string | null
          description?: string
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          remediation?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          vulnerability_type?: string
        }
        Relationships: []
      }
      smart_dependency_tracking: {
        Row: {
          alternative_packages: Json | null
          conflicts_with: Json | null
          created_at: string | null
          detected_from: string
          detection_context: Json | null
          id: string
          install_location: string | null
          installation_command: string | null
          installation_result: Json | null
          installed_at: string | null
          orchestration_id: string | null
          package_name: string
          peer_dependencies: Json | null
          should_install: boolean | null
          status: string | null
          version: string | null
        }
        Insert: {
          alternative_packages?: Json | null
          conflicts_with?: Json | null
          created_at?: string | null
          detected_from: string
          detection_context?: Json | null
          id?: string
          install_location?: string | null
          installation_command?: string | null
          installation_result?: Json | null
          installed_at?: string | null
          orchestration_id?: string | null
          package_name: string
          peer_dependencies?: Json | null
          should_install?: boolean | null
          status?: string | null
          version?: string | null
        }
        Update: {
          alternative_packages?: Json | null
          conflicts_with?: Json | null
          created_at?: string | null
          detected_from?: string
          detection_context?: Json | null
          id?: string
          install_location?: string | null
          installation_command?: string | null
          installation_result?: Json | null
          installed_at?: string | null
          orchestration_id?: string | null
          package_name?: string
          peer_dependencies?: Json | null
          should_install?: boolean | null
          status?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_dependency_tracking_orchestration_id_fkey"
            columns: ["orchestration_id"]
            isOneToOne: false
            referencedRelation: "mega_mind_orchestrations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_rule_id: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          alert_rule_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          alert_rule_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
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
      terminal_history: {
        Row: {
          command: string
          created_at: string | null
          execution_time_ms: number | null
          exit_code: number | null
          id: string
          output: string
          user_id: string
          working_directory: string | null
        }
        Insert: {
          command: string
          created_at?: string | null
          execution_time_ms?: number | null
          exit_code?: number | null
          id?: string
          output: string
          user_id: string
          working_directory?: string | null
        }
        Update: {
          command?: string
          created_at?: string | null
          execution_time_ms?: number | null
          exit_code?: number | null
          id?: string
          output?: string
          user_id?: string
          working_directory?: string | null
        }
        Relationships: []
      }
      terminal_sessions: {
        Row: {
          collaboration_session_id: string
          command: string
          completed_at: string | null
          executed_at: string | null
          exit_code: number | null
          id: string
          output: string | null
          status: string
          user_id: string
        }
        Insert: {
          collaboration_session_id: string
          command: string
          completed_at?: string | null
          executed_at?: string | null
          exit_code?: number | null
          id?: string
          output?: string | null
          status?: string
          user_id: string
        }
        Update: {
          collaboration_session_id?: string
          command?: string
          completed_at?: string | null
          executed_at?: string | null
          exit_code?: number | null
          id?: string
          output?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      test_auto_fixes: {
        Row: {
          ai_confidence: number | null
          applied_at: string | null
          created_at: string
          failure_reason: string
          fix_strategy: string
          fixed_test_code: string
          id: string
          original_test_code: string
          reverted_at: string | null
          status: string | null
          test_case_id: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          ai_confidence?: number | null
          applied_at?: string | null
          created_at?: string
          failure_reason: string
          fix_strategy: string
          fixed_test_code: string
          id?: string
          original_test_code: string
          reverted_at?: string | null
          status?: string | null
          test_case_id?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          ai_confidence?: number | null
          applied_at?: string | null
          created_at?: string
          failure_reason?: string
          fix_strategy?: string
          fixed_test_code?: string
          id?: string
          original_test_code?: string
          reverted_at?: string | null
          status?: string | null
          test_case_id?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_auto_fixes_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          ai_generated: boolean | null
          assertions_count: number | null
          auto_fix_attempts: number | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          error_stack: string | null
          execution_time_ms: number | null
          id: string
          last_run_at: string | null
          status: string | null
          suite_id: string | null
          test_code: string
          test_file_path: string
          test_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          assertions_count?: number | null
          auto_fix_attempts?: number | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          error_stack?: string | null
          execution_time_ms?: number | null
          id?: string
          last_run_at?: string | null
          status?: string | null
          suite_id?: string | null
          test_code: string
          test_file_path: string
          test_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          assertions_count?: number | null
          auto_fix_attempts?: number | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          error_stack?: string | null
          execution_time_ms?: number | null
          id?: string
          last_run_at?: string | null
          status?: string | null
          suite_id?: string | null
          test_code?: string
          test_file_path?: string
          test_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_generation_requests: {
        Row: {
          ai_model: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_path: string
          generated_tests: Json | null
          generation_time_ms: number | null
          id: string
          project_id: string | null
          source_code: string
          status: string | null
          test_type: string
          tests_count: number | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path: string
          generated_tests?: Json | null
          generation_time_ms?: number | null
          id?: string
          project_id?: string | null
          source_code: string
          status?: string | null
          test_type: string
          tests_count?: number | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string
          generated_tests?: Json | null
          generation_time_ms?: number | null
          id?: string
          project_id?: string | null
          source_code?: string
          status?: string | null
          test_type?: string
          tests_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_generation_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_learning_patterns: {
        Row: {
          confidence_score: number | null
          contexts: Json | null
          created_at: string
          id: string
          last_used_at: string | null
          learned_from_tests: number | null
          pattern_code: string
          pattern_name: string
          pattern_type: string
          success_rate: number | null
          usage_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          contexts?: Json | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          learned_from_tests?: number | null
          pattern_code: string
          pattern_name: string
          pattern_type: string
          success_rate?: number | null
          usage_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          contexts?: Json | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          learned_from_tests?: number | null
          pattern_code?: string
          pattern_name?: string
          pattern_type?: string
          success_rate?: number | null
          usage_count?: number | null
        }
        Relationships: []
      }
      test_results: {
        Row: {
          commit_hash: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          ran_at: string | null
          stack_trace: string | null
          status: string
          test_name: string
          test_suite: string
        }
        Insert: {
          commit_hash?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          ran_at?: string | null
          stack_trace?: string | null
          status: string
          test_name: string
          test_suite: string
        }
        Update: {
          commit_hash?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          ran_at?: string | null
          stack_trace?: string | null
          status?: string
          test_name?: string
          test_suite?: string
        }
        Relationships: []
      }
      test_runs: {
        Row: {
          completed_at: string | null
          coverage_data: Json | null
          created_at: string
          duration_ms: number | null
          failed_tests: number | null
          id: string
          passed_tests: number | null
          project_id: string | null
          run_type: string | null
          skipped_tests: number | null
          started_at: string | null
          status: string | null
          suite_id: string | null
          total_tests: number | null
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          coverage_data?: Json | null
          created_at?: string
          duration_ms?: number | null
          failed_tests?: number | null
          id?: string
          passed_tests?: number | null
          project_id?: string | null
          run_type?: string | null
          skipped_tests?: number | null
          started_at?: string | null
          status?: string | null
          suite_id?: string | null
          total_tests?: number | null
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          coverage_data?: Json | null
          created_at?: string
          duration_ms?: number | null
          failed_tests?: number | null
          id?: string
          passed_tests?: number | null
          project_id?: string | null
          run_type?: string | null
          skipped_tests?: number | null
          started_at?: string | null
          status?: string | null
          suite_id?: string | null
          total_tests?: number | null
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
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
          deployment_provider: string | null
          diagnosis: Json
          environment: string | null
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
          deployment_provider?: string | null
          diagnosis: Json
          environment?: string | null
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
          deployment_provider?: string | null
          diagnosis?: Json
          environment?: string | null
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
      validation_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          failure_count: number | null
          fix_strategy: Json
          id: string
          issue_signature: string
          language: string
          last_used_at: string | null
          pattern_type: string
          success_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          failure_count?: number | null
          fix_strategy: Json
          id?: string
          issue_signature: string
          language: string
          last_used_at?: string | null
          pattern_type: string
          success_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          failure_count?: number | null
          fix_strategy?: Json
          id?: string
          issue_signature?: string
          language?: string
          last_used_at?: string | null
          pattern_type?: string
          success_count?: number | null
        }
        Relationships: []
      }
      validation_results: {
        Row: {
          auto_fixed: boolean | null
          code_hash: string
          created_at: string | null
          fix_applied: Json | null
          id: string
          issues: Json | null
          language: string
          score: number
          status: string
          user_id: string
          validation_type: string
        }
        Insert: {
          auto_fixed?: boolean | null
          code_hash: string
          created_at?: string | null
          fix_applied?: Json | null
          id?: string
          issues?: Json | null
          language: string
          score: number
          status: string
          user_id: string
          validation_type: string
        }
        Update: {
          auto_fixed?: boolean | null
          code_hash?: string
          created_at?: string | null
          fix_applied?: Json | null
          id?: string
          issues?: Json | null
          language?: string
          score?: number
          status?: string
          user_id?: string
          validation_type?: string
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
      vercel_deployments: {
        Row: {
          build_command: string | null
          build_logs: Json | null
          completed_at: string | null
          created_at: string
          custom_domain: string | null
          deployment_url: string | null
          env_variables: Json | null
          error_message: string | null
          framework: string | null
          id: string
          last_checked_at: string | null
          project_id: string | null
          started_at: string | null
          status: string
          user_id: string
          vercel_deployment_id: string | null
          vercel_project_id: string | null
        }
        Insert: {
          build_command?: string | null
          build_logs?: Json | null
          completed_at?: string | null
          created_at?: string
          custom_domain?: string | null
          deployment_url?: string | null
          env_variables?: Json | null
          error_message?: string | null
          framework?: string | null
          id?: string
          last_checked_at?: string | null
          project_id?: string | null
          started_at?: string | null
          status?: string
          user_id: string
          vercel_deployment_id?: string | null
          vercel_project_id?: string | null
        }
        Update: {
          build_command?: string | null
          build_logs?: Json | null
          completed_at?: string | null
          created_at?: string
          custom_domain?: string | null
          deployment_url?: string | null
          env_variables?: Json | null
          error_message?: string | null
          framework?: string | null
          id?: string
          last_checked_at?: string | null
          project_id?: string | null
          started_at?: string | null
          status?: string
          user_id?: string
          vercel_deployment_id?: string | null
          vercel_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vercel_deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_code_generations: {
        Row: {
          analysis: Json
          created_at: string
          framework: string
          generated_code: Json
          has_image: boolean
          id: string
          styling: string
          user_id: string
        }
        Insert: {
          analysis?: Json
          created_at?: string
          framework: string
          generated_code?: Json
          has_image?: boolean
          id?: string
          styling: string
          user_id: string
        }
        Update: {
          analysis?: Json
          created_at?: string
          framework?: string
          generated_code?: Json
          has_image?: boolean
          id?: string
          styling?: string
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
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      get_package_stats: {
        Args: { p_user_id?: string }
        Returns: {
          auto_detected_packages: number
          manual_packages: number
          most_installed: string[]
          total_installs: number
          total_packages: number
          total_uninstalls: number
        }[]
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
      record_deployment_metric: {
        Args: {
          p_deployment_id: string
          p_metadata?: Json
          p_metric_type: string
          p_metric_value: number
        }
        Returns: string
      }
      trigger_auto_rollback: {
        Args: {
          p_from_deployment_id: string
          p_reason: string
          p_triggered_by?: string
        }
        Returns: string
      }
      update_deployment_status: {
        Args: {
          p_deployment_id: string
          p_error_message?: string
          p_status: string
        }
        Returns: undefined
      }
      upsert_deployment_learning: {
        Args: {
          p_conditions?: Json
          p_pattern_name: string
          p_pattern_type: string
          p_recommendation: string
        }
        Returns: string
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
