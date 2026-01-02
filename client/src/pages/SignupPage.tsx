import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/contexts/AuthContext";

export const SignupPage = (): JSX.Element => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { register, user } = useAuth();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      setLocation('/feed');
    }
  }, [user, setLocation]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    graduationYear: "",
    batch: "",
    course: "",
    branch: "",
    rollNumber: "",
    cgpa: "",
    currentCity: "",
    currentCompany: "",
    currentRole: "",
    linkedinUrl: "",
    reasonForJoining: ""
  });


  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) return `${name === 'firstName' ? 'First' : 'Last'} name is required`;
        if (!/^[A-Za-z\s]+$/.test(value)) return 'Only letters and spaces allowed';
        if (value.trim().length < 2) return 'Must be at least 2 characters';
        if (value.trim().length > 50) return 'Must be less than 50 characters';
        return '';
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return '';
      
      case 'phone':
        if (value && value.trim()) {
          if (!/^[\d\s\-\+\(\)]+$/.test(value)) return 'Invalid phone number format';
          const digitsOnly = value.replace(/\D/g, '');
          if (digitsOnly.length < 10) return 'Phone number must be at least 10 digits';
        }
        return '';
      
      case 'graduationYear':
        if (!value.trim()) return 'Graduation year is required';
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        if (isNaN(year)) return 'Must be a valid year';
        if (year < 1950) return 'Year must be 1950 or later';
        if (year > currentYear) return `Year cannot be after ${currentYear}`;
        return '';
      
      case 'batch':
        if (value && value.trim()) {
          if (!/^[0-9\-]+$/.test(value)) return 'Use format: 2020-2024';
        }
        return '';
      
      case 'rollNumber':
        if (value && value.trim()) {
          if (!/^[A-Za-z0-9\-\/]+$/.test(value)) return 'Invalid roll number format';
        }
        return '';
      
      case 'cgpa':
        if (value && value.trim()) {
          const cgpa = parseFloat(value);
          if (isNaN(cgpa)) return 'Must be a number';
          if (cgpa < 0 || cgpa > 10) return 'CGPA must be between 0 and 10';
        }
        return '';
      
      case 'linkedinUrl':
        if (value && value.trim()) {
          if (!/^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|company)\/.+$/i.test(value)) {
            return 'Invalid LinkedIn URL (e.g., https://linkedin.com/in/username)';
          }
        }
        return '';
      
      case 'course':
      case 'branch':
        if (value && value.trim()) {
          if (!/^[A-Za-z\s\.]+$/.test(value)) return 'Only letters, spaces, and dots allowed';
        }
        return '';
      
      case 'currentCity':
      case 'currentCompany':
      case 'currentRole':
        if (value && value.trim()) {
          if (value.trim().length > 100) return 'Must be less than 100 characters';
        }
        return '';
      
      case 'reasonForJoining':
        if (value && value.trim()) {
          if (value.trim().length > 500) return 'Must be less than 500 characters';
        }
        return '';
      
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });

    // Validate field on change
    const error = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async () => {
    // Reset error
    setError(null);

    // Validate all fields
    const errors: {[key: string]: string} = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData] || '');
      if (error) {
        errors[key] = error;
      }
    });

    // Check for any validation errors
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fix the validation errors before submitting");
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementsByName(firstErrorField)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.graduationYear) {
      setError("Please fill in all required fields (First Name, Last Name, Email, Graduation Year)");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Signup request failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900">Request Submitted!</h2>
            <p className="text-gray-600">
              Your signup request has been submitted successfully. Our admin team will review your application and send you login credentials via email once approved.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="w-full bg-[#008060] hover:bg-[#007055]"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6 animate-fade-up">
          {/* Header */}
          <div className="space-y-3 text-center">
            <div className="inline-block">
              <div className="w-16 h-16 bg-gradient-to-br from-[#008060] to-[#006b51] rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg">
                <span className="text-white text-2xl font-bold">T</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Join Our Alumni Network</h1>
            <p className="text-gray-600 text-sm">
              Submit your details and our admin team will review your application
            </p>
          </div>

          {/* Signup Form */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Personal Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">First Name *</label>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      disabled={isLoading}
                      className={fieldErrors.firstName ? 'border-red-500' : ''}
                    />
                    {fieldErrors.firstName && (
                      <p className="text-xs text-red-500">{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Last Name *</label>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      disabled={isLoading}
                      className={fieldErrors.lastName ? 'border-red-500' : ''}
                    />
                    {fieldErrors.lastName && (
                      <p className="text-xs text-red-500">{fieldErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                    className={fieldErrors.email ? 'border-red-500' : ''}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-red-500">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <PhoneInput
                    name="phone"
                    value={formData.phone}
                    onChange={(value) => {
                      setFormData({ ...formData, phone: value });
                      const error = validateField('phone', value);
                      setFieldErrors(prev => ({ ...prev, phone: error }));
                    }}
                    placeholder="Enter phone number"
                    disabled={isLoading}
                    error={fieldErrors.phone}
                  />
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Academic Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Graduation Year *</label>
                    <select
                      name="graduationYear"
                      value={formData.graduationYear}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${fieldErrors.graduationYear ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select graduation year</option>
                      {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                    {fieldErrors.graduationYear && (
                      <p className="text-xs text-red-500">{fieldErrors.graduationYear}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Batch</label>
                    <Input
                      name="batch"
                      value={formData.batch}
                      onChange={handleChange}
                      placeholder="2020-2024"
                      disabled={isLoading}
                      className={fieldErrors.batch ? 'border-red-500' : ''}
                    />
                    {fieldErrors.batch && (
                      <p className="text-xs text-red-500">{fieldErrors.batch}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Course</label>
                    <Input
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      placeholder="B.Tech, M.Tech, etc."
                      disabled={isLoading}
                      className={fieldErrors.course ? 'border-red-500' : ''}
                    />
                    {fieldErrors.course && (
                      <p className="text-xs text-red-500">{fieldErrors.course}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Branch</label>
                    <Input
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      placeholder="Computer Science, etc."
                      disabled={isLoading}
                      className={fieldErrors.branch ? 'border-red-500' : ''}
                    />
                    {fieldErrors.branch && (
                      <p className="text-xs text-red-500">{fieldErrors.branch}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Roll Number</label>
                    <Input
                      name="rollNumber"
                      value={formData.rollNumber}
                      onChange={handleChange}
                      placeholder="Enter roll number"
                      disabled={isLoading}
                      className={fieldErrors.rollNumber ? 'border-red-500' : ''}
                    />
                    {fieldErrors.rollNumber && (
                      <p className="text-xs text-red-500">{fieldErrors.rollNumber}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">CGPA</label>
                    <Input
                      name="cgpa"
                      value={formData.cgpa}
                      onChange={handleChange}
                      placeholder="8.5"
                      disabled={isLoading}
                      className={fieldErrors.cgpa ? 'border-red-500' : ''}
                    />
                    {fieldErrors.cgpa && (
                      <p className="text-xs text-red-500">{fieldErrors.cgpa}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Professional Information (Optional)</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Current City</label>
                  <Input
                    name="currentCity"
                    value={formData.currentCity}
                    onChange={handleChange}
                    placeholder="City, Country"
                    disabled={isLoading}
                    className={fieldErrors.currentCity ? 'border-red-500' : ''}
                  />
                  {fieldErrors.currentCity && (
                    <p className="text-xs text-red-500">{fieldErrors.currentCity}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Current Company</label>
                    <Input
                      name="currentCompany"
                      value={formData.currentCompany}
                      onChange={handleChange}
                      placeholder="Company name"
                      disabled={isLoading}
                      className={fieldErrors.currentCompany ? 'border-red-500' : ''}
                    />
                    {fieldErrors.currentCompany && (
                      <p className="text-xs text-red-500">{fieldErrors.currentCompany}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Current Role</label>
                    <Input
                      name="currentRole"
                      value={formData.currentRole}
                      onChange={handleChange}
                      placeholder="Job title"
                      disabled={isLoading}
                      className={fieldErrors.currentRole ? 'border-red-500' : ''}
                    />
                    {fieldErrors.currentRole && (
                      <p className="text-xs text-red-500">{fieldErrors.currentRole}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">LinkedIn URL</label>
                  <Input
                    name="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    disabled={isLoading}
                    className={fieldErrors.linkedinUrl ? 'border-red-500' : ''}
                  />
                  {fieldErrors.linkedinUrl && (
                    <p className="text-xs text-red-500">{fieldErrors.linkedinUrl}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Why do you want to join?</label>
                  <Textarea
                    name="reasonForJoining"
                    value={formData.reasonForJoining}
                    onChange={handleChange}
                    placeholder="Tell us why you want to be part of our alumni network..."
                    className={`min-h-[100px] ${fieldErrors.reasonForJoining ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                  />
                  {fieldErrors.reasonForJoining && (
                    <p className="text-xs text-red-500">{fieldErrors.reasonForJoining}</p>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#008060] to-[#006b51] hover:from-[#006b51] hover:to-[#005d47] text-white py-6"
              >
                {isLoading ? "Submitting..." : "Submit Registration Request"}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Already registered?{" "}
                <a href="/login" className="text-[#008060] hover:text-[#006b51] font-semibold">
                  Login here
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="flex-1 relative overflow-hidden hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#008060]/20 via-transparent to-[#006b51]/30 z-10"></div>
        <img
          src="/login-art.png"
          alt="Signup artwork"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};