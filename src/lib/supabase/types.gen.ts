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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          accepted_at: string | null
          article_type: Database["public"]["Enums"]["article_type"]
          comment_count: number
          discipline_id: number | null
          doi: string | null
          featured: boolean
          final_pdf_path: string | null
          first_page: number | null
          has_datasets: boolean
          has_figures: boolean
          has_images: boolean
          has_video: boolean
          id: string
          issue_id: number | null
          last_page: number | null
          licence: string
          like_count: number
          paper_no: number
          published_at: string
          received_at: string | null
          search: unknown
          slug: string
          submission_id: string
          updated_at: string
          version_id: string
          withdrawal_note: string | null
          withdrawn_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          article_type: Database["public"]["Enums"]["article_type"]
          comment_count?: number
          discipline_id?: number | null
          doi?: string | null
          featured?: boolean
          final_pdf_path?: string | null
          first_page?: number | null
          has_datasets?: boolean
          has_figures?: boolean
          has_images?: boolean
          has_video?: boolean
          id?: string
          issue_id?: number | null
          last_page?: number | null
          licence?: string
          like_count?: number
          paper_no: number
          published_at?: string
          received_at?: string | null
          search?: unknown
          slug: string
          submission_id: string
          updated_at?: string
          version_id: string
          withdrawal_note?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          article_type?: Database["public"]["Enums"]["article_type"]
          comment_count?: number
          discipline_id?: number | null
          doi?: string | null
          featured?: boolean
          final_pdf_path?: string | null
          first_page?: number | null
          has_datasets?: boolean
          has_figures?: boolean
          has_images?: boolean
          has_video?: boolean
          id?: string
          issue_id?: number | null
          last_page?: number | null
          licence?: string
          like_count?: number
          paper_no?: number
          published_at?: string
          received_at?: string | null
          search?: unknown
          slug?: string
          submission_id?: string
          updated_at?: string
          version_id?: string
          withdrawal_note?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          data: Json | null
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          data?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          data?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      change_requests: {
        Row: {
          article_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          proposed_changes: string | null
          reason: string
          requester_id: string
          resulting_version_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["change_request_type"]
        }
        Insert: {
          article_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          proposed_changes?: string | null
          reason: string
          requester_id?: string
          resulting_version_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["change_request_type"]
        }
        Update: {
          article_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          proposed_changes?: string | null
          reason?: string
          requester_id?: string
          resulting_version_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["change_request_type"]
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_resulting_version_id_fkey"
            columns: ["resulting_version_id"]
            isOneToOne: false
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          article_id: string
          author_id: string
          body: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          parent_id: string | null
          status: Database["public"]["Enums"]["comment_status"]
        }
        Insert: {
          article_id: string
          author_id?: string
          body: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          parent_id?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
        }
        Update: {
          article_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          parent_id?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplines: {
        Row: {
          active: boolean
          created_at: string
          id: number
          name: string
          slug: string
          sort: number
          tone: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: never
          name: string
          slug: string
          sort?: number
          tone?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: never
          name?: string
          slug?: string
          sort?: number
          tone?: string
        }
        Relationships: []
      }
      editorial_decisions: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["decision_type"]
          editor_id: string | null
          id: string
          note_to_author: string | null
          submission_id: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          decision: Database["public"]["Enums"]["decision_type"]
          editor_id?: string | null
          id?: string
          note_to_author?: string | null
          submission_id: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["decision_type"]
          editor_id?: string | null
          id?: string
          note_to_author?: string | null
          submission_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_decisions_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_decisions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_decisions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          cover_path: string | null
          created_at: string
          id: number
          is_current: boolean
          label: string | null
          number: number
          published_at: string | null
          volume_id: number
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          id?: never
          is_current?: boolean
          label?: string | null
          number: number
          published_at?: string | null
          volume_id: number
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          id?: never
          is_current?: boolean
          label?: string | null
          number?: number
          published_at?: string | null
          volume_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "issues_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          created_at: string
          id: number
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: never
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: never
          label?: string
          slug?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          article_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          user_id?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliation: string | null
          affiliation_ror: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          orcid: string | null
          updated_at: string
        }
        Insert: {
          affiliation?: string | null
          affiliation_ror?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          orcid?: string | null
          updated_at?: string
        }
        Update: {
          affiliation?: string | null
          affiliation_ror?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          orcid?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          comments_to_author: string | null
          comments_to_editor: string | null
          due_at: string | null
          id: string
          recommendation:
            | Database["public"]["Enums"]["review_recommendation"]
            | null
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
          submission_id: string
          submitted_at: string | null
          version_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          comments_to_author?: string | null
          comments_to_editor?: string | null
          due_at?: string | null
          id?: string
          recommendation?:
            | Database["public"]["Enums"]["review_recommendation"]
            | null
          reviewer_id: string
          status?: Database["public"]["Enums"]["review_status"]
          submission_id: string
          submitted_at?: string | null
          version_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          comments_to_author?: string | null
          comments_to_editor?: string | null
          due_at?: string | null
          id?: string
          recommendation?:
            | Database["public"]["Enums"]["review_recommendation"]
            | null
          reviewer_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          submission_id?: string
          submitted_at?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_authors: {
        Row: {
          affiliation: string | null
          affiliation_ror: string | null
          email: string | null
          full_name: string
          id: string
          is_corresponding: boolean
          orcid: string | null
          position: number
          user_id: string | null
          version_id: string
        }
        Insert: {
          affiliation?: string | null
          affiliation_ror?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_corresponding?: boolean
          orcid?: string | null
          position?: number
          user_id?: string | null
          version_id: string
        }
        Update: {
          affiliation?: string | null
          affiliation_ror?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_corresponding?: boolean
          orcid?: string | null
          position?: number
          user_id?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_authors_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_files: {
        Row: {
          bytes: number | null
          caption: string | null
          contains_identity: boolean
          created_at: string
          created_by: string | null
          embed_url: string | null
          file_name: string | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          mime_type: string | null
          position: number
          storage_path: string | null
          submission_id: string
          version_id: string
        }
        Insert: {
          bytes?: number | null
          caption?: string | null
          contains_identity?: boolean
          created_at?: string
          created_by?: string | null
          embed_url?: string | null
          file_name?: string | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          mime_type?: string | null
          position?: number
          storage_path?: string | null
          submission_id: string
          version_id: string
        }
        Update: {
          bytes?: number | null
          caption?: string | null
          contains_identity?: boolean
          created_at?: string
          created_by?: string | null
          embed_url?: string | null
          file_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          mime_type?: string | null
          position?: number
          storage_path?: string | null
          submission_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_files_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_versions: {
        Row: {
          abstract: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          reason: string | null
          submission_id: string
          submitted_at: string | null
          title: string
          updated_at: string
          version: number
          video_url: string | null
        }
        Insert: {
          abstract?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          reason?: string | null
          submission_id: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          version?: number
          video_url?: string | null
        }
        Update: {
          abstract?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          reason?: string | null
          submission_id?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          version?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_versions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          article_type: Database["public"]["Enums"]["article_type"]
          cover_letter: string | null
          created_at: string
          current_version_id: string | null
          decided_at: string | null
          discipline_id: number | null
          id: string
          ref: string
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          submitter_id: string
          updated_at: string
        }
        Insert: {
          article_type?: Database["public"]["Enums"]["article_type"]
          cover_letter?: string | null
          created_at?: string
          current_version_id?: string | null
          decided_at?: string | null
          discipline_id?: number | null
          id?: string
          ref?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitter_id?: string
          updated_at?: string
        }
        Update: {
          article_type?: Database["public"]["Enums"]["article_type"]
          cover_letter?: string | null
          created_at?: string
          current_version_id?: string | null
          decided_at?: string | null
          discipline_id?: number | null
          id?: string
          ref?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      version_bodies: {
        Row: {
          body_html: string
          references_text: string | null
          updated_at: string
          version_id: string
        }
        Insert: {
          body_html?: string
          references_text?: string | null
          updated_at?: string
          version_id: string
        }
        Update: {
          body_html?: string
          references_text?: string | null
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "version_bodies_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: true
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      version_keywords: {
        Row: {
          keyword_id: number
          position: number
          version_id: string
        }
        Insert: {
          keyword_id: number
          position?: number
          version_id: string
        }
        Update: {
          keyword_id?: number
          position?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "version_keywords_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "version_keywords_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "submission_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      volumes: {
        Row: {
          created_at: string
          id: number
          number: number
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: never
          number: number
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: never
          number?: number
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_reviewer: {
        Args: { p_due_at?: string; p_reviewer: string; p_submission: string }
        Returns: string
      }
      author_reviews: {
        Args: { p_submission: string }
        Returns: {
          comments_to_author: string
          recommendation: Database["public"]["Enums"]["review_recommendation"]
          reviewer_label: string
          submitted_at: string
          version: number
        }[]
      }
      can_delete_submission_object: {
        Args: { p_name: string }
        Returns: boolean
      }
      can_edit_version: { Args: { p_version: string }; Returns: boolean }
      can_read_final_pdf: { Args: { p_name: string }; Returns: boolean }
      can_read_submission_object: { Args: { p_name: string }; Returns: boolean }
      can_read_version: { Args: { p_version: string }; Returns: boolean }
      can_upload_submission_object: {
        Args: { p_name: string }
        Returns: boolean
      }
      create_submission_draft: {
        Args: {
          p_article_type?: Database["public"]["Enums"]["article_type"]
          p_discipline_id?: number
        }
        Returns: string
      }
      current_review_model: {
        Args: never
        Returns: Database["public"]["Enums"]["review_model"]
      }
      decide_change_request: {
        Args: { p_approve: boolean; p_note?: string; p_request: string }
        Returns: undefined
      }
      ensure_author_role: { Args: { p_user: string }; Returns: undefined }
      get_article_comments: {
        Args: { p_article: string }
        Returns: {
          author_name: string
          body: string
          created_at: string
          id: string
          is_article_author: boolean
          is_mine: boolean
          parent_id: string
          status: Database["public"]["Enums"]["comment_status"]
        }[]
      }
      get_review_packet: { Args: { p_review: string }; Returns: Json }
      has_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_article_author: { Args: { p_article: string }; Returns: boolean }
      is_editor: { Args: never; Returns: boolean }
      is_privileged: { Args: never; Returns: boolean }
      is_submission_owner: { Args: { p_submission: string }; Returns: boolean }
      is_valid_orcid: { Args: { p_orcid: string }; Returns: boolean }
      log_event: {
        Args: {
          p_action: string
          p_data?: Json
          p_entity: string
          p_entity_id: string
        }
        Returns: undefined
      }
      moderate_comment: {
        Args: { p_approve: boolean; p_comment: string; p_note?: string }
        Returns: undefined
      }
      my_review_assignments: {
        Args: never
        Returns: {
          article_type: Database["public"]["Enums"]["article_type"]
          assigned_at: string
          discipline: string
          due_at: string
          review_id: string
          status: Database["public"]["Enums"]["review_status"]
          submission_ref: string
          submitted_at: string
          title: string
          version: number
        }[]
      }
      path_uuid: { Args: { p_name: string; p_part: number }; Returns: string }
      publish_correction: { Args: { p_request: string }; Returns: undefined }
      publish_submission: {
        Args: { p_doi?: string; p_issue_id?: number; p_submission: string }
        Returns: string
      }
      published_authors: {
        Args: { p_version: string }
        Returns: {
          affiliation: string
          affiliation_ror: string
          full_name: string
          is_corresponding: boolean
          orcid: string
          position: number
        }[]
      }
      record_decision: {
        Args: {
          p_decision: Database["public"]["Enums"]["decision_type"]
          p_note?: string
          p_submission: string
        }
        Returns: undefined
      }
      refresh_article: { Args: { p_article: string }; Returns: undefined }
      search_articles: {
        Args: {
          p_discipline?: string
          p_includes?: string[]
          p_issue?: number
          p_limit?: number
          p_offset?: number
          p_q?: string
          p_sort?: string
          p_type?: Database["public"]["Enums"]["article_type"]
        }
        Returns: {
          abstract: string
          article_id: string
          article_type: Database["public"]["Enums"]["article_type"]
          authors: string
          discipline_name: string
          discipline_slug: string
          doi: string
          has_datasets: boolean
          has_figures: boolean
          has_images: boolean
          has_video: boolean
          issue: number
          paper_no: number
          published_at: string
          rank: number
          slug: string
          title: string
          total_count: number
          volume: number
          withdrawn: boolean
        }[]
      }
      set_version_body: {
        Args: { p_body_html: string; p_references?: string; p_version: string }
        Returns: undefined
      }
      set_version_keywords: {
        Args: { p_labels: string[]; p_version: string }
        Returns: undefined
      }
      slugify: { Args: { p: string }; Returns: string }
      start_correction: { Args: { p_request: string }; Returns: string }
      start_editorial_check: {
        Args: { p_submission: string }
        Returns: undefined
      }
      start_revision: { Args: { p_submission: string }; Returns: string }
      submission_is_editable: {
        Args: { p_submission: string }
        Returns: boolean
      }
      submit_review: { Args: { p_review: string }; Returns: undefined }
      submit_submission: { Args: { p_submission: string }; Returns: undefined }
      version_is_public: { Args: { p_version: string }; Returns: boolean }
      withdraw_review: { Args: { p_review: string }; Returns: undefined }
    }
    Enums: {
      app_role: "reader" | "author" | "reviewer" | "editor" | "admin"
      article_type:
        | "original_research"
        | "review_article"
        | "case_study"
        | "short_communication"
      change_request_type: "correction" | "withdrawal"
      comment_status: "pending" | "approved" | "rejected"
      decision_type: "accept" | "revise" | "decline"
      media_kind:
        | "manuscript"
        | "image"
        | "figure"
        | "dataset"
        | "video_upload"
        | "video_embed"
        | "supplementary"
      request_status: "pending" | "approved" | "rejected" | "completed"
      review_model: "single_blind" | "double_blind"
      review_recommendation:
        | "accept"
        | "minor_revision"
        | "major_revision"
        | "reject"
      review_status: "assigned" | "submitted" | "withdrawn"
      submission_status:
        | "draft"
        | "submitted"
        | "editorial_check"
        | "in_review"
        | "revision_requested"
        | "accepted"
        | "declined"
        | "published"
        | "withdrawn"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["reader", "author", "reviewer", "editor", "admin"],
      article_type: [
        "original_research",
        "review_article",
        "case_study",
        "short_communication",
      ],
      change_request_type: ["correction", "withdrawal"],
      comment_status: ["pending", "approved", "rejected"],
      decision_type: ["accept", "revise", "decline"],
      media_kind: [
        "manuscript",
        "image",
        "figure",
        "dataset",
        "video_upload",
        "video_embed",
        "supplementary",
      ],
      request_status: ["pending", "approved", "rejected", "completed"],
      review_model: ["single_blind", "double_blind"],
      review_recommendation: [
        "accept",
        "minor_revision",
        "major_revision",
        "reject",
      ],
      review_status: ["assigned", "submitted", "withdrawn"],
      submission_status: [
        "draft",
        "submitted",
        "editorial_check",
        "in_review",
        "revision_requested",
        "accepted",
        "declined",
        "published",
        "withdrawn",
      ],
    },
  },
} as const

