/**
 * Hand-written subset of the Dance More Lovable Supabase schema.
 *
 * We only model the tables/columns this app reads or writes. The real schema
 * has many more tables (taxes, leads, ads, etc.) — those live in the Lovable
 * dashboard and we deliberately don't touch them from here.
 */

export type AppRole = 'admin' | 'moderator' | 'user' | 'teacher';

export type LessonStatusDB = 'scheduled' | 'completed' | 'missed' | 'rescheduled';

export type StudentType = 'wedding' | 'private';

export interface StudentRow {
  id: string;
  name: string;
  style: string | null;
  teacher_id: string | null;
  lesson_template: number | null;
  lessons: string | null; // free text like "12 LESSONS"
  lessons_total: number | null;
  lessons_remaining: number | null;
  payment_status: string | null;
  amount: number | null;
  status: string | null;
  source_lead_id: string | null;
  // Added: wedding vs private students
  student_type: StudentType | null;
  wedding_date: string | null; // ISO date 'YYYY-MM-DD' (wedding students only)
  goal: string | null; // free text — set at the beginning for private students
  created_at: string;
  updated_at: string | null;
}

export interface LessonRow {
  id: string;
  student_id: string;
  teacher_id: string | null;
  lesson_number: number;
  scheduled_date: string | null; // ISO date
  scheduled_start: string | null; // ISO datetime
  scheduled_end: string | null;
  status: LessonStatusDB;
  notes: string | null;
  photo_urls: string[] | null;
  is_favourite: boolean | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TeacherRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rate_per_lesson: number | null;
  stripe_connect_status: string | null;
}

export interface ProfileRow {
  user_id: string;
  full_name: string | null;
  teacher_id: string | null;
  onboarded: boolean | null;
}

export interface UserRoleRow {
  user_id: string;
  role: AppRole;
}

export interface Database {
  public: {
    Tables: {
      students: {
        Row: StudentRow;
        Insert: Partial<StudentRow> & { name: string };
        Update: Partial<StudentRow>;
        Relationships: [];
      };
      lessons: {
        Row: LessonRow;
        Insert: Partial<LessonRow> & { student_id: string; lesson_number: number };
        Update: Partial<LessonRow>;
        Relationships: [];
      };
      teachers: {
        Row: TeacherRow;
        Insert: Partial<TeacherRow> & { name: string };
        Update: Partial<TeacherRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { user_id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      user_roles: {
        Row: UserRoleRow;
        Insert: UserRoleRow;
        Update: Partial<UserRoleRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
