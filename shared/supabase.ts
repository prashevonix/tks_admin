import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types based on your schema
export interface User {
  id: string
  username: string
  email: string
  is_admin: boolean
  user_role: 'alumni' | 'student' | 'faculty' | 'administrator';
  created_at: string
  updated_at: string
}

export interface Alumni {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  gender?: string
  profile_picture?: string
  bio?: string
  graduation_year: number
  batch: string
  course?: string
  branch?: string
  roll_number?: string
  cgpa?: string
  current_city?: string
  current_state?: string
  current_country?: string
  permanent_address?: string
  current_company?: string
  current_role?: string
  industry?: string
  experience?: string
  skills?: string
  higher_education?: string
  university?: string
  higher_education_country?: string
  linkedin_url?: string
  github_url?: string
  twitter_url?: string
  personal_website?: string
  is_profile_public: boolean
  show_email: boolean
  show_phone: boolean
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FeedPost {
  id: string
  author_id: string
  content: string
  image_url?: string
  post_type: string
  likes_count: number
  comments_count: number
  shares_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PostLike {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}