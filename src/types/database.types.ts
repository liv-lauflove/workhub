export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          actor_id: string;
          created_at: string;
          field_name: string;
          id: string;
          new_value: string | null;
          old_value: string | null;
          task_id: string;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          field_name: string;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
          task_id: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          field_name?: string;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_log_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_query_cache: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          query_hash: string;
          query_text: string;
          response_text: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          query_hash: string;
          query_text: string;
          response_text: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          query_hash?: string;
          query_text?: string;
          response_text?: string;
        };
        Relationships: [];
      };
      ai_suggestion_overrides: {
        Row: {
          created_at: string;
          final_duration_hours: number | null;
          final_priority: string | null;
          id: string;
          overridden_by: string | null;
          suggested_duration_hours: number | null;
          suggested_priority: string | null;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          final_duration_hours?: number | null;
          final_priority?: string | null;
          id?: string;
          overridden_by?: string | null;
          suggested_duration_hours?: number | null;
          suggested_priority?: string | null;
          task_id: string;
        };
        Update: {
          created_at?: string;
          final_duration_hours?: number | null;
          final_priority?: string | null;
          id?: string;
          overridden_by?: string | null;
          suggested_duration_hours?: number | null;
          suggested_priority?: string | null;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_suggestion_overrides_final_priority_fkey';
            columns: ['final_priority'];
            isOneToOne: false;
            referencedRelation: 'priority_levels';
            referencedColumns: ['level'];
          },
          {
            foreignKeyName: 'ai_suggestion_overrides_overridden_by_fkey';
            columns: ['overridden_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_suggestion_overrides_suggested_priority_fkey';
            columns: ['suggested_priority'];
            isOneToOne: false;
            referencedRelation: 'priority_levels';
            referencedColumns: ['level'];
          },
          {
            foreignKeyName: 'ai_suggestion_overrides_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_warnings: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          quarter: string;
          team_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          quarter: string;
          team_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          quarter?: string;
          team_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_warnings_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_warnings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      board_columns: {
        Row: {
          id: string;
          is_default: boolean;
          name: string;
          position: number;
          project_id: string;
        };
        Insert: {
          id?: string;
          is_default?: boolean;
          name: string;
          position: number;
          project_id: string;
        };
        Update: {
          id?: string;
          is_default?: boolean;
          name?: string;
          position?: number;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'board_columns_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      capacity_settings: {
        Row: {
          baseline_points: number;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          baseline_points?: number;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          baseline_points?: number;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'capacity_settings_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: true;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      github_commits: {
        Row: {
          author_username: string | null;
          commit_message: string | null;
          commit_sha: string;
          committed_at: string | null;
          id: string;
          task_id: string;
          url: string | null;
        };
        Insert: {
          author_username?: string | null;
          commit_message?: string | null;
          commit_sha: string;
          committed_at?: string | null;
          id?: string;
          task_id: string;
          url?: string | null;
        };
        Update: {
          author_username?: string | null;
          commit_message?: string | null;
          commit_sha?: string;
          committed_at?: string | null;
          id?: string;
          task_id?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'github_commits_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      github_integrations: {
        Row: {
          access_token: string;
          connected_at: string;
          github_user_id: string;
          id: string;
          scope: string | null;
          user_id: string;
        };
        Insert: {
          access_token: string;
          connected_at?: string;
          github_user_id: string;
          id?: string;
          scope?: string | null;
          user_id: string;
        };
        Update: {
          access_token?: string;
          connected_at?: string;
          github_user_id?: string;
          id?: string;
          scope?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'github_integrations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      milestones: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          pic_id: string | null;
          start_date: string;
          status: Database['public']['Enums']['milestone_status'];
          target_date: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          pic_id?: string | null;
          start_date: string;
          status?: Database['public']['Enums']['milestone_status'];
          target_date: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          pic_id?: string | null;
          start_date?: string;
          status?: Database['public']['Enums']['milestone_status'];
          target_date?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'milestones_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'milestones_pic_id_fkey';
            columns: ['pic_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          related_task_id: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          related_task_id?: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          related_task_id?: string | null;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_related_task_id_fkey';
            columns: ['related_task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      priority_levels: {
        Row: {
          level: string;
          sort_order: number;
          weight: number;
        };
        Insert: {
          level: string;
          sort_order: number;
          weight: number;
        };
        Update: {
          level?: string;
          sort_order?: number;
          weight?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          github_username: string | null;
          id: string;
          role: Database['public']['Enums']['user_role'];
          team_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          github_username?: string | null;
          id: string;
          role?: Database['public']['Enums']['user_role'];
          team_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          github_username?: string | null;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          milestone_id: string;
          name: string;
          pic_id: string | null;
          status: Database['public']['Enums']['project_status'];
          team_id: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          milestone_id: string;
          name: string;
          pic_id?: string | null;
          status?: Database['public']['Enums']['project_status'];
          team_id: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          milestone_id?: string;
          name?: string;
          pic_id?: string | null;
          status?: Database['public']['Enums']['project_status'];
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_pic_id_fkey';
            columns: ['pic_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      task_attachments: {
        Row: {
          created_at: string;
          file_name: string;
          file_size: number | null;
          file_type: string | null;
          file_url: string;
          id: string;
          task_id: string;
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_size?: number | null;
          file_type?: string | null;
          file_url: string;
          id?: string;
          task_id: string;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_size?: number | null;
          file_type?: string | null;
          file_url?: string;
          id?: string;
          task_id?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_attachments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_attachments_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_comments: {
        Row: {
          author_id: string;
          content: string;
          created_at: string;
          id: string;
          task_id: string;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string;
          id?: string;
          task_id: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_comments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_dependencies: {
        Row: {
          created_at: string;
          depends_on_task_id: string;
          id: string;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          depends_on_task_id: string;
          id?: string;
          task_id: string;
        };
        Update: {
          created_at?: string;
          depends_on_task_id?: string;
          id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_dependencies_depends_on_task_id_fkey';
            columns: ['depends_on_task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_dependencies_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assignee_id: string | null;
          column_id: string;
          created_at: string;
          created_by: string;
          description: string | null;
          due_date: string | null;
          github_branch: string | null;
          id: string;
          origin: Database['public']['Enums']['task_origin'];
          origin_note: string | null;
          priority: string;
          project_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          assignee_id?: string | null;
          column_id: string;
          created_at?: string;
          created_by: string;
          description?: string | null;
          due_date?: string | null;
          github_branch?: string | null;
          id?: string;
          origin?: Database['public']['Enums']['task_origin'];
          origin_note?: string | null;
          priority?: string;
          project_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          column_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          due_date?: string | null;
          github_branch?: string | null;
          id?: string;
          origin?: Database['public']['Enums']['task_origin'];
          origin_note?: string | null;
          priority?: string;
          project_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_column_id_fkey';
            columns: ['column_id'];
            isOneToOne: false;
            referencedRelation: 'board_columns';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_priority_fkey';
            columns: ['priority'];
            isOneToOne: false;
            referencedRelation: 'priority_levels';
            referencedColumns: ['level'];
          },
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      team_invitations: {
        Row: {
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          role: Database['public']['Enums']['user_role'];
          status: Database['public']['Enums']['invitation_status'];
          team_id: string;
          token: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['invitation_status'];
          team_id: string;
          token: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['invitation_status'];
          team_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_invitations_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      invitation_status: 'pending' | 'accepted' | 'expired' | 'revoked';
      milestone_status: 'planned' | 'in_progress' | 'completed' | 'at_risk';
      notification_type:
        | 'task_assigned'
        | 'task_mentioned'
        | 'task_status_changed'
        | 'member_overload';
      project_status: 'planned' | 'in_progress' | 'completed' | 'blocked';
      task_origin: 'normal' | 'cs_complaint';
      user_role: 'leader' | 'member';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      invitation_status: ['pending', 'accepted', 'expired', 'revoked'],
      milestone_status: ['planned', 'in_progress', 'completed', 'at_risk'],
      notification_type: [
        'task_assigned',
        'task_mentioned',
        'task_status_changed',
        'member_overload',
      ],
      project_status: ['planned', 'in_progress', 'completed', 'blocked'],
      task_origin: ['normal', 'cs_complaint'],
      user_role: ['leader', 'member'],
    },
  },
} as const;
