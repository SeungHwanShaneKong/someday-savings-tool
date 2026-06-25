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
      ai_conversations: {
        Row: {
          created_at: string | null
          feature: string
          id: string
          messages: Json
          metadata: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature: string
          id?: string
          messages?: Json
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature?: string
          id?: string
          messages?: Json
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badge_definitions: {
        // [CL-DBSWITCH-VERIFY-20260620] types.ts 수동 복원 — gamify_foundation 마이그레이션 반영(런타임 무영향, 타입 전용).
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number
          icon_emoji: string
          id: string
          is_active: boolean
          name_ko: string
          points_reward: number
          rarity: string
          slug: string
          unlock_rule: Json
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          display_order?: number
          icon_emoji: string
          id?: string
          is_active?: boolean
          name_ko: string
          points_reward?: number
          rarity: string
          slug: string
          unlock_rule: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          name_ko?: string
          points_reward?: number
          rarity?: string
          slug?: string
          unlock_rule?: Json
        }
        Relationships: []
      }
      budget_collaborators: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["collaborator_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["collaborator_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["collaborator_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_collaborators_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_insights: {
        Row: {
          budget_id: string
          created_at: string | null
          description: string
          id: string
          insight_type: string
          is_dismissed: boolean | null
          metadata: Json | null
          title: string
        }
        Insert: {
          budget_id: string
          created_at?: string | null
          description: string
          id?: string
          insight_type: string
          is_dismissed?: boolean | null
          metadata?: Json | null
          title: string
        }
        Update: {
          budget_id?: string
          created_at?: string | null
          description?: string
          id?: string
          insight_type?: string
          is_dismissed?: boolean | null
          metadata?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_insights_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_invitations: {
        Row: {
          budget_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          responded_at: string | null
          role: Database["public"]["Enums"]["collaborator_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["collaborator_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["collaborator_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_invitations_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          amount: number
          budget_id: string
          category: string
          cost_split: string | null
          created_at: string
          custom_name: string | null
          id: string
          is_custom: boolean | null
          is_paid: boolean
          notes: string | null
          quantity: number | null
          sub_category: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          budget_id: string
          category: string
          cost_split?: string | null
          created_at?: string
          custom_name?: string | null
          id?: string
          is_custom?: boolean | null
          is_paid?: boolean
          notes?: string | null
          quantity?: number | null
          sub_category: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          budget_id?: string
          category?: string
          cost_split?: string | null
          created_at?: string
          custom_name?: string | null
          id?: string
          is_custom?: boolean | null
          is_paid?: boolean
          notes?: string | null
          quantity?: number | null
          sub_category?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_snapshots: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          name: string
          snapshot_data: Json
          user_id: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          name?: string
          snapshot_data: Json
          user_id: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          name?: string
          snapshot_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_snapshots_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          id: string
          is_shared: boolean
          name: string
          updated_at: string
          user_id: string
          wedding_date: string | null
          wedding_time: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_shared?: boolean
          name?: string
          updated_at?: string
          user_id: string
          wedding_date?: string | null
          wedding_time?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_shared?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          wedding_date?: string | null
          wedding_time?: string | null
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          category_link: string | null
          created_at: string | null
          depends_on: string | null
          description: string | null
          id: string
          nudge_message: string | null
          period: string
          sort_order: number
          sub_category_link: string | null
          title: string
        }
        Insert: {
          category_link?: string | null
          created_at?: string | null
          depends_on?: string | null
          description?: string | null
          id?: string
          nudge_message?: string | null
          period: string
          sort_order: number
          sub_category_link?: string | null
          title: string
        }
        Update: {
          category_link?: string | null
          created_at?: string | null
          depends_on?: string | null
          description?: string | null
          id?: string
          nudge_message?: string | null
          period?: string
          sort_order?: number
          sub_category_link?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          records_processed: number | null
          source: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          source: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          source?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          page_path: string
          // [CL-ACQ-PAGEVIEWS-20260622-233012] 유입 소스(last-touch)
          referrer: string | null
          session_id: string
          user_id: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          page_path: string
          referrer?: string | null
          session_id: string
          user_id?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          page_path?: string
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          // [CL-ACQ-PROFILE-FT-20260622-233012] first-touch 유입 귀속(가입자별, 1회 기록)
          acquisition_at: string | null
          created_at: string
          display_name: string | null
          first_referrer: string | null
          first_source: string | null
          // [CL-DBSWITCH-VERIFY-20260620] gamify_foundation: profiles.gamification_state JSONB NOT NULL DEFAULT '{}'
          gamification_state: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acquisition_at?: string | null
          created_at?: string
          display_name?: string | null
          first_referrer?: string | null
          first_source?: string | null
          gamification_state?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acquisition_at?: string | null
          created_at?: string
          display_name?: string | null
          first_referrer?: string | null
          first_source?: string | null
          gamification_state?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_budgets: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          is_active: boolean
          share_token: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          share_token?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_budgets_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_checklist_items: {
        Row: {
          budget_id: string | null
          category_link: string | null
          completed_at: string | null
          created_at: string | null
          depends_on: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          is_custom: boolean | null
          notes: string | null
          period: string
          sort_order: number
          sub_category_link: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget_id?: string | null
          category_link?: string | null
          completed_at?: string | null
          created_at?: string | null
          depends_on?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          is_custom?: boolean | null
          notes?: string | null
          period: string
          sort_order?: number
          sub_category_link?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget_id?: string | null
          category_link?: string | null
          completed_at?: string | null
          created_at?: string | null
          depends_on?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          is_custom?: boolean | null
          notes?: string | null
          period?: string
          sort_order?: number
          sub_category_link?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_checklist_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_checklist_items_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "user_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_earned_badges: {
        // [CL-DBSWITCH-VERIFY-20260620] types.ts 수동 복원 — gamify_foundation 마이그레이션 반영(타입 전용).
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_earned_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_budget_invitation: { Args: { p_token: string }; Returns: Json }
      // [CL-ACQ-EMAIL-RPC-20260622-233012] 유입 집계(관리자) — 가입자별 first_source 인원
      admin_acquisition_breakdown: {
        Args: Record<string, never>
        Returns: { source: string; users: number }[]
      }
      // [CL-ACQ-VISIT-20260623-230113] 방문 기준 유입 집계(관리자) — 기간 내 page_views.utm_source
      admin_visit_source_breakdown: {
        Args: { p_start: string; p_end: string }
        Returns: { source: string; visits: number }[]
      }
      // [CL-PARTNER-1TO1-20260622-233012] 내 파트너(닉네임+이메일) / 파트너 해지 / 예산 자동공유
      get_my_partner: {
        Args: Record<string, never>
        Returns: { user_id: string; display_name: string; email: string }[]
      }
      release_partner: { Args: Record<string, never>; Returns: Json }
      share_budget_with_partner: { Args: { p_budget_id: string }; Returns: Json }
      get_budget_participants: {
        Args: { p_budget_id: string }
        Returns: {
          user_id: string
          role: string
          display_name: string
        }[]
      }
      // [CL-ACQ-EMAIL-RPC-20260622-233012] 파트너 이메일 포함 참여자(개선5)
      get_budget_participants_email: {
        Args: { p_budget_id: string }
        Returns: {
          user_id: string
          role: string
          display_name: string
          email: string
        }[]
      }
      get_budget_role: {
        Args: { p_budget_id: string; p_user_id?: string }
        Returns: string
      }
      get_shared_budget_items_by_token: {
        Args: { p_share_token: string }
        Returns: {
          amount: number
          budget_id: string
          budget_owner_id: string
          category: string
          cost_split: string
          custom_name: string
          is_custom: boolean
          is_paid: boolean
          notes: string
          quantity: number
          sub_category: string
          unit_price: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_budget_collaborator: {
        Args: { p_budget_id: string; p_user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      collaborator_role: "owner" | "editor" | "viewer"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
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
      collaborator_role: ["owner", "editor", "viewer"],
      invitation_status: ["pending", "accepted", "declined", "expired"],
    },
  },
} as const
