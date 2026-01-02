import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const JobPortalPage = (): JSX.Element => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Set page title
  React.useEffect(() => {
    document.title = "Job Portal - TKS Alumni Portal";
  }, []);

  // Job posting form state
  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [industry, setIndustry] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [skills, setSkills] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");

  // State for saved and applied jobs
  const [savedJobs, setSavedJobs] = useState<Set<number>>(new Set());
  const [appliedJobs, setAppliedJobs] = useState<Set<number>>(new Set());
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'saved' | 'applied'>('all');
  const [savedJobsData, setSavedJobsData] = useState<any[]>([]);
  const [appliedJobsData, setAppliedJobsData] = useState<any[]>([]);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchSavedAndAppliedJobs();
  }, [user]); // Re-fetch if user changes

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch('/api/jobs', {
        headers: {
          'user-id': userId || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAndAppliedJobs = async () => {
    try {
      const userId = user?.id || localStorage.getItem('userId');
      if (!userId) return;

      const [savedResponse, appliedResponse] = await Promise.all([
        fetch('/api/jobs/saved', { headers: { 'user-id': userId } }),
        fetch('/api/jobs/my-applications', { headers: { 'user-id': userId } })
      ]);

      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        const jobIds = new Set((savedData.savedJobs || []).map((s: any) => s.job_id));
        setSavedJobs(jobIds);
        setSavedJobsData(savedData.savedJobs || []);
      } else {
        console.error('Failed to fetch saved jobs');
      }

      if (appliedResponse.ok) {
        const appliedData = await appliedResponse.json();
        const jobIds = new Set((appliedData.applications || []).map((a: any) => a.job_id));
        setAppliedJobs(jobIds);
        setAppliedJobsData(appliedData.applications || []);
      } else {
        console.error('Failed to fetch applied jobs');
      }
    } catch (error) {
      console.error('Error fetching saved/applied jobs:', error);
    }
  };

  const handlePostJob = async () => {
    if (!jobTitle || !companyName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || ''
        },
        body: JSON.stringify({
          title: jobTitle,
          company: companyName,
          location: jobLocation,
          jobType,
          workMode,
          description: jobDescription,
          industry: industry || null,
          skills: skills || null,
          experienceLevel: yearsOfExperience || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to post job');
      }

      toast({
        title: "Success",
        description: "Job posted successfully!",
      });

      // Reset form
      setJobTitle("");
      setJobLocation("");
      setJobType("");
      setIndustry("");
      setYearsOfExperience("");
      setWorkMode("");
      setSkills("");
      setJobDescription("");
      setCompanyName("");
      setCompanyLogo("");
      setIsJobDialogOpen(false);

      // Refresh jobs list
      fetchJobs();
    } catch (error) {
      console.error('Error posting job:', error);
      toast({
        title: "Error",
        description: "Failed to post job",
        variant: "destructive"
      });
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const userId = user?.id || localStorage.getItem('userId');
      const params = new URLSearchParams();

      if (searchTerm && searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedLocation && selectedLocation.trim()) params.append('location', selectedLocation.trim());
      if (selectedType && selectedType.trim()) params.append('jobType', selectedType.trim());
      if (selectedIndustry && selectedIndustry.trim()) params.append('industry', selectedIndustry.trim());

      const response = await fetch(`/api/jobs?${params.toString()}`, {
        headers: {
          'user-id': userId || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when filters change with debouncing
  useEffect(() => {
    // Skip initial render to prevent double fetch
    if (!jobs.length && !searchTerm && !selectedLocation && !selectedType && !selectedIndustry) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      applyFilters();
    }, 300); // 300ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedLocation, selectedType, selectedIndustry]);

  // Display only real jobs from database, no demo/sample jobs
  const displayJobs = jobs;

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedLocation("");
    setSelectedType("");
    setSelectedIndustry("");
    // Immediately fetch jobs without filters
    setTimeout(() => {
      fetchJobs();
    }, 50);
  };

  const handleApplyJob = async () => {
    if (!selectedJobForApply) return;

    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch(`/api/jobs/${selectedJobForApply.id}/apply`, {
        method: 'POST',
        headers: {
          'user-id': userId || ''
        }
      });

      if (response.ok) {
        setAppliedJobs(prev => new Set([...prev, selectedJobForApply.id]));
        toast({
          title: "Success",
          description: "Application submitted successfully!",
        });
        setIsApplyDialogOpen(false);
        setSelectedJobForApply(null);
      } else {
        throw new Error('Failed to apply for job');
      }
    } catch (error) {
      console.error('Apply job error:', error);
      toast({
        title: "Error",
        description: "Failed to apply for job",
        variant: "destructive"
      });
    }
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setJobTitle(job.title || '');
    setJobLocation(job.location || '');
    setJobType(job.job_type || '');
    setIndustry(job.industry || '');
    setYearsOfExperience(job.experience_level || '');
    setWorkMode(job.work_mode || '');
    setSkills(job.skills || '');
    setJobDescription(job.description || '');
    setCompanyName(job.company || '');
    setCompanyLogo(job.company_logo || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateJob = async () => {
    if (!editingJob || !jobTitle || !companyName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch(`/api/jobs/${editingJob.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || ''
        },
        body: JSON.stringify({
          title: jobTitle,
          company: companyName,
          location: jobLocation,
          jobType,
          workMode,
          description: jobDescription,
          industry: industry || null,
          skills: skills || null,
          experienceLevel: yearsOfExperience || null,
          isActive: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update job');
      }

      toast({
        title: "Success",
        description: "Job updated successfully!",
      });

      // Reset form
      setJobTitle("");
      setJobLocation("");
      setJobType("");
      setIndustry("");
      setYearsOfExperience("");
      setWorkMode("");
      setSkills("");
      setJobDescription("");
      setCompanyName("");
      setCompanyLogo("");
      setEditingJob(null);
      setIsEditDialogOpen(false);

      // Refresh jobs list
      fetchJobs();
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive"
      });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) {
      return;
    }

    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'user-id': userId || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete job');
      }

      toast({
        title: "Success",
        description: "Job deleted successfully!",
      });

      // Refresh jobs list
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout currentPage="job-portal">
      <div className="p-6">
          {/* Mobile Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="sm:hidden flex items-center gap-2 text-gray-600 hover:text-[#008060] mb-4"
            onClick={() => window.history.back()}
          >
            <span className="text-xl">←</span>
            <span>Back</span>
          </Button>

          {/* Post Job Section */}
          <Card className="mb-6 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Wish to hire your fellow Alumni ?</span>
                <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#008060] hover:bg-[#007055] text-white px-6">
                      Post a Job Opening 💼
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">Post Job Details</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                      {/* First Row - Job Title, Job Location, Job Type */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Job Title</Label>
                          <Input
                            placeholder="Input clear job titles"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Job Location</Label>
                          <Input
                            placeholder="Input clear job titles"
                            value={jobLocation}
                            onChange={(e) => setJobLocation(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Job Type</Label>
                          <Select value={jobType} onValueChange={setJobType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Full Time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full-time">Full Time</SelectItem>
                              <SelectItem value="part-time">Part Time</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="internship">Internship</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Second Row - Select Industry, YOE */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Select Industry</Label>
                          <Select value={industry} onValueChange={setIndustry}>
                            <SelectTrigger>
                              <SelectValue placeholder="Domain of work" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="technology">Technology</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="consulting">Consulting</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">YOE (if applicable)</Label>
                          <Select value={yearsOfExperience} onValueChange={setYearsOfExperience}>
                            <SelectTrigger>
                              <SelectValue placeholder="N/A" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0-1">0-1 years</SelectItem>
                              <SelectItem value="1-3">1-3 years</SelectItem>
                              <SelectItem value="3-5">3-5 years</SelectItem>
                              <SelectItem value="5+">5+ years</SelectItem>
                              <SelectItem value="na">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Third Row - Work Mode, Skills */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Work Mode</Label>
                          <Select value={workMode} onValueChange={setWorkMode}>
                            <SelectTrigger>
                              <SelectValue placeholder="Remote" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="remote">Remote</SelectItem>
                              <SelectItem value="onsite">On-site</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Skills</Label>
                          <Input
                            placeholder="Add skills crucial for the job"
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Job Description */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Job Description</Label>
                        <div className="border rounded-md">
                          {/* Toolbar */}
                          <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
                            <button className="p-1 hover:bg-gray-200 rounded">
                              <span className="font-bold text-sm">B</span>
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded">
                              <span className="italic text-sm">I</span>
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded">
                              <span className="underline text-sm">U</span>
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded">
                              <span className="text-sm">•</span>
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded">
                              <span className="text-sm">1.</span>
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded">
                              <span className="text-sm">🔗</span>
                            </button>
                          </div>
                          <Textarea
                            placeholder="Add job description"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className="border-0 min-h-[120px] resize-none focus-visible:ring-0"
                          />
                        </div>
                      </div>

                      {/* Company Name and Upload */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Company Name</Label>
                          <Input
                            placeholder="Input company name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Upload Company Logo</Label>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    console.log('File selected:', file.name);
                                    // Handle file upload logic here
                                  }
                                };
                                input.click();
                              }}
                            >
                              📎 Choose file
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsJobDialogOpen(false)}
                          className="px-6 text-red-500 border-red-500 hover:bg-red-50"
                        >
                          Cancel ✗
                        </Button>
                        <Button
                          onClick={handlePostJob}
                          className="px-6 bg-[#008060] hover:bg-[#007055] text-white"
                        >
                          Post Job ✓
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Section with Tabs */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold">Jobs</h2>
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('all')}
                  className={activeTab === 'all' ? 'bg-[#008060] hover:bg-[#007055]' : ''}
                >
                  All Jobs
                </Button>
                <Button
                  variant={activeTab === 'saved' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('saved')}
                  className={activeTab === 'saved' ? 'bg-[#008060] hover:bg-[#007055]' : ''}
                >
                  Saved ({savedJobsData.length})
                </Button>
                <Button
                  variant={activeTab === 'applied' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('applied')}
                  className={activeTab === 'applied' ? 'bg-[#008060] hover:bg-[#007055]' : ''}
                >
                  Applied ({appliedJobsData.length})
                </Button>
              </div>
            </div>

            {/* Search and Filters - Only show for All Jobs tab */}
            {activeTab === 'all' && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    <Input
                      placeholder="Search Job by name"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyFilters();
                        }
                      }}
                      className="flex-1"
                    />

                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pune">Pune</SelectItem>
                        <SelectItem value="mumbai">Mumbai</SelectItem>
                        <SelectItem value="bangalore">Bangalore</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freshers">Freshers</SelectItem>
                        <SelectItem value="experienced">Experienced</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={clearFilters} className="text-[#008060]">
                      Clear Filters
                    </Button>
                    <Button 
                      onClick={applyFilters}
                      className="bg-[#008060] hover:bg-[#007055] text-white"
                    >
                      Apply Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Listings */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Loading jobs...</div>
              ) : activeTab === 'all' ? (
                displayJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 text-lg mb-2">No jobs available</p>
                    <p className="text-gray-500 text-sm">Check back later or adjust your filters</p>
                  </div>
                ) : (
                  displayJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* Company Logo */}
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <img 
                            src={job.company_logo || job.avatar || "/figmaAssets/group-5.png"} 
                            alt="Company"
                            className="w-8 h-8 rounded-full"
                          />
                        </div>

                        {/* Job Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-[#008060] mb-1">{job.title || job.company}</h3>
                              <p className="text-sm text-gray-600 mb-2">
                                Posted by {job.posted_by_user?.username || job.postedBy || 'Unknown'}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                <span>{job.location || 'Remote'}</span>
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {job.experience_level || job.type || 'All levels'}
                                </span>
                                <span>{job.job_type || job.schedule || 'Full-time'} | {job.work_mode || 'On-site'}</span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {(() => {
                                const currentUserId = user?.id || localStorage.getItem('userId');
                                const isJobPoster = job.posted_by === currentUserId;

                                if (isJobPoster) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleEditJob(job)}
                                        className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                      >
                                        Edit ✏️
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDeleteJob(job.id)}
                                        className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                      >
                                        Delete 🗑️
                                      </Button>
                                    </div>
                                  );
                                }

                                return (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={async () => {
                                        try {
                                          const userId = user?.id || localStorage.getItem('userId');
                                          const response = await fetch(`/api/jobs/${job.id}/save`, {
                                            method: 'POST',
                                            headers: {
                                              'user-id': userId || ''
                                            }
                                          });

                                          if (response.ok) {
                                            const data = await response.json();
                                            if (data.saved) {
                                              setSavedJobs(prev => new Set([...prev, job.id]));
                                              toast({
                                                title: "Success",
                                                description: "Job saved successfully!",
                                              });
                                            } else {
                                              setSavedJobs(prev => {
                                                const newSet = new Set(prev);
                                                newSet.delete(job.id);
                                                return newSet;
                                              });
                                              toast({
                                                title: "Success",
                                                description: "Job removed from saved list",
                                              });
                                            }
                                          }
                                        } catch (error) {
                                          console.error('Save job error:', error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to save job",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      className={savedJobs.has(job.id) ? "bg-[#007055] text-white border-[#007055]" : "bg-[#008060] text-white border-[#008060] hover:bg-[#007055]"}
                                    >
                                      {savedJobs.has(job.id) ? "Saved ✓" : "Save Job 💾"}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        setSelectedJobForApply(job);
                                        setIsApplyDialogOpen(true);
                                      }}
                                      className={appliedJobs.has(job.id) ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}
                                      disabled={appliedJobs.has(job.id)}
                                    >
                                      {appliedJobs.has(job.id) ? "Applied ✓" : "Apply 📄"}
                                    </Button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900 mb-1">Job Description:</p>
                            <p className="text-sm text-gray-700">{job.description || 'No description provided'}</p>
                          </div>

                          {job.skills && (
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-1">Key Skills:</p>
                              <p className="text-sm text-gray-700">{job.skills || job.keySkills}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              ))
                )
              ) : activeTab === 'saved' ? (
                savedJobsData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">You haven't saved any jobs yet</p>
                    <Button onClick={() => setActiveTab('all')} className="bg-[#008060] hover:bg-[#007055]">
                      Browse Jobs
                    </Button>
                  </div>
                ) : (
                  savedJobsData.map((savedJob) => {
                    const job = savedJob.job;
                    return (
                      <Card key={job.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <img 
                                src={job.company_logo || "/figmaAssets/group-5.png"} 
                                alt="Company"
                                className="w-8 h-8 rounded-full"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-lg font-semibold text-[#008060] mb-1">{job.title}</h3>
                                  <p className="text-sm text-gray-600 mb-2">
                                    Posted by {job.posted_by_user?.username || 'Unknown'}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                    <span>{job.location || 'Remote'}</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                      {job.experience_level || 'All levels'}
                                    </span>
                                    <span>{job.job_type || 'Full-time'} | {job.work_mode || 'On-site'}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={async () => {
                                      try {
                                        const userId = user?.id || localStorage.getItem('userId');
                                        await fetch(`/api/jobs/${job.id}/save`, {
                                          method: 'POST',
                                          headers: { 'user-id': userId || '' }
                                        });
                                        toast({
                                          title: "Success",
                                          description: "Job removed from saved list",
                                        });
                                        fetchSavedAndAppliedJobs();
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to unsave job",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                    className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                  >
                                    Unsave ✗
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedJobForApply(job);
                                      setIsApplyDialogOpen(true);
                                    }}
                                    className={appliedJobs.has(job.id) ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}
                                    disabled={appliedJobs.has(job.id)}
                                  >
                                    {appliedJobs.has(job.id) ? "Applied ✓" : "Apply 📄"}
                                  </Button>
                                </div>
                              </div>
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-900 mb-1">Job Description:</p>
                                <p className="text-sm text-gray-700">{job.description || 'No description provided'}</p>
                              </div>
                              {job.skills && (
                                <div>
                                  <p className="text-sm font-medium text-gray-900 mb-1">Key Skills:</p>
                                  <p className="text-sm text-gray-700">{job.skills}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )
              ) : (
                appliedJobsData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">You haven't applied to any jobs yet</p>
                    <Button onClick={() => setActiveTab('all')} className="bg-[#008060] hover:bg-[#007055]">
                      Browse Jobs
                    </Button>
                  </div>
                ) : (
                  appliedJobsData.map((application) => {
                    const job = application.job;
                    return (
                      <Card key={job.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <img 
                                src={job.company_logo || "/figmaAssets/group-5.png"} 
                                alt="Company"
                                className="w-8 h-8 rounded-full"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-lg font-semibold text-[#008060] mb-1">{job.title}</h3>
                                  <p className="text-sm text-gray-600 mb-2">
                                    Posted by {job.posted_by_user?.username || 'Unknown'}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                    <span>{job.location || 'Remote'}</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                      {job.experience_level || 'All levels'}
                                    </span>
                                    <span>{job.job_type || 'Full-time'} | {job.work_mode || 'On-site'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium text-gray-700">Application Status:</span>
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full capitalize">
                                      {application.status || 'Applied'}
                                    </span>
                                    <span className="text-gray-500">
                                      Applied {new Date(application.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    disabled
                                    className="bg-green-600 text-white"
                                  >
                                    Applied ✓
                                  </Button>
                                </div>
                              </div>
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-900 mb-1">Job Description:</p>
                                <p className="text-sm text-gray-700">{job.description || 'No description provided'}</p>
                              </div>
                              {job.skills && (
                                <div>
                                  <p className="text-sm font-medium text-gray-900 mb-1">Key Skills:</p>
                                  <p className="text-sm text-gray-700">{job.skills}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>

        {/* Edit Job Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) {
            setEditingJob(null);
            // Reset form
            setJobTitle("");
            setJobLocation("");
            setJobType("");
            setIndustry("");
            setYearsOfExperience("");
            setWorkMode("");
            setSkills("");
            setJobDescription("");
            setCompanyName("");
            setCompanyLogo("");
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Edit Job Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* First Row - Job Title, Job Location, Job Type */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Job Title</Label>
                  <Input
                    placeholder="Input clear job titles"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Job Location</Label>
                  <Input
                    placeholder="Input clear job titles"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Job Type</Label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Full Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Second Row - Select Industry, YOE */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Domain of work" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">YOE (if applicable)</Label>
                  <Select value={yearsOfExperience} onValueChange={setYearsOfExperience}>
                    <SelectTrigger>
                      <SelectValue placeholder="N/A" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 years</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5+">5+ years</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Third Row - Work Mode, Skills */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Work Mode</Label>
                  <Select value={workMode} onValueChange={setWorkMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Remote" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Skills</Label>
                  <Input
                    placeholder="Add skills crucial for the job"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Job Description</Label>
                <Textarea
                  placeholder="Add job description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Name</Label>
                <Input
                  placeholder="Input company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="px-6 text-red-500 border-red-500 hover:bg-red-50"
                >
                  Cancel ✗
                </Button>
                <Button
                  onClick={handleUpdateJob}
                  className="px-6 bg-[#008060] hover:bg-[#007055] text-white"
                >
                  Update Job ✓
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Apply Job Dialog */}
        <Dialog open={isApplyDialogOpen} onOpenChange={(isOpen) => {
          setIsApplyDialogOpen(isOpen);
          if (!isOpen) setSelectedJobForApply(null);
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Apply for {selectedJobForApply?.title || 'Job'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p>Are you sure you want to apply for this position?</p>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsApplyDialogOpen(false)}
                  className="px-6 text-red-500 border-red-500 hover:bg-red-50"
                >
                  Cancel ✗
                </Button>
                <Button
                  onClick={handleApplyJob}
                  className="px-6 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Apply ✓
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </AppLayout>
  );
};