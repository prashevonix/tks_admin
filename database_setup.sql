
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Signup Requests Table (for pending approvals)
CREATE TABLE IF NOT EXISTS signup_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  graduation_year INTEGER NOT NULL,
  batch TEXT,
  course TEXT,
  branch TEXT,
  roll_number TEXT,
  cgpa TEXT,
  current_city TEXT,
  current_company TEXT,
  "current_role" TEXT,
  linkedin_url TEXT,
  reason_for_joining TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  replies_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_comment_replies table
CREATE TABLE IF NOT EXISTS post_comment_replies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id VARCHAR NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Landing Page Hero Section
CREATE TABLE IF NOT EXISTS hero_section (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT,
  cta_text TEXT DEFAULT 'Join Now',
  cta_link TEXT DEFAULT '/signup',
  background_image TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alumni Benefits
CREATE TABLE IF NOT EXISTS alumni_benefits (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Why Join Section
CREATE TABLE IF NOT EXISTS why_join_reasons (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_name TEXT NOT NULL,
  batch_year INTEGER NOT NULL,
  "current_role" TEXT,
  current_company TEXT,
  testimonial_text TEXT NOT NULL,
  profile_image TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Landing Page Events (simplified from main events table)
CREATE TABLE IF NOT EXISTS landing_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  event_time TEXT,
  location TEXT,
  venue TEXT,
  image_url TEXT,
  max_participants INTEGER,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create main events table for the Events page
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TEXT,
  location TEXT,
  venue TEXT,
  image_url TEXT,
  tags TEXT[],
  posted_by VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  max_participants INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Community Highlights
CREATE TABLE IF NOT EXISTS community_highlights (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  category TEXT, -- 'achievement', 'news', 'feature'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portal Features (What You Will Find section)
CREATE TABLE IF NOT EXISTS portal_features (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  feature_link TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Statistics/Metrics
CREATE TABLE IF NOT EXISTS alumni_statistics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metric_label TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  job_type TEXT, -- full-time, part-time, contract, internship
  work_mode TEXT, -- remote, onsite, hybrid
  description TEXT,
  requirements TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  experience_level TEXT,
  industry TEXT,
  skills TEXT,
  application_deadline TIMESTAMP,
  application_url TEXT,
  contact_email TEXT,
  company_logo TEXT,
  posted_by VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills TEXT;

-- Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Saved Jobs Table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Alumni Table with corrected columns
CREATE TABLE IF NOT EXISTS alumni (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  graduation_year INTEGER NOT NULL,
  batch TEXT,
  course TEXT,
  branch TEXT,
  roll_number TEXT,
  cgpa TEXT,
  current_city TEXT,
  current_company TEXT,
  current_position TEXT,
  "current_role" TEXT,
  industry TEXT,
  experience TEXT,
  skills TEXT,
  location TEXT,
  higher_education TEXT,
  university TEXT,
  higher_education_country TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  twitter_url TEXT,
  personal_website TEXT,
  is_profile_public BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  show_location BOOLEAN DEFAULT true,
  show_company BOOLEAN DEFAULT true,
  show_education BOOLEAN DEFAULT true,
  show_linkedin BOOLEAN DEFAULT true,
  linkedin_synced BOOLEAN DEFAULT false,
  linkedin_profile_url TEXT,
  linkedin_photo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LinkedIn Integrations Table
CREATE TABLE IF NOT EXISTS linkedin_integrations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  linkedin_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_in INTEGER,
  scope TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_landing_events_date ON landing_events(event_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_alumni_user_id ON alumni(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_email ON alumni(email);
CREATE INDEX IF NOT EXISTS idx_linkedin_integrations_user_id ON linkedin_integrations(user_id);

-- Add shares_count column to feed_posts if it doesn't exist
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- Ensure feed_posts table has all required columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='feed_posts' AND column_name='author_id') THEN
    ALTER TABLE feed_posts ADD COLUMN author_id VARCHAR REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='feed_posts' AND column_name='content') THEN
    ALTER TABLE feed_posts ADD COLUMN content TEXT NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='feed_posts' AND column_name='post_type') THEN
    ALTER TABLE feed_posts ADD COLUMN post_type TEXT DEFAULT 'general';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='feed_posts' AND column_name='likes_count') THEN
    ALTER TABLE feed_posts ADD COLUMN likes_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='feed_posts' AND column_name='comments_count') THEN
    ALTER TABLE feed_posts ADD COLUMN comments_count INTEGER DEFAULT 0;
  END IF;
END$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hero_section_updated_at ON hero_section;
CREATE TRIGGER update_hero_section_updated_at BEFORE UPDATE ON hero_section
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alumni_benefits_updated_at ON alumni_benefits;
CREATE TRIGGER update_alumni_benefits_updated_at BEFORE UPDATE ON alumni_benefits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_testimonials_updated_at ON testimonials;
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alumni_updated_at ON alumni;
CREATE TRIGGER update_alumni_updated_at BEFORE UPDATE ON alumni
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_linkedin_integrations_updated_at ON linkedin_integrations;
CREATE TRIGGER update_linkedin_integrations_updated_at BEFORE UPDATE ON linkedin_integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on tables
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Insert default hero section
INSERT INTO hero_section (title, subtitle, description, is_active)
VALUES (
  'Welcome to The Kalyani School Alumni Network',
  'Reconnect. Engage. Grow.',
  'Join thousands of alumni building meaningful connections and shaping the future together.',
  true
) ON CONFLICT DO NOTHING;

-- Insert sample benefits
INSERT INTO alumni_benefits (icon, title, description, display_order) VALUES
('🌐', 'Global Network', 'Connect with alumni worldwide across diverse industries and backgrounds', 1),
('💼', 'Career Opportunities', 'Access exclusive job postings and mentorship programs', 2),
('🎓', 'Continuous Learning', 'Attend workshops, webinars, and skill development sessions', 3),
('🤝', 'Mentorship', 'Guide current students or receive guidance from senior alumni', 4)
ON CONFLICT DO NOTHING;

-- Insert sample why join reasons
INSERT INTO why_join_reasons (icon, title, description, display_order) VALUES
('🔗', 'Stay Connected', 'Maintain lifelong connections with your peers and mentors', 1),
('📈', 'Advance Your Career', 'Leverage our network for career growth and opportunities', 2),
('🎯', 'Give Back', 'Contribute to the growth of current students and the institution', 3),
('🌟', 'Access Exclusive Content', 'Get early access to events, resources, and opportunities', 4)
ON CONFLICT DO NOTHING;

-- Insert sample portal features
INSERT INTO portal_features (icon, title, description, feature_link, display_order) VALUES
('📱', 'Social Feed', 'Stay updated with news, achievements, and stories from the community', '/feed', 1),
('💼', 'Job Portal', 'Discover career opportunities posted by fellow alumni', '/job-portal', 2),
('📅', 'Events', 'Register for reunions, networking sessions, and webinars', '/events', 3),
('👥', 'Alumni Directory', 'Search and connect with alumni by batch, location, or industry', '/connections', 4)
ON CONFLICT DO NOTHING;

-- Insert sample statistics
INSERT INTO alumni_statistics (metric_name, metric_value, metric_label, icon, display_order) VALUES
('total_alumni', '5000+', 'Active Alumni', '👥', 1),
('countries', '50+', 'Countries Represented', '🌍', 2),
('companies', '1000+', 'Companies Worldwide', '🏢', 3),
('events', '100+', 'Annual Events', '🎉', 4)
ON CONFLICT DO NOTHING;

-- Create RLS policies
DROP POLICY IF EXISTS "Anyone can view likes" ON post_likes;
CREATE POLICY "Anyone can view likes" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own likes" ON post_likes;
CREATE POLICY "Users can create their own likes" ON post_likes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own likes" ON post_likes;
CREATE POLICY "Users can delete their own likes" ON post_likes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can view active comments" ON post_comments;
CREATE POLICY "Anyone can view active comments" ON post_comments FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can create comments" ON post_comments;
CREATE POLICY "Users can create comments" ON post_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own comments" ON post_comments;
CREATE POLICY "Users can update their own comments" ON post_comments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;
CREATE POLICY "Users can delete their own comments" ON post_comments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Admin can view all signup requests" ON signup_requests;
CREATE POLICY "Admin can view all signup requests" ON signup_requests FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

DROP POLICY IF EXISTS "Users can create their own signup request" ON signup_requests;
CREATE POLICY "Users can create their own signup request" ON signup_requests FOR INSERT WITH CHECK (email = auth.email());

DROP POLICY IF EXISTS "Admin can update signup request status" ON signup_requests;
CREATE POLICY "Admin can update signup request status" ON signup_requests FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can delete signup requests" ON signup_requests;
CREATE POLICY "Admin can delete signup requests" ON signup_requests FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true));

-- RLS policies for jobs table
DROP POLICY IF EXISTS "Anyone can view active jobs" ON jobs;
CREATE POLICY "Anyone can view active jobs" ON jobs FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can create jobs" ON jobs;
CREATE POLICY "Users can create jobs" ON jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
CREATE POLICY "Users can update their own jobs" ON jobs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
CREATE POLICY "Users can delete their own jobs" ON jobs FOR DELETE USING (true);

-- RLS policies for job_applications
DROP POLICY IF EXISTS "Users can view their own applications" ON job_applications;
CREATE POLICY "Users can view their own applications" ON job_applications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create applications" ON job_applications;
CREATE POLICY "Users can create applications" ON job_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own applications" ON job_applications;
CREATE POLICY "Users can update their own applications" ON job_applications FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete their own applications" ON job_applications;
CREATE POLICY "Users can delete their own applications" ON job_applications FOR DELETE USING (true);

-- RLS policies for saved_jobs
DROP POLICY IF EXISTS "Users can view their own saved jobs" ON saved_jobs;
CREATE POLICY "Users can view their own saved jobs" ON saved_jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can save jobs" ON saved_jobs;
CREATE POLICY "Users can save jobs" ON saved_jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own saved jobs" ON saved_jobs;
CREATE POLICY "Users can delete their own saved jobs" ON saved_jobs FOR DELETE USING (true);

-- RLS policies for events table
DROP POLICY IF EXISTS "Anyone can view active events" ON events;
CREATE POLICY "Anyone can view active events" ON events FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events" ON events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events" ON events FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete their own events" ON events;
CREATE POLICY "Users can delete their own events" ON events FOR DELETE USING (true);

-- RLS policies for alumni table
DROP POLICY IF EXISTS "Anyone can view alumni profiles" ON alumni;
CREATE POLICY "Anyone can view alumni profiles" ON alumni FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can create their own alumni profile" ON alumni;
CREATE POLICY "Users can create their own alumni profile" ON alumni FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own alumni profile" ON alumni;
CREATE POLICY "Users can update their own alumni profile" ON alumni FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own alumni profile" ON alumni;
CREATE POLICY "Users can delete their own alumni profile" ON alumni FOR DELETE USING (user_id = auth.uid()::text);

-- RLS policies for linkedin_integrations table
DROP POLICY IF EXISTS "Users can view their own linkedin integration" ON linkedin_integrations;
CREATE POLICY "Users can view their own linkedin integration" ON linkedin_integrations FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create their own linkedin integration" ON linkedin_integrations;
CREATE POLICY "Users can create their own linkedin integration" ON linkedin_integrations FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own linkedin integration" ON linkedin_integrations;
CREATE POLICY "Users can update their own linkedin integration" ON linkedin_integrations FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own linkedin integration" ON linkedin_integrations;
CREATE POLICY "Users can delete their own linkedin integration" ON linkedin_integrations FOR DELETE USING (user_id = auth.uid()::text);
