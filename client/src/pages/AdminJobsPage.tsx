
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, Trash2, Eye, MapPin, Building2, Calendar } from "lucide-react";

export const AdminJobsPage = (): JSX.Element => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    jobId: string;
    jobTitle: string;
  }>({
    open: false,
    jobId: "",
    jobTitle: "",
  });

  const [viewJobDialog, setViewJobDialog] = useState<{
    open: boolean;
    job: any | null;
  }>({
    open: false,
    job: null,
  });

  // Set page title
  React.useEffect(() => {
    document.title = "Jobs Management - Admin Portal";
  }, []);

  // Fetch all jobs
  useEffect(() => {
    fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const userId = user?.id || localStorage.getItem("userId");
      
      // Fetch all jobs without filters initially
      const response = await fetch("/api/jobs?limit=1000", {
        headers: {
          "user-id": userId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when filters change with debouncing
  useEffect(() => {
    // Skip initial render to prevent double fetch
    if (!jobs.length && !searchTerm && !locationFilter && !typeFilter) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      // The filtering happens automatically via filteredJobs
    }, 300); // 300ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, locationFilter, typeFilter]);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.posted_by_user?.username?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLocation =
      !locationFilter || job.location?.toLowerCase().includes(locationFilter.toLowerCase());

    const matchesType = !typeFilter || job.job_type === typeFilter;

    return matchesSearch && matchesLocation && matchesType;
  });

  // Handle delete job
  const handleDeleteJob = async () => {
    const { jobId } = deleteDialog;

    try {
      const userId = user?.id || localStorage.getItem("userId");
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          "user-id": userId || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      toast({
        title: "Success",
        description: "Job deleted successfully",
      });

      // Remove from local state
      setJobs(jobs.filter((j) => j.id !== jobId));
      setDeleteDialog({ open: false, jobId: "", jobTitle: "" });
    } catch (error) {
      console.error("Delete job error:", error);
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setLocationFilter("");
    setTypeFilter("");
  };

  // Export jobs to CSV
  const exportJobsToCSV = () => {
    const headers = [
      "Job Title",
      "Company",
      "Posted By",
      "Email",
      "Location",
      "Type",
      "Work Mode",
      "Experience Level",
      "Salary Range",
      "Description",
      "Requirements",
      "Skills",
      "Industry",
      "Application URL",
      "Contact Email",
      "Posted On",
      "Application Deadline"
    ];

    const csvData = filteredJobs.map((job) => [
      job.title || "",
      job.company || "",
      job.posted_by_user?.username || "",
      job.posted_by_user?.email || "",
      job.location || "",
      job.job_type || "",
      job.work_mode || "",
      job.experience_level || "",
      job.salary_min && job.salary_max ? `₹${job.salary_min} - ₹${job.salary_max}` : "",
      (job.description || "").replace(/"/g, '""'),
      (job.requirements || "").replace(/"/g, '""'),
      job.skills || "",
      job.industry || "",
      job.application_url || "",
      job.contact_email || "",
      new Date(job.created_at).toLocaleString(),
      job.application_deadline ? new Date(job.application_deadline).toLocaleString() : ""
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobs_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredJobs.length} jobs to CSV`,
    });
  };

  const navItems = [
    { icon: "📊", label: "Dashboard", path: "/admin/dashboard" },
    { icon: "📰", label: "Feed", path: "/admin/feed" },
    { icon: "📅", label: "Events", path: "/admin/events" },
    { icon: "💼", label: "Jobs", path: "/admin/jobs", active: true },
    { icon: "💬", label: "Messages", path: "/admin/messages" },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <div className="hidden lg:flex lg:w-64 xl:w-72 bg-white shadow-xl flex-col border-r border-gray-100">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#008060] to-[#006b51] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">T</span>
            </div>
            <div>
              <span className="font-bold text-[#008060] text-lg block leading-tight">
                The Kalyani School
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Admin Portal
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={item.active ? "default" : "ghost"}
              className={`w-full justify-start rounded-xl px-4 py-3 h-auto font-medium transition-all ${
                item.active
                  ? "bg-gradient-to-r from-[#008060] to-[#006b51] text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[#008060]"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Jobs Management
            </h2>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 border-red-200"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/admin/login";
                }}
              >
                <span className="mr-2">🚪</span>
                Log Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-white overflow-auto">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              All Job Postings
            </h1>
            <p className="text-sm text-gray-600">
              View and manage all job postings on the platform
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Search by title, company, or poster..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Search updates automatically on input change
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  <Select value={locationFilter || undefined} onValueChange={(value) => setLocationFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="pune">Pune</SelectItem>
                      <SelectItem value="mumbai">Mumbai</SelectItem>
                      <SelectItem value="bangalore">Bangalore</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter || undefined} onValueChange={(value) => setTypeFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
                  </span>
                  <Button 
                    onClick={exportJobsToCSV}
                    disabled={filteredJobs.length === 0}
                    className="bg-[#008060] hover:bg-[#006b51] text-white"
                  >
                    <span className="mr-2">📊</span>
                    Export to CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Table */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#008060]" />
                All Jobs ({filteredJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No jobs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Job Title</TableHead>
                        <TableHead className="font-semibold">Company</TableHead>
                        <TableHead className="font-semibold">Posted By</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Posted On</TableHead>
                        <TableHead className="font-semibold text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map((job) => (
                        <TableRow key={job.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-[#008060]">
                            {job.title}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              {job.company}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">
                                {job.posted_by_user?.username || "Unknown"}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {job.posted_by_user?.email || ""}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {job.location || "Not specified"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="capitalize"
                            >
                              {job.job_type || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="w-3 h-3" />
                              {new Date(job.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setViewJobDialog({
                                    open: true,
                                    job: job,
                                  })
                                }
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Job Details Dialog */}
      <Dialog
        open={viewJobDialog.open}
        onOpenChange={(open) =>
          setViewJobDialog({ ...viewJobDialog, open })
        }
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#008060]">
              Job Details
            </DialogTitle>
          </DialogHeader>
          {viewJobDialog.job && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-8 h-8 text-[#008060]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {viewJobDialog.job.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 font-medium">
                      {viewJobDialog.job.company}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {viewJobDialog.job.location || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Job Type</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {viewJobDialog.job.job_type || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Work Mode</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {viewJobDialog.job.work_mode || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Experience Level</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {viewJobDialog.job.experience_level || "N/A"}
                  </p>
                </div>
                {viewJobDialog.job.salary_min && viewJobDialog.job.salary_max && (
                  <div>
                    <p className="text-sm text-gray-500">Salary Range</p>
                    <p className="font-medium text-gray-900">
                      ₹{viewJobDialog.job.salary_min} - ₹{viewJobDialog.job.salary_max}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Posted On</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(viewJobDialog.job.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Posted By</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">
                    {viewJobDialog.job.posted_by_user?.username || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {viewJobDialog.job.posted_by_user?.email || ""}
                  </p>
                </div>
              </div>

              {viewJobDialog.job.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {viewJobDialog.job.description}
                  </p>
                </div>
              )}

              {viewJobDialog.job.requirements && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {viewJobDialog.job.requirements}
                  </p>
                </div>
              )}

              {viewJobDialog.job.skills && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Required Skills</h3>
                  <p className="text-gray-700">{viewJobDialog.job.skills}</p>
                </div>
              )}

              {viewJobDialog.job.industry && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Industry</h3>
                  <Badge variant="outline" className="text-sm">
                    {viewJobDialog.job.industry}
                  </Badge>
                </div>
              )}

              {viewJobDialog.job.application_deadline && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Application Deadline</h3>
                  <p className="text-gray-700">
                    {new Date(viewJobDialog.job.application_deadline).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewJobDialog({ open: false, job: null })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ ...deleteDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Posting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.jobTitle}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, jobId: "", jobTitle: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteJob}
            >
              Delete Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
