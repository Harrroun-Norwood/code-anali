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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      billing: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          enrollment_id: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          status: string
          student_id: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          student_id: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          student_id?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string | null
          created_at: string
          enrollment_date: string
          grade: string | null
          id: string
          status: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          enrollment_date?: string
          grade?: string | null
          id?: string
          status?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          enrollment_date?: string
          grade?: string | null
          id?: string
          status?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string
          id: string
          is_active: boolean | null
          max_students: number | null
          name: string
          program_id: string | null
          room: string | null
          schedule: string | null
          semester: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name: string
          program_id?: string | null
          room?: string | null
          schedule?: string | null
          semester: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name?: string
          program_id?: string | null
          room?: string | null
          schedule?: string | null
          semester?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          applicant_email: string
          applicant_name: string
          applicant_phone: string | null
          created_at: string | null
          id: string
          meeting_link: string | null
          notes: string | null
          preferred_date: string
          preferred_time: string | null
          program_interest: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_phone?: string | null
          created_at?: string | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          preferred_date: string
          preferred_time?: string | null
          program_interest?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_phone?: string | null
          created_at?: string | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          preferred_date?: string
          preferred_time?: string | null
          program_interest?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_inquiries: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      document_requests: {
        Row: {
          completion_date: string | null
          created_at: string
          document_type: string
          grade_section: string | null
          id: string
          notes: string | null
          pickup_date: string | null
          request_date: string
          status: string
          student_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          document_type: string
          grade_section?: string | null
          id?: string
          notes?: string | null
          pickup_date?: string | null
          request_date?: string
          status?: string
          student_id: string
          student_name: string
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          document_type?: string
          grade_section?: string | null
          id?: string
          notes?: string | null
          pickup_date?: string | null
          request_date?: string
          status?: string
          student_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      enrollments: {
        Row: {
          academic_year: string
          age: number | null
          created_at: string | null
          document_good_moral: string | null
          document_half_body: string | null
          document_id_pictures: string | null
          document_report_card: string | null
          enrollment_status: string | null
          facebook_account: string | null
          gender: string | null
          gmail_account: string | null
          grade_level: string | null
          home_address: string | null
          id: string
          lrn: string | null
          medical_conditions: string | null
          middle_name: string | null
          parent_address: string | null
          parent_contact: string | null
          parent_name: string | null
          payment_plan: string | null
          place_of_birth: string | null
          program_id: string | null
          semester: string | null
          student_id: string | null
          telephone: string | null
          tuition_fee: number | null
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          age?: number | null
          created_at?: string | null
          document_good_moral?: string | null
          document_half_body?: string | null
          document_id_pictures?: string | null
          document_report_card?: string | null
          enrollment_status?: string | null
          facebook_account?: string | null
          gender?: string | null
          gmail_account?: string | null
          grade_level?: string | null
          home_address?: string | null
          id?: string
          lrn?: string | null
          medical_conditions?: string | null
          middle_name?: string | null
          parent_address?: string | null
          parent_contact?: string | null
          parent_name?: string | null
          payment_plan?: string | null
          place_of_birth?: string | null
          program_id?: string | null
          semester?: string | null
          student_id?: string | null
          telephone?: string | null
          tuition_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          age?: number | null
          created_at?: string | null
          document_good_moral?: string | null
          document_half_body?: string | null
          document_id_pictures?: string | null
          document_report_card?: string | null
          enrollment_status?: string | null
          facebook_account?: string | null
          gender?: string | null
          gmail_account?: string | null
          grade_level?: string | null
          home_address?: string | null
          id?: string
          lrn?: string | null
          medical_conditions?: string | null
          middle_name?: string | null
          parent_address?: string | null
          parent_contact?: string | null
          parent_name?: string | null
          payment_plan?: string | null
          place_of_birth?: string | null
          program_id?: string | null
          semester?: string | null
          student_id?: string | null
          telephone?: string | null
          tuition_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      grades: {
        Row: {
          assignment_name: string
          class_enrollment_id: string | null
          created_at: string
          date_recorded: string
          grade_type: string
          id: string
          max_score: number | null
          notes: string | null
          percentage: number | null
          quarter: string
          score: number | null
          updated_at: string
        }
        Insert: {
          assignment_name: string
          class_enrollment_id?: string | null
          created_at?: string
          date_recorded?: string
          grade_type: string
          id?: string
          max_score?: number | null
          notes?: string | null
          percentage?: number | null
          quarter: string
          score?: number | null
          updated_at?: string
        }
        Update: {
          assignment_name?: string
          class_enrollment_id?: string | null
          created_at?: string
          date_recorded?: string
          grade_type?: string
          id?: string
          max_score?: number | null
          notes?: string | null
          percentage?: number | null
          quarter?: string
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_enrollment_id_fkey"
            columns: ["class_enrollment_id"]
            isOneToOne: false
            referencedRelation: "class_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_number: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
        }
        Relationships: []
      }
      report_cards: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          created_by: string
          general_average: number
          generated_date: string | null
          id: string
          notes: string | null
          quarter: string
          released_date: string | null
          semester: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string
          created_by: string
          general_average?: number
          generated_date?: string | null
          id?: string
          notes?: string | null
          quarter: string
          released_date?: string | null
          semester: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          created_by?: string
          general_average?: number
          generated_date?: string | null
          id?: string
          notes?: string | null
          quarter?: string
          released_date?: string | null
          semester?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_data_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string | null
          accessed_fields: string[] | null
          id: string
          ip_address: unknown | null
          student_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by?: string | null
          accessed_fields?: string[] | null
          id?: string
          ip_address?: unknown | null
          student_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string | null
          accessed_fields?: string[] | null
          id?: string
          ip_address?: unknown | null
          student_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_profile_info: {
        Args: { _user_id: string }
        Returns: {
          first_name: string
          last_name: string
          photo_url: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      get_student_basic_info_for_teacher: {
        Args: { _student_id: string; _teacher_id: string }
        Returns: {
          first_name: string
          last_name: string
          photo_url: string
          user_id: string
        }[]
      }
      get_student_billing_info_for_accountant: {
        Args: { _student_id: string }
        Returns: {
          email: string
          first_name: string
          last_name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_student_enrolled_in_class: {
        Args: { _class_id: string; _student_id: string }
        Returns: boolean
      }
      log_student_data_access: {
        Args: {
          _access_type: string
          _accessed_fields: string[]
          _student_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role:
        | "guest"
        | "student"
        | "parent"
        | "teacher"
        | "registrar"
        | "accountant"
        | "super_admin"
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
      user_role: [
        "guest",
        "student",
        "parent",
        "teacher",
        "registrar",
        "accountant",
        "super_admin",
      ],
    },
  },
} as const
