import React, { useState, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  UserPlus,
  Calendar,
  Briefcase,
  MessageSquare,
  Activity,
  Home,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export const AdminDashboard = (): JSX.Element => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Set page title
  React.useEffect(() => {
    document.title = "Admin Dashboard - TKS Alumni Portal";
  }, []);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null); // State to hold potential errors
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 50;
  const [editingCell, setEditingCell] = useState<{
    userId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    field: string;
    oldValue: any;
    newValue: any;
  }>({
    open: false,
    userId: "",
    field: "",
    oldValue: "",
    newValue: "",
  });
  const [createAlumniDialog, setCreateAlumniDialog] = useState(false);
  const [createAlumniForm, setCreateAlumniForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    batch: "",
    graduationYear: "",
    course: "",
    branch: "",
    rollNumber: "",
    cgpa: "",
    currentCity: "",
    currentCompany: "",
    currentRole: "",
    linkedinUrl: "",
    gender: "",
  });
  const [creatingAlumni, setCreatingAlumni] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [emailConfirmDialog, setEmailConfirmDialog] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [tempCredentials, setTempCredentials] = useState({ email: "", password: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [blockDialog, setBlockDialog] = useState<{
    open: boolean;
    userId: string;
    username: string;
    currentlyBlocked: boolean;
  }>({
    open: false,
    userId: "",
    username: "",
    currentlyBlocked: false,
  });
  const [signupRequests, setSignupRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    userGrowth: [],
    roleDistribution: [],
    batchDistribution: [],
    activityMetrics: null,
    contentStats: null,
    engagementData: [],
    profileStats: null,
    profileCompletionData: [],
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false); // New state for PDF generation

  // Ref for the analytics content to be captured in PDF
  const analyticsContentRef = useRef<HTMLDivElement>(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const userId = user?.id || localStorage.getItem("userId");
        if (!userId) return;

        // Fetch all data in parallel for faster loading
        const [usersRes, requestsRes] = await Promise.all([
          fetch("/api/admin/users", { headers: { "user-id": userId } }),
          fetch("/api/admin/signup-requests?status=pending", {
            headers: { "user-id": userId },
          }),
        ]);

        if (usersRes.ok) {
          const userData = await usersRes.json();
          processAnalytics(userData);
        }

        if (requestsRes.ok) {
          const reqData = await requestsRes.json();
          setSignupRequests(reqData.requests || []);
        }

        setLoadingRequests(false);
        setLoadingAnalytics(false);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setLoadingAnalytics(false);
        setLoadingRequests(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  // Calculate profile completion percentage for a user
  const calculateProfileCompletion = async (userId: string) => {
    try {
      const response = await fetch(`/api/profile/${userId}`);
      if (!response.ok) return 0;

      const data = await response.json();
      const alumni = data.alumni;

      if (!alumni) return 0;

      const checklistItems = [
        alumni?.profile_picture,
        alumni?.bio,
        alumni?.current_company,
        alumni?.current_position,
        alumni?.location,
        alumni?.linkedin_url,
        alumni?.phone,
        alumni?.skills?.length >= 3,
      ];

      const completedItems = checklistItems.filter(
        (item) => item && item !== "",
      ).length;
      return Math.round((completedItems / checklistItems.length) * 100);
    } catch {
      return 0;
    }
  };

  // Process analytics from user data
  const processAnalytics = async (userData: any[]) => {
    // User growth by month (last 6 months)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString("en-US", { month: "short" }),
        users: 0,
      };
    });

    userData.forEach((user) => {
      const userDate = new Date(user.created_at);
      const monthsAgo = Math.floor(
        (Date.now() - userDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );
      if (monthsAgo < 6) {
        last6Months[5 - monthsAgo].users++;
      }
    });

    // Role distribution
    const roles = userData.reduce((acc: any, user) => {
      const role = user.user_role || "alumni";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const roleDistribution = Object.entries(roles).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill:
        name === "alumni"
          ? "#008060"
          : name === "student"
            ? "#00a078"
            : name === "faculty"
              ? "#00b88f"
              : "#33c9a8",
    }));

    // Activity metrics
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000; // 7 days
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000; // 30 days

    const activityMetrics = {
      activeToday: userData.filter(
        (u) => new Date(u.updated_at).getTime() > dayAgo,
      ).length,
      activeWeek: userData.filter(
        (u) => new Date(u.updated_at).getTime() > weekAgo,
      ).length,
      activeMonth: userData.filter(
        (u) => new Date(u.updated_at).getTime() > monthAgo,
      ).length,
      newToday: userData.filter(
        (u) => new Date(u.created_at).getTime() > dayAgo,
      ).length,
      newWeek: userData.filter(
        (u) => new Date(u.created_at).getTime() > weekAgo,
      ).length,
      newMonth: userData.filter(
        (u) => new Date(u.created_at).getTime() > monthAgo,
      ).length,
    };

    // Profile completion analysis (fetch alumni data)
    try {
      const alumniResponse = await fetch("/api/alumni/search?limit=1000", {
        headers: {
          "user-id": user?.id || localStorage.getItem("userId") || "",
        },
      });

      let profileStats = { complete: 0, partial: 0, incomplete: 0 };

      if (alumniResponse.ok) {
        const alumniData = await alumniResponse.json();
        const allAlumni = alumniData.alumni || [];

        allAlumni.forEach((alumni: any) => {
          const checklistItems = [
            alumni?.profile_picture,
            alumni?.bio,
            alumni?.current_company,
            alumni?.current_position,
            alumni?.location,
            alumni?.linkedin_url,
            alumni?.phone,
            alumni?.skills?.length >= 3,
          ];

          const completedItems = checklistItems.filter(
            (item) => item && item !== "",
          ).length;
          const completionPercentage = Math.round(
            (completedItems / checklistItems.length) * 100,
          );

          if (completionPercentage === 100) {
            profileStats.complete++;
          } else if (completionPercentage >= 50) {
            profileStats.partial++;
          } else {
            profileStats.incomplete++;
          }
        });
      }

      setAnalytics({
        userGrowth: last6Months,
        roleDistribution,
        activityMetrics,
        profileStats,
        engagementData: [
          {
            name: "Active",
            value: activityMetrics.activeMonth,
            fill: "#008060",
          },
          {
            name: "Inactive",
            value: userData.length - activityMetrics.activeMonth,
            fill: "#e5e7eb",
          },
        ],
        profileCompletionData: [
          {
            name: "Complete (100%)",
            value: profileStats.complete,
            fill: "#22c55e",
          },
          {
            name: "Partial (50-99%)",
            value: profileStats.partial,
            fill: "#f59e0b",
          },
          {
            name: "Incomplete (<50%)",
            value: profileStats.incomplete,
            fill: "#ef4444",
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching profile completion data:", error);
      setAnalytics({
        userGrowth: last6Months,
        roleDistribution,
        activityMetrics,
        engagementData: [
          {
            name: "Active",
            value: activityMetrics.activeMonth,
            fill: "#008060",
          },
          {
            name: "Inactive",
            value: userData.length - activityMetrics.activeMonth,
            fill: "#e5e7eb",
          },
        ],
      });
    }
  };

  // Handle signup request approval
  const handleApproveRequest = async (requestId: string) => {
    try {
      const userId = user?.id || localStorage.getItem("userId");

      console.log("Approving signup request:", requestId);

      const response = await fetch(
        `/api/admin/signup-requests/${requestId}/approve`,
        {
          method: "POST",
          headers: {
            "user-id": userId || "",
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        console.log("Approval successful:", data);

        toast({
          title: "Request Approved",
          description: (
            <div className="flex flex-col gap-2">
              <p>
                Credentials: {data.credentials.email} /{" "}
                {data.credentials.temporaryPassword}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${data.credentials.email} / ${data.credentials.temporaryPassword}`,
                  );
                  toast({
                    title: "Copied!",
                    description: "Credentials copied to clipboard",
                    duration: 2000,
                  });
                }}
                className="w-fit bg-white hover:bg-gray-100 text-xs"
              >
                📋 Copy Credentials
              </Button>
            </div>
          ),
          duration: 10000,
        });

        // Remove from pending list immediately
        setSignupRequests((prev) => prev.filter((r) => r.id !== requestId));

        // Refresh the users list to show the new user
        const refreshResponse = await fetch("/api/admin/users", {
          headers: {
            "user-id": userId || "",
          },
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setUsers(refreshData);
        }
      } else {
        console.error("Approval failed:", data);
        throw new Error(data.error || "Failed to approve request");
      }
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    }
  };

  // Handle signup request rejection
  const handleRejectRequest = async (requestId: string) => {
    try {
      const userId = user?.id || localStorage.getItem("userId");
      const response = await fetch(
        `/api/admin/signup-requests/${requestId}/reject`,
        {
          method: "POST",
          headers: {
            "user-id": userId || "",
          },
        },
      );

      if (response.ok) {
        toast({
          title: "Request Rejected",
          description: "Signup request has been rejected",
        });

        // Remove from list
        setSignupRequests(signupRequests.filter((r) => r.id !== requestId));
      } else {
        throw new Error("Failed to reject request");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    }
  };

  // Fetch users from the database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Try to get user ID from context first, then from localStorage
        const userId = user?.id || localStorage.getItem("userId");

        if (!userId) {
          console.error("No user ID available for fetching users");
          setError("Authentication required. Please log in again.");
          toast({
            title: "Session Error",
            description: "Your session is invalid. Please log in again.",
            variant: "destructive",
          });
          // Redirect to admin login
          setTimeout(() => setLocation("/admin/login"), 2000);
          return;
        }

        console.log("Fetching users with user ID:", userId);
        const response = await fetch("/api/admin/users", {
          headers: {
            "user-id": userId,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Authentication failed. Please log in again.");
            toast({
              title: "Authentication Error",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
            setLocation("/"); // Redirect to login page
          } else {
            throw new Error("Failed to fetch users");
          }
          return; // Stop execution if response is not OK
        }

        const data = await response.json();
        setUsers(data);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        setError(error.message || "An unexpected error occurred.");
        toast({
          title: "Error",
          description: "Failed to load users data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [toast, user, setLocation]); // Added user and setLocation to dependency array

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.user_role === roleFilter;

    const matchesAdmin =
      adminFilter === "all" ||
      (adminFilter === "admin" && user.is_admin) ||
      (adminFilter === "regular" && !user.is_admin);

    let matchesDate = true;
    if (dateFilter !== "all") {
      const userDate = new Date(user.created_at);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - userDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dateFilter === "today") matchesDate = daysDiff === 0;
      else if (dateFilter === "week") matchesDate = daysDiff <= 7;
      else if (dateFilter === "month") matchesDate = daysDiff <= 30;
      else if (dateFilter === "year") matchesDate = daysDiff <= 365;
    }

    return matchesSearch && matchesRole && matchesAdmin && matchesDate;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setAdminFilter("all");
    setDateFilter("all");
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Auto-search when filters change with debouncing
  useEffect(() => {
    // Skip initial render to prevent double fetch
    if (!users.length && !searchTerm && roleFilter === 'all' && adminFilter === 'all' && dateFilter === 'all') {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1);
      // The filtering happens automatically via filteredUsers
    }, 300); // 300ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, roleFilter, adminFilter, dateFilter]);

  // Handle cell click to start editing
  const handleCellClick = (
    userId: string,
    field: string,
    currentValue: any,
  ) => {
    setEditingCell({ userId, field });
    setEditValue(currentValue || "");
  };

  // Handle edit value change
  const handleEditChange = (value: string) => {
    setEditValue(value);
  };

  // Handle edit submit - immediately show confirmation dialog
  const handleEditSubmit = (userId: string, field: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const oldValue = user[field as keyof typeof user];

    // Don't show dialog if value hasn't changed
    if (oldValue === editValue) {
      setEditingCell(null);
      return;
    }

    // Immediately show confirmation dialog
    setConfirmDialog({
      open: true,
      userId,
      field,
      oldValue,
      newValue: editValue,
    });
  };

  // Validation functions
  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) return 'This field is required';
        if (!/^[A-Za-z\s]+$/.test(value)) return 'Only letters and spaces allowed';
        if (value.length < 2) return 'Must be at least 2 characters';
        return '';

      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return '';

      case 'phone':
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) return 'Invalid phone format';
        if (value && value.replace(/\D/g, '').length < 10) return 'Phone must be at least 10 digits';
        return '';

      case 'graduationYear':
        if (!value) return 'Graduation year is required';
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < 1950 || year > currentYear) {
          return `Year must be between 1950 and ${currentYear}`;
        }
        return '';

      case 'cgpa':
        if (value) {
          const cgpa = parseFloat(value);
          if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) return 'CGPA must be between 0 and 10';
        }
        return '';

      case 'linkedinUrl':
        if (value && !/^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|company)\/.+$/i.test(value)) {
          return 'Invalid LinkedIn URL';
        }
        return '';

      case 'gender':
        if (!value) return 'Gender is required';
        return '';

      default:
        return '';
    }
  };

  // Handle field change with validation
  const handleAlumniFieldChange = (field: string, value: string) => {
    setCreateAlumniForm({ ...createAlumniForm, [field]: value });

    // Validate immediately
    const error = validateField(field, value);
    setFormErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Check if form is valid
  const isFormValid = (): boolean => {
    const requiredFields = ['firstName', 'lastName', 'email', 'graduationYear', 'gender'];

    // Check required fields are filled
    for (const field of requiredFields) {
      if (!createAlumniForm[field as keyof typeof createAlumniForm]) {
        return false;
      }
    }

    // Check no errors exist
    for (const field in createAlumniForm) {
      const error = validateField(field, createAlumniForm[field as keyof typeof createAlumniForm]);
      if (error) return false;
    }

    return true;
  };

  // Handle create alumni account
  const handleCreateAlumni = async () => {
    // Get user ID from context or localStorage
    const adminUserId = user?.id || localStorage.getItem("userId");

    console.log("Create alumni - Admin User ID:", adminUserId);

    if (!adminUserId) {
      toast({
        title: "Authentication Error",
        description: "Admin session not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (
      !createAlumniForm.firstName ||
      !createAlumniForm.lastName ||
      !createAlumniForm.email ||
      !createAlumniForm.graduationYear
    ) {
      toast({
        title: "Validation Error",
        description:
          "Please fill in all required fields (First Name, Last Name, Email, Graduation Year)",
        variant: "destructive",
      });
      return;
    }

    // Validate name format
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(createAlumniForm.firstName)) {
      toast({
        title: "Validation Error",
        description: "First name should contain only letters and spaces",
        variant: "destructive",
      });
      return;
    }
    if (!nameRegex.test(createAlumniForm.lastName)) {
      toast({
        title: "Validation Error",
        description: "Last name should contain only letters and spaces",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createAlumniForm.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Validate graduation year
    const currentYear = new Date().getFullYear();
    const gradYear = parseInt(createAlumniForm.graduationYear);
    if (isNaN(gradYear) || gradYear < 1950 || gradYear > currentYear) {
      toast({
        title: "Validation Error",
        description: `Graduation year must be between 1950 and ${currentYear}`,
        variant: "destructive",
      });
      return;
    }

    // Validate phone if provided
    if (createAlumniForm.phone && createAlumniForm.phone.length > 0) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(createAlumniForm.phone)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid phone number",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate CGPA if provided
    if (createAlumniForm.cgpa && createAlumniForm.cgpa.length > 0) {
      const cgpa = parseFloat(createAlumniForm.cgpa);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        toast({
          title: "Validation Error",
          description: "CGPA must be between 0 and 10",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate LinkedIn URL if provided
    if (createAlumniForm.linkedinUrl && createAlumniForm.linkedinUrl.length > 0) {
      const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|company)\/.+$/i;
      if (!linkedinRegex.test(createAlumniForm.linkedinUrl)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid LinkedIn URL",
          variant: "destructive",
        });
        return;
      }
    }

    setCreatingAlumni(true);

    try {
      console.log("Sending create alumni request with user-id:", adminUserId);

      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": adminUserId,
        },
        body: JSON.stringify(createAlumniForm),
      });

      console.log("Create alumni response status:", response.status);
      const data = await response.json();
      console.log("Create alumni response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to create alumni account");
      }

      // Store credentials temporarily
      setTempCredentials({
        email: data.credentials.email,
        password: data.credentials.temporaryPassword
      });

      // Use the login URL from the server response
      const loginUrl = data.loginUrl || 'https://tks-new-production.up.railway.app/login';

      const defaultEmailContent = `Dear ${createAlumniForm.firstName} ${createAlumniForm.lastName},

Welcome to The Kalyani School Alumni Portal!

Your account has been successfully created by the administrator. Here are your login credentials:

Email: ${data.credentials.email}
Temporary Password: ${data.credentials.temporaryPassword}

Please use these credentials to log in to the alumni portal at: ${loginUrl}

For security reasons, we recommend that you change your password after your first login.

If you have any questions or need assistance, please don't hesitate to contact the alumni office.

Best regards,
The Kalyani School Alumni Team`;

      setEmailContent(defaultEmailContent);

      // Close create dialog and show email confirmation
      setCreateAlumniDialog(false);
      setEmailConfirmDialog(true);

      // Refresh user list
      const refreshResponse = await fetch("/api/admin/users", {
        headers: {
          "user-id": adminUserId,
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setUsers(refreshData);
      }
    } catch (error: any) {
      console.error("Error creating alumni:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create alumni account",
        variant: "destructive",
      });
    } finally {
      setCreatingAlumni(false);
    }
  };

  // Handle sending email with credentials
  const handleSendCredentialsEmail = async () => {
    setSendingEmail(true);

    try {
      const adminUserId = user?.id || localStorage.getItem("userId");

      const response = await fetch("/api/admin/send-credentials-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": adminUserId || "",
        },
        body: JSON.stringify({
          recipientEmail: tempCredentials.email,
          recipientName: `${createAlumniForm.firstName} ${createAlumniForm.lastName}`,
          emailContent: emailContent,
          credentials: tempCredentials
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      // Close email dialog
      setEmailConfirmDialog(false);

      // Show success message with copy option
      toast({
        title: "Credentials Sent!",
        description: (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Credentials have been sent to {tempCredentials.email}</p>
            <div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs font-mono">
              <p><strong>Email:</strong> {tempCredentials.email}</p>
              <p><strong>Password:</strong> {tempCredentials.password}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(
                  `Email: ${tempCredentials.email}\nPassword: ${tempCredentials.password}`
                );
                toast({
                  title: "Copied!",
                  description: "Credentials copied to clipboard",
                  duration: 2000,
                });
              }}
              className="w-fit bg-white hover:bg-gray-100 text-xs"
            >
              📋 Copy Credentials
            </Button>
          </div>
        ),
        duration: 12000,
      });

      // Reset form
      setCreateAlumniForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        batch: "",
        graduationYear: "",
        course: "",
        branch: "",
        rollNumber: "",
        cgpa: "",
        currentCity: "",
        currentCompany: "",
        currentRole: "",
        linkedinUrl: "",
        gender: "",
      });
      setTempCredentials({ email: "", password: "" });
      setEmailContent("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Email Error",
        description: error.message || "Failed to send credentials email",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle confirmed update
  const handleConfirmedUpdate = async () => {
    const { userId, field, newValue } = confirmDialog;

    try {
      // Optimistically update UI
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, [field]: newValue } : u)),
      );

      const response = await fetch(`/api/admin/users/${userId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "user-id": user?.id || localStorage.getItem("userId") || "",
        },
        body: JSON.stringify({
          field,
          value: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      toast({
        title: "Success",
        description: `${field} updated successfully`,
      });
    } catch (error) {
      console.error("Error updating user:", error);

      // Revert optimistic update on error
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, [field]: confirmDialog.oldValue } : u,
        ),
      );

      toast({
        title: "Error",
        description: `Failed to update ${field}`,
        variant: "destructive",
      });
    } finally {
      setConfirmDialog({
        open: false,
        userId: "",
        field: "",
        oldValue: "",
        newValue: "",
      });
      setEditingCell(null);
    }
  };

  // Handle dialog cancel - reset to original value
  const handleCancelUpdate = () => {
    setConfirmDialog({
      open: false,
      userId: "",
      field: "",
      oldValue: "",
      newValue: "",
    });
    setEditingCell(null);
  };

  // Handle block/unblock account
  const handleBlockAccount = async () => {
    const { userId, currentlyBlocked } = blockDialog;
    const newBlockedStatus = !currentlyBlocked;

    // Get admin user ID
    const adminUserId = user?.id || localStorage.getItem("userId");

    if (!adminUserId) {
      toast({
        title: "Authentication Error",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setLocation("/admin/login");
      return;
    }

    try {
      console.log("Block account request - Admin User ID:", adminUserId);

      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "user-id": adminUserId,
        },
        body: JSON.stringify({
          accountBlocked: newBlockedStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update block status");
      }

      // Update local state with the exact value from the server response
      setUsers(
        users.map((u) =>
          u.id === userId
            ? {
                ...u,
                account_blocked: data.user?.account_blocked || newBlockedStatus,
              }
            : u,
        ),
      );

      toast({
        title: "Success",
        description: newBlockedStatus
          ? "Account has been blocked successfully"
          : "Account has been unblocked successfully",
      });

      setBlockDialog({
        open: false,
        userId: "",
        username: "",
        currentlyBlocked: false,
      });
    } catch (error: any) {
      console.error("Error updating block status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update account block status",
        variant: "destructive",
      });
    }
  };

  // Export filtered users to CSV
  const exportToCSV = () => {
    const headers = [
      "Username",
      "Email",
      "Role",
      "Admin Status",
      "Created At",
      "Updated At",
    ];
    const csvData = filteredUsers.map((user) => [
      user.username,
      user.email,
      user.user_role || "Alumni",
      user.is_admin ? "Yes" : "No",
      new Date(user.created_at).toLocaleString(),
      new Date(user.updated_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredUsers.length} users to CSV`,
    });
  };

  // Export filtered users to JSON
  const exportToJSON = () => {
    const jsonData = JSON.stringify(filteredUsers, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredUsers.length} users to JSON`,
    });
  };

  // Generate PDF report - Works across all tabs
  const generateAnalyticsReport = async () => {
    if (loadingAnalytics) {
      toast({
        title: "Please wait",
        description: "Charts are still loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingPDF(true);

    try {
      // Create a temporary container to render all charts
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '800px';
      document.body.appendChild(tempContainer);

      // Clone all chart sections to the temporary container
      const chartIds = [
        'userGrowthChart',
        'roleDistributionChart',
        'profileCompletionChart',
        'engagementChart',
        'activitySummary'
      ];

      // Find and clone chart elements
      const chartElements: { element: HTMLElement; name: string }[] = [];

      for (const chartId of chartIds) {
        const originalElement = document.getElementById(chartId);
        if (originalElement) {
          const clone = originalElement.cloneNode(true) as HTMLElement;
          clone.id = `temp-${chartId}`;
          tempContainer.appendChild(clone);

          chartElements.push({
            element: clone,
            name: chartId
              .replace('Chart', '')
              .replace(/([A-Z])/g, ' $1')
              .trim()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
          });
        }
      }

      // Wait for any charts to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add title page
      pdf.setFontSize(24);
      pdf.text('Analytics Report', pageWidth / 2, 30, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 40, { align: 'center' });

      let currentY = 60;

      for (const { element, name } of chartElements) {
        try {
          // Capture chart as image
          const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 20;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Check if we need a new page
          if (currentY + imgHeight + 20 > pageHeight) {
            pdf.addPage();
            currentY = 20;
          }

          // Add chart title
          pdf.setFontSize(14);
          pdf.text(name, 10, currentY);
          currentY += 8;

          // Add image
          pdf.addImage(imgData, 'PNG', 10, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 15;

        } catch (error) {
          console.error(`Error capturing ${name}:`, error);
        }
      }

      // Clean up temporary container
      document.body.removeChild(tempContainer);

      // Download PDF
      pdf.save(`analytics-report-${new Date().getTime()}.pdf`);

      toast({
        title: "PDF Generated!",
        description: "Your analytics report has been downloaded successfully.",
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Stats data
  const stats = {
    totalAlumni: users.length,
    newRegistrations: 67,
    upcomingEvents: 5,
    pendingApprovals: {
      profiles: 14,
      jobs: 14,
      feed: 14,
      events: 14,
    },
  };

  // Regional data for alumni distribution
  const regionalData = [
    { region: "IN", count: 947, label: "IN – 947 Alumni", color: "#008060" },
    { region: "AUS", count: 63, label: "AUS – 63 Alumni", color: "#00a078" },
    { region: "USA", count: 57, label: "USA – 57 Alumni", color: "#00b88f" },
    { region: "UAE", count: 41, label: "UAE – 41 Alumni", color: "#33c9a8" },
    { region: "UK", count: 32, label: "UK – 32 Alumni", color: "#66d9bd" },
    { region: "UAE", count: 26, label: "UAE – 26 Alumni", color: "#99e8d2" },
    {
      region: "Others",
      count: 20,
      label: "Others – 20 Alumni",
      color: "#ccf4e7",
    },
  ];

  const maxCount = Math.max(...regionalData.map((r) => r.count));

  const navItems = [
    { icon: "📊", label: "Dashboard", path: "/admin/dashboard", active: true },
    { icon: "📰", label: "Feed", path: "/admin/feed", active: false },
    { icon: "📅", label: "Events", path: "/admin/events", active: false },
    { icon: "💬", label: "Messages", path: "/admin/messages", active: false },
  ];

  const bottomNavItems = [
    { icon: "⚙️", label: "Settings", path: "/admin/settings" },
    { icon: "🚪", label: "Log Out", path: "/" },
  ];

  // Automatic logout on tab close (but not on refresh)
  useEffect(() => {
    // Mark that we're in an active admin session
    sessionStorage.setItem('adminActive', 'true');

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only clear localStorage if this is a tab close (not a refresh)
      // On refresh, sessionStorage persists briefly
      if (!sessionStorage.getItem('navigating')) {
        // This is a tab close, not a navigation/refresh
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
      }
    };

    // Track navigation events (refresh/route changes)
    const handleNavigation = () => {
      sessionStorage.setItem('navigating', 'true');
      setTimeout(() => sessionStorage.removeItem('navigating'), 100);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // Session monitoring - ensure user stays logged in
  useEffect(() => {
    // Periodically check if session is still valid
    const checkSession = () => {
      const storedUserId = localStorage.getItem("userId");
      const storedUser = localStorage.getItem("user");

      if (!storedUserId || !storedUser) {
        console.warn("Admin session lost, redirecting to login");
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setLocation("/admin/login");
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSession, 30000);

    return () => clearInterval(interval);
  }, [toast, setLocation]);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <AdminSidebar currentPage="dashboard" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                User Management
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all duration-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border-red-200"
                onClick={() => {
                  // Clear all local storage
                  localStorage.clear();
                  // Redirect to main page
                  window.location.href = "/admin/login";
                }}
              >
                <span className="mr-1 sm:mr-2">🚪</span>
                <span className="hidden sm:inline">Log Out</span>
              </Button>
              <div className="hidden md:flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">
                    {user?.username || "Admin"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    Administrator
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#008060] to-[#006b51] rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-sm sm:text-base">
                    {user?.username?.charAt(0).toUpperCase() || "A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-5 bg-gradient-to-br from-gray-50 to-white overflow-auto">
          {/* Page Title */}
          <div className="mb-3 sm:mb-4 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  User Management
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  View and manage all registered users
                </p>
              </div>
              <Button
                onClick={() => {
                  setCreateAlumniDialog(true);
                  setFormErrors({});
                }}
                className="bg-gradient-to-r from-[#008060] to-[#006b51] hover:from-[#006b51] hover:to-[#005d47] text-white shadow-lg"
              >
                <span className="mr-2">➕</span>
                Create Alumni Account
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-destructive bg-destructive/10 shadow-xl animate-fade-up">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-destructive text-xl">⚠️</span>
                  <p className="text-destructive font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signup Requests in Users Tab */}
          {signupRequests.length > 0 && (
            <Card className="mb-4 border-0 shadow-lg bg-gradient-to-br from-amber-50 to-white animate-fade-up">
              <CardHeader className="p-3 sm:p-4 border-b border-amber-100">
                <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>📋</span>
                  Pending Signup Requests ({signupRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {loadingRequests ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:-mx-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-50">
                          <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm">
                            Name
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden sm:table-cell">
                            Email
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm">
                            Year
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden md:table-cell">
                            Batch
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden lg:table-cell">
                            Phone
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {signupRequests.map((request) => (
                          <TableRow
                            key={request.id}
                            className="hover:bg-amber-50/50"
                          >
                            <TableCell className="font-medium text-gray-900 text-xs sm:text-sm">
                              {request.first_name} {request.last_name}
                            </TableCell>
                            <TableCell className="text-gray-700 text-xs sm:text-sm hidden sm:table-cell truncate max-w-[150px]">
                              {request.email}
                            </TableCell>
                            <TableCell className="text-gray-700 text-xs sm:text-sm">
                              {request.graduation_year}
                            </TableCell>
                            <TableCell className="text-gray-700 text-xs sm:text-sm hidden md:table-cell">
                              {request.batch || "-"}
                            </TableCell>
                            <TableCell className="text-gray-700 text-xs sm:text-sm hidden lg:table-cell">
                              {request.phone || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleApproveRequest(request.id)
                                  }
                                  className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1"
                                >
                                  ✓ Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleRejectRequest(request.id)
                                  }
                                  className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-3 py-1"
                                >
                                  ✗ Reject
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
          )}

          {/* Analytics Dashboard */}
          <Tabs defaultValue="overview" className="mb-4">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="overview">📊 Overview</TabsTrigger>
              <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
              <TabsTrigger value="users">👥 Users</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Informational Notice */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    <strong>Tip:</strong> Click on the <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs">ℹ️</span> icon next to each chart title to understand the calculation logic and data sources.
                  </span>
                </p>
              </div>

              {/* Export Analytics Button */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Export Options:
                    </span>
                    <Button
                      onClick={generateAnalyticsReport}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loadingAnalytics || generatingPDF}
                      title={loadingAnalytics ? "Please wait for charts to load" : generatingPDF ? "Generating PDF..." : "Export analytics to PDF"}
                    >
                      <span className="mr-2">📄</span>
                      {generatingPDF
                        ? "Generating PDF..."
                        : loadingAnalytics
                        ? "Loading Charts..."
                        : "Export Analytics PDF"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-all">
                  <CardHeader className="pb-2 p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold text-gray-600">
                        Total Users
                      </CardTitle>
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {users.length}
                    </div>
                    {analytics.activityMetrics && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3" />+
                        {analytics.activityMetrics.newMonth} this month
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition-all">
                  <CardHeader className="pb-2 p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold text-gray-600">
                        Active Users
                      </CardTitle>
                      <Activity className="w-4 h-4 text-green-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics.activityMetrics?.activeMonth || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white hover:shadow-xl transition-all">
                  <CardHeader className="pb-2 p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold text-gray-600">
                        Pending Requests
                      </CardTitle>
                      <UserPlus className="w-4 h-4 text-purple-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {signupRequests.length}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Awaiting approval
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-white hover:shadow-xl transition-all">
                  <CardHeader className="pb-2 p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold text-gray-600">
                        Admin Users
                      </CardTitle>
                      <UserCheck className="w-4 h-4 text-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-gray-900">
                      {users.filter((u) => u.is_admin).length}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Administrators</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* User Growth Chart */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#008060]" />
                      User Growth Trend
                      <div className="relative group">
                        <span className="text-sm cursor-help bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center">ℹ️</span>
                        <div className="absolute hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl -top-2 left-8">
                          <p className="font-semibold mb-1">Calculation Method:</p>
                          <p>Shows new user registrations over the last 6 months. Each data point represents the number of users who created accounts in that specific month, based on their account creation date.</p>
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="userGrowthChart">
                    {loadingAnalytics ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={analytics.userGrowth}>
                          <defs>
                            <linearGradient
                              id="colorUsers"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#008060"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#008060"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="month"
                            stroke="#666"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis stroke="#666" style={{ fontSize: "12px" }} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="users"
                            stroke="#008060"
                            fillOpacity={1}
                            fill="url(#colorUsers)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Role Distribution Chart */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#008060]" />
                      User Role Distribution
                      <div className="relative group">
                        <span className="text-sm cursor-help bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center">ℹ️</span>
                        <div className="absolute hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl -top-2 left-8">
                          <p className="font-semibold mb-1">Calculation Method:</p>
                          <p>Distribution based on the 'user_role' field in the database. Shows the count of Alumni, Student, Faculty, and Administrator accounts. Users without a role are categorized as Alumni by default.</p>
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="roleDistributionChart">
                    {loadingAnalytics ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={analytics.roleDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {analytics.roleDistribution.map(
                                (entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ),
                              )}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                          {analytics.roleDistribution.map((entry: any, index: number) => (
                            <div key={`legend-${index}`} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="text-xs text-gray-600">
                                {entry.name}: {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Profile Completion Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#008060]" />
                    Profile Completion Status
                    <div className="relative group">
                      <span className="text-sm cursor-help bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center">ℹ️</span>
                      <div className="absolute hidden group-hover:block z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl -top-2 left-8">
                        <p className="font-semibold mb-1">Calculation Method:</p>
                        <p>Profiles are scored based on 8 key fields: Profile Picture, Bio, Company, Position, Location, LinkedIn, Phone, and Skills (3+ items).
                        <br/><br/>
                        <strong>Complete (100%):</strong> All 8 fields filled
                        <br/><strong>Partial (50-99%):</strong> 4-7 fields filled
                        <br/><strong>Incomplete (&lt;50%):</strong> 0-3 fields filled</p>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent id="profileCompletionChart">
                  {loadingAnalytics ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
                    </div>
                  ) : analytics.profileCompletionData?.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analytics.profileCompletionData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#666"
                            style={{ fontSize: "11px" }}
                            angle={-15}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis stroke="#666" style={{ fontSize: "12px" }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {analytics.profileCompletionData.map(
                              (entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ),
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="space-y-4 flex flex-col justify-center">
                        <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-600">
                                Complete Profiles
                              </p>
                              <p className="text-2xl font-bold text-green-600">
                                {analytics.profileStats?.complete || 0}
                              </p>
                            </div>
                            <div className="text-3xl">✅</div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            100% profile completion
                          </p>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-600">
                                Partial Profiles
                              </p>
                              <p className="text-2xl font-bold text-orange-600">
                                {analytics.profileStats?.partial || 0}
                              </p>
                            </div>
                            <div className="text-3xl">⚠️</div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            50-99% profile completion
                          </p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-600">
                                Incomplete Profiles
                              </p>
                              <p className="text-2xl font-bold text-red-600">
                                {analytics.profileStats?.incomplete || 0}
                              </p>
                            </div>
                            <div className="text-3xl">❌</div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Less than 50% complete
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-gray-500">No profile data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats Row */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      Today's Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">New Users</span>
                      <span className="text-lg font-bold text-indigo-600">
                        {analytics.activityMetrics?.newToday || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Active Now</span>
                      <span className="text-lg font-bold text-indigo-600">
                        {analytics.activityMetrics?.activeToday || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">New Users</span>
                      <span className="text-lg font-bold text-teal-600">
                        {analytics.activityMetrics?.newWeek || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">
                        Active Users
                      </span>
                      <span className="text-lg font-bold text-teal-600">
                        {analytics.activityMetrics?.activeWeek || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      Engagement Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-amber-600">
                        {users.length > 0
                          ? Math.round(
                              ((analytics.activityMetrics?.activeMonth || 0) /
                                users.length) *
                                100,
                            )
                          : 0}
                        %
                      </span>
                      <span className="text-xs text-gray-500 mb-1">
                        monthly active
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">
                      Profile Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Complete</span>
                      <span className="text-lg font-bold text-green-600">
                        {analytics.profileStats?.complete || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Partial</span>
                      <span className="text-lg font-bold text-orange-600">
                        {analytics.profileStats?.partial || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              {/* Informational Notice */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <span>
                    <strong>Tip:</strong> Click on the <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs">ℹ️</span> icon next to each chart title to understand the calculation logic and data sources.
                  </span>
                </p>
              </div>

              {/* Export Analytics Button */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Export Options:
                    </span>
                    <Button
                      onClick={generateAnalyticsReport}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loadingAnalytics || generatingPDF}
                      title={loadingAnalytics ? "Please wait for charts to load" : generatingPDF ? "Generating PDF..." : "Export analytics to PDF"}
                    >
                      <span className="mr-2">📄</span>
                      {generatingPDF
                        ? "Generating PDF..."
                        : loadingAnalytics
                        ? "Loading Charts..."
                        : "Export Analytics PDF"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Engagement Chart */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      User Engagement
                      <div className="relative group">
                        <span className="text-sm cursor-help bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center">ℹ️</span>
                        <div className="absolute hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl -top-2 left-8">
                          <p className="font-semibold mb-1">Calculation Method:</p>
                          <p>Active users are those who have logged in or updated their profile in the last 30 days. Inactive users haven't performed any activity in the past month.</p>
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="engagementChart">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={analytics.engagementData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          minAngle={15}
                        >
                          {analytics.engagementData.map(
                            (entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ),
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#008060] rounded-full"></div>
                        <span className="text-xs text-gray-600">
                          Active ({analytics.engagementData[0]?.value || 0})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                        <span className="text-xs text-gray-600">
                          Inactive ({analytics.engagementData[1]?.value || 0})
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Summary */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      Activity Summary
                      <div className="relative group">
                        <span className="text-sm cursor-help bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center">ℹ️</span>
                        <div className="absolute hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl -top-2 left-8">
                          <p className="font-semibold mb-1">Calculation Method:</p>
                          <p><strong>New This Month:</strong> Users created in the last 30 days<br/>
                          <strong>Active This Week:</strong> Users with activity (login/profile update) in the last 7 days<br/>
                          <strong>Total Registered:</strong> All users in the system</p>
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="activitySummary" className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">
                            New This Month
                          </p>
                          <p className="text-xl font-bold text-gray-900">
                            {analytics.activityMetrics?.newMonth || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Activity className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">
                            Active This Week
                          </p>
                          <p className="text-xl font-bold text-gray-900">
                            {analytics.activityMetrics?.activeWeek || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">
                            Total Registered
                          </p>
                          <p className="text-xl font-bold text-gray-900">
                            {users.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              {/* Filters and Search Card */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-fade-up">
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3">
                    {/* Search Bar */}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base">
                        🔍
                      </span>
                      <Input
                        type="text"
                        placeholder="Search users by name, email, or batch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            // Search updates automatically on input change
                          }
                        }}
                        className="pl-10 w-full border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/20 focus:border-[#008060] text-sm sm:text-base"
                      />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap gap-3 items-center">
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Filter by Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="administrator">
                            Administrator
                          </SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="alumni">Alumni</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={adminFilter}
                        onValueChange={setAdminFilter}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Admin Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="admin">Admin Only</SelectItem>
                          <SelectItem value="regular">Regular Users</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">Last 7 Days</SelectItem>
                          <SelectItem value="month">Last 30 Days</SelectItem>
                          <SelectItem value="year">Last Year</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="text-[#008060] hover:bg-[#008060]/10 border-[#008060]"
                      >
                        Clear Filters
                      </Button>
                    </div>

                    {/* Results Count */}
                    <div className="flex items-center pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        Showing {startIndex + 1}-
                        {Math.min(endIndex, filteredUsers.length)} of{" "}
                        {filteredUsers.length} user
                        {filteredUsers.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export Options for Users Tab */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-sm font-semibold text-gray-700">
                      Export Options:
                    </span>
                    <Button
                      onClick={exportToCSV}
                      className="bg-[#008060] hover:bg-[#006b51] text-white"
                      disabled={filteredUsers.length === 0}
                    >
                      <span className="mr-2">📊</span>
                      Export users to CSV
                    </Button>
                    <Button
                      onClick={exportToJSON}
                      variant="outline"
                      className="border-[#008060] text-[#008060] hover:bg-[#008060]/10"
                      disabled={filteredUsers.length === 0}
                    >
                      <span className="mr-2">📄</span>
                      Export users to JSON
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Users Table */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-fade-up-delay-4">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>👥</span>
                    Registered Users
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8 sm:py-12">
                      <div className="flex flex-col items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
                        <p className="text-gray-600 text-sm sm:text-base">
                          Loading users...
                        </p>
                      </div>
                    </div>
                  ) : filteredUsers.length === 0 && !error ? (
                    <div className="text-center py-8 sm:py-12">
                      <p className="text-gray-500 text-base sm:text-lg">
                        No users found
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-2">
                                  Username
                                </TableHead>
                                <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-2 hidden sm:table-cell">
                                  Email
                                </TableHead>
                                <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-2">
                                  Role
                                </TableHead>
                                <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-2 hidden md:table-cell">
                                  Created At
                                </TableHead>
                                <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-2 hidden lg:table-cell">
                                  Updated At
                                </TableHead>
                                <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-2 text-center">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedUsers.map((user, index) => (
                                <TableRow
                                  key={user.id}
                                  className="hover:bg-gray-50 transition-colors animate-fade-up"
                                  style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                  <TableCell
                                    className="font-medium text-gray-900 px-2 sm:px-3 py-2 cursor-pointer hover:bg-blue-50"
                                    onClick={() =>
                                      handleCellClick(
                                        user.id,
                                        "username",
                                        user.username,
                                      )
                                    }
                                  >
                                    {editingCell?.userId === user.id &&
                                    editingCell?.field === "username" ? (
                                      <Input
                                        value={editValue}
                                        onChange={(e) =>
                                          handleEditChange(e.target.value)
                                        }
                                        onBlur={() =>
                                          handleEditSubmit(user.id, "username")
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            handleEditSubmit(
                                              user.id,
                                              "username",
                                            );
                                          if (e.key === "Escape")
                                            setEditingCell(null);
                                        }}
                                        autoFocus
                                        className="h-7 text-xs sm:text-sm"
                                      />
                                    ) : (
                                      <div className="flex items-center gap-1.5 sm:gap-2">
                                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-[#008060] to-[#006b51] rounded-full flex items-center justify-center flex-shrink-0">
                                          <span className="text-white text-xs font-semibold">
                                            {user.username
                                              ?.charAt(0)
                                              .toUpperCase()}
                                          </span>
                                        </div>
                                        <span className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                                          {user.username}
                                        </span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell
                                    className="text-gray-700 text-xs sm:text-sm px-2 sm:px-3 py-2 hidden sm:table-cell truncate max-w-[150px] md:max-w-[200px] cursor-pointer hover:bg-blue-50"
                                    onClick={() =>
                                      handleCellClick(
                                        user.id,
                                        "email",
                                        user.email,
                                      )
                                    }
                                  >
                                    {editingCell?.userId === user.id &&
                                    editingCell?.field === "email" ? (
                                      <Input
                                        type="email"
                                        value={editValue}
                                        onChange={(e) =>
                                          handleEditChange(e.target.value)
                                        }
                                        onBlur={() =>
                                          handleEditSubmit(user.id, "email")
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            handleEditSubmit(user.id, "email");
                                          if (e.key === "Escape")
                                            setEditingCell(null);
                                        }}
                                        autoFocus
                                        className="h-7 text-xs sm:text-sm"
                                      />
                                    ) : (
                                      user.email
                                    )}
                                  </TableCell>
                                  <TableCell
                                    className="px-2 sm:px-3 py-2 cursor-pointer hover:bg-blue-50"
                                    onClick={() =>
                                      handleCellClick(
                                        user.id,
                                        "user_role",
                                        user.user_role,
                                      )
                                    }
                                  >
                                    {editingCell?.userId === user.id &&
                                    editingCell?.field === "user_role" ? (
                                      <Select
                                        value={editValue}
                                        onValueChange={(value) => {
                                          setEditValue(value);
                                          setConfirmDialog({
                                            open: true,
                                            userId: user.id,
                                            field: "user_role",
                                            oldValue: user.user_role,
                                            newValue: value,
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="h-7 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="alumni">
                                            Alumni
                                          </SelectItem>
                                          <SelectItem value="student">
                                            Student
                                          </SelectItem>
                                          <SelectItem value="faculty">
                                            Faculty
                                          </SelectItem>
                                          <SelectItem value="administrator">
                                            Administrator
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <div className="flex gap-1.5">
                                        {user.is_admin && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs py-0"
                                          >
                                            Admin
                                          </Badge>
                                        )}
                                        <Badge
                                          variant="outline"
                                          className={`text-xs py-0 ${
                                            user.user_role === "administrator"
                                              ? "bg-purple-100 text-purple-800"
                                              : user.user_role === "faculty"
                                                ? "bg-blue-100 text-blue-800"
                                                : user.user_role === "student"
                                                  ? "bg-green-100 text-green-800"
                                                  : "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          {user.user_role || "Alumni"}
                                        </Badge>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-gray-600 text-[10px] sm:text-xs px-2 sm:px-3 py-2 hidden md:table-cell whitespace-nowrap">
                                    {new Date(
                                      user.created_at,
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </TableCell>
                                  <TableCell className="text-gray-600 text-[10px] sm:text-xs px-2 sm:px-3 py-2 hidden lg:table-cell whitespace-nowrap">
                                    {new Date(
                                      user.updated_at,
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-3 py-2 text-center">
                                    <div className="flex gap-2 justify-center">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          setLocation(
                                            `/admin/users/${user.id}/edit`,
                                          )
                                        }
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 text-xs shadow-md hover:shadow-lg transition-all duration-200"
                                        title="Edit User Profile"
                                      >
                                        <span className="text-sm">✏️</span>
                                        <span className="hidden sm:inline ml-1">
                                          Edit
                                        </span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          const isBlocked =
                                            user.account_blocked === true ||
                                            user.account_blocked === "true";
                                          setBlockDialog({
                                            open: true,
                                            userId: user.id,
                                            username: user.username,
                                            currentlyBlocked: isBlocked,
                                          });
                                        }}
                                        className={`${
                                          user.account_blocked === true ||
                                          user.account_blocked === "true"
                                            ? "bg-green-500 hover:bg-green-600"
                                            : "bg-red-500 hover:bg-red-600"
                                        } text-white px-2 sm:px-3 py-1 text-xs shadow-md hover:shadow-lg transition-all duration-200`}
                                        title={
                                          user.account_blocked === true ||
                                          user.account_blocked === "true"
                                            ? "Unblock Account"
                                            : "Block Account"
                                        }
                                      >
                                        <span className="text-sm">
                                          {user.account_blocked === true ||
                                          user.account_blocked === "true"
                                            ? "🔓"
                                            : "🚫"}
                                        </span>
                                        <span className="hidden sm:inline ml-1">
                                          {user.account_blocked === true ||
                                          user.account_blocked === "true"
                                            ? "Unblock"
                                            : "Block"}
                                        </span>
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pagination Controls */}
              {filteredUsers.length > 0 && (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mt-4">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages} • Total:{" "}
                        {filteredUsers.length} user
                        {filteredUsers.length !== 1 ? "s" : ""}
                      </div>

                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() =>
                                setCurrentPage((prev) => Math.max(1, prev - 1))
                              }
                              className={
                                currentPage === 1
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>

                          {/* First page */}
                          {currentPage > 3 && (
                            <>
                              <PaginationItem>
                                <PaginationLink
                                  onClick={() => setCurrentPage(1)}
                                  className="cursor-pointer"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {currentPage > 4 && <PaginationEllipsis />}
                            </>
                          )}

                          {/* Pages around current */}
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(
                              (page) =>
                                page === currentPage ||
                                page === currentPage - 1 ||
                                page === currentPage + 1,
                            )
                            .map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}

                          {/* Last page */}
                          {currentPage < totalPages - 2 && (
                            <>
                              {currentPage < totalPages - 3 && (
                                <PaginationEllipsis />
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  onClick={() => setCurrentPage(totalPages)}
                                  className="cursor-pointer"
                                >
                                  {totalPages}
                                </PaginationLink>
                              </PaginationItem>
                            </>
                          )}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(totalPages, prev + 1),
                                )
                              }
                              className={
                                currentPage === totalPages
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>

                      {/* Quick jump to page */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Go to:</span>
                        <Select
                          value={currentPage.toString()}
                          onValueChange={(value) =>
                            setCurrentPage(Number(value))
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              { length: totalPages },
                              (_, i) => i + 1,
                            ).map((page) => (
                              <SelectItem key={page} value={page.toString()}>
                                {page}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Create Alumni Dialog */}
      <Dialog open={createAlumniDialog} onOpenChange={setCreateAlumniDialog}>
        <DialogContent className="sm:max-w-2xl bg-white border-2 border-[#008060]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              Create New Alumni Account
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Fill in the details to create a new alumni account. A temporary
              password will be generated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Personal Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">
                Personal Information *
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    First Name *
                  </label>
                  <Input
                    value={createAlumniForm.firstName}
                    onChange={(e) => handleAlumniFieldChange('firstName', e.target.value)}
                    placeholder="John"
                    className={`h-9 ${formErrors.firstName ? 'border-red-500' : ''}`}
                  />
                  {formErrors.firstName && (
                    <p className="text-xs text-red-500">{formErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Last Name *
                  </label>
                  <Input
                    value={createAlumniForm.lastName}
                    onChange={(e) => handleAlumniFieldChange('lastName', e.target.value)}
                    placeholder="Doe"
                    className={`h-9 ${formErrors.lastName ? 'border-red-500' : ''}`}
                  />
                  {formErrors.lastName && (
                    <p className="text-xs text-red-500">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={createAlumniForm.email}
                    onChange={(e) => handleAlumniFieldChange('email', e.target.value)}
                    placeholder="john.doe@example.com"
                    className={`h-9 ${formErrors.email ? 'border-red-500' : ''}`}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500">{formErrors.email}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Phone
                  </label>
                  <Input
                    value={createAlumniForm.phone}
                    onChange={(e) => handleAlumniFieldChange('phone', e.target.value)}
                    placeholder="+91 XXXXXXXXXX"
                    className={`h-9 ${formErrors.phone ? 'border-red-500' : ''}`}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-red-500">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Gender *
                </label>
                <Select
                  value={createAlumniForm.gender}
                  onValueChange={(value) => handleAlumniFieldChange('gender', value)}
                >
                  <SelectTrigger className={`h-9 ${formErrors.gender ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.gender && (
                  <p className="text-xs text-red-500">{formErrors.gender}</p>
                )}
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">
                Academic Information *
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Graduation Year *
                  </label>
                  <select
                    value={createAlumniForm.graduationYear}
                    onChange={(e) => handleAlumniFieldChange('graduationYear', e.target.value)}
                    className={`flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formErrors.graduationYear ? 'border-red-500' : 'border-input'}`}
                  >
                    <option value="">Select graduation year</option>
                    {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                  {formErrors.graduationYear && (
                    <p className="text-xs text-red-500">{formErrors.graduationYear}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Batch
                  </label>
                  <Input
                    value={createAlumniForm.batch}
                    onChange={(e) => handleAlumniFieldChange('batch', e.target.value)}
                    placeholder="2020-2024"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Course
                  </label>
                  <Input
                    value={createAlumniForm.course}
                    onChange={(e) => handleAlumniFieldChange('course', e.target.value)}
                    placeholder="B.Tech"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Branch
                  </label>
                  <Input
                    value={createAlumniForm.branch}
                    onChange={(e) => handleAlumniFieldChange('branch', e.target.value)}
                    placeholder="Computer Science"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Roll Number
                  </label>
                  <Input
                    value={createAlumniForm.rollNumber}
                    onChange={(e) => handleAlumniFieldChange('rollNumber', e.target.value)}
                    placeholder="CS2020001"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    CGPA
                  </label>
                  <Input
                    value={createAlumniForm.cgpa}
                    onChange={(e) => handleAlumniFieldChange('cgpa', e.target.value)}
                    placeholder="8.5"
                    className={`h-9 ${formErrors.cgpa ? 'border-red-500' : ''}`}
                  />
                  {formErrors.cgpa && (
                    <p className="text-xs text-red-500">{formErrors.cgpa}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">
                Professional Information (Optional)
              </h3>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Current City
                </label>
                <Input
                  value={createAlumniForm.currentCity}
                  onChange={(e) => handleAlumniFieldChange('currentCity', e.target.value)}
                  placeholder="Mumbai, India"
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Current Company
                  </label>
                  <Input
                    value={createAlumniForm.currentCompany}
                    onChange={(e) => handleAlumniFieldChange('currentCompany', e.target.value)}
                    placeholder="Google"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Current Role
                  </label>
                  <Input
                    value={createAlumniForm.currentRole}
                    onChange={(e) => handleAlumniFieldChange('currentRole', e.target.value)}
                    placeholder="Software Engineer"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  LinkedIn URL
                </label>
                <Input
                  value={createAlumniForm.linkedinUrl}
                  onChange={(e) => handleAlumniFieldChange('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/in/johndoe"
                  className={`h-9 ${formErrors.linkedinUrl ? 'border-red-500' : ''}`}
                />
                {formErrors.linkedinUrl && (
                  <p className="text-xs text-red-500">{formErrors.linkedinUrl}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateAlumniDialog(false);
                setFormErrors({});
              }}
              className="border-gray-300 hover:bg-gray-50"
              disabled={creatingAlumni}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAlumni}
              disabled={creatingAlumni || !isFormValid()}
              className="bg-gradient-to-r from-[#008060] to-[#006b51] hover:from-[#006b51] hover:to-[#005d47] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isFormValid() ? "Please fill all required fields correctly" : ""}
            >
              {creatingAlumni ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) handleCancelUpdate();
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border-2 border-blue-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">✏️</span>
              Confirm Edit
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Are you sure you want to update this user's information?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Field:
                </span>
                <span className="text-sm font-semibold text-gray-900 capitalize">
                  {confirmDialog.field?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Old Value:
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {confirmDialog.oldValue || '(empty)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  New Value:
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {confirmDialog.newValue || '(empty)'}
                </span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <span>
                  This change will be immediately applied to the database. Make sure the information is correct.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelUpdate}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedUpdate}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
            >
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Dialog */}
      <Dialog open={emailConfirmDialog} onOpenChange={setEmailConfirmDialog}>
        <DialogContent className="sm:max-w-3xl bg-white border-2 border-[#008060]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">📧</span>
              Send Credentials via Email
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Review and edit the email content before sending credentials to the new alumni.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-base">ℹ️</span>
                <span>
                  <strong>Recipient:</strong> {tempCredentials.email}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Email Content (Editable)
              </label>
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={16}
                className="w-full border-2 border-gray-200 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#008060]/20 focus:border-[#008060]"
              />
            </div>

            
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEmailConfirmDialog(false);
                setTempCredentials({ email: "", password: "" });
                setEmailContent("");
              }}
              className="border-gray-300 hover:bg-gray-50"
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendCredentialsEmail}
              disabled={sendingEmail}
              className="bg-gradient-to-r from-[#008060] to-[#006b51] hover:from-[#006b51] hover:to-[#005d47] text-white shadow-lg"
            >
              {sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Account Confirmation Dialog */}
      <Dialog
        open={blockDialog.open}
        onOpenChange={(open) =>
          !open && setBlockDialog({ ...blockDialog, open: false })
        }
      >
        <DialogContent className="sm:max-w-md bg-white border-2 border-red-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">
                {blockDialog.currentlyBlocked ? "🔓" : "🚫"}
              </span>
              {blockDialog.currentlyBlocked
                ? "Unblock Account"
                : "Block Account"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              {blockDialog.currentlyBlocked
                ? "Are you sure you want to unblock this account? The user will be able to log in again."
                : "Are you sure you want to block this account? The user will not be able to log in until unblocked."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div
              className={`${blockDialog.currentlyBlocked ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border rounded-lg p-4 space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Username:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {blockDialog.username}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Current Status:
                </span>
                <Badge
                  variant={
                    blockDialog.currentlyBlocked ? "destructive" : "default"
                  }
                >
                  {blockDialog.currentlyBlocked ? "Blocked" : "Active"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  New Status:
                </span>
                <Badge
                  variant={
                    blockDialog.currentlyBlocked ? "default" : "destructive"
                  }
                >
                  {blockDialog.currentlyBlocked ? "Active" : "Blocked"}
                </Badge>
              </div>
            </div>
            {!blockDialog.currentlyBlocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    The user will see a message: "Your account has been blocked
                    by the administrator. Please contact the authority for
                    account activation."
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setBlockDialog({
                  open: false,
                  userId: "",
                  username: "",
                  currentlyBlocked: false,
                })
              }
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlockAccount}
              className={`${
                blockDialog.currentlyBlocked
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              } text-white shadow-lg`}
            >
              {blockDialog.currentlyBlocked
                ? "Confirm Unblock"
                : "Confirm Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};