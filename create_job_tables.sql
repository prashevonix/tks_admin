
-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.job_applications CASCADE;
DROP TABLE IF EXISTS public.saved_jobs CASCADE;

-- Create job_applications table
CREATE TABLE public.job_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Create saved_jobs table
CREATE TABLE public.saved_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Add indexes for better performance
CREATE INDEX idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX idx_saved_jobs_job_id ON public.saved_jobs(job_id);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_applications
DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications;
CREATE POLICY "Users can view their own applications" ON public.job_applications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create applications" ON public.job_applications;
CREATE POLICY "Users can create applications" ON public.job_applications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own applications" ON public.job_applications;
CREATE POLICY "Users can update their own applications" ON public.job_applications
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete their own applications" ON public.job_applications;
CREATE POLICY "Users can delete their own applications" ON public.job_applications
  FOR DELETE USING (true);

-- RLS policies for saved_jobs
DROP POLICY IF EXISTS "Users can view their own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users can view their own saved jobs" ON public.saved_jobs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can save jobs" ON public.saved_jobs;
CREATE POLICY "Users can save jobs" ON public.saved_jobs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users can delete their own saved jobs" ON public.saved_jobs
  FOR DELETE USING (true);
