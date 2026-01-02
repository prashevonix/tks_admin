import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileCompletenessIndicator } from "@/components/ProfileCompletenessIndicator";
import { ProfileCompletionWizard } from "@/components/ProfileCompletionWizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LinkedInIntegration } from "@/components/LinkedInIntegration";
import { PhoneInput } from "@/components/ui/phone-input";

export const UserProfilePage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, alumni } = useAuth();

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    batch: '',
    currentCompany: '',
    currentPosition: '',
    location: '',
    linkedinUrl: '',
    bio: '',
    gender: '',
    profilePicture: '',
    // Advanced fields
    employmentStatus: '',
    yearsOfExperience: 0,
    previousCompanies: '[]',
    employmentHistory: '[]',
    certifications: '[]',
    languagesKnown: '[]',
    expertiseAreas: '[]',
    keywords: '[]',
    timezone: 'Asia/Kolkata',
    achievements: '[]',
    awards: '[]',
    volunteerInterests: '[]',
    isStartupFounder: false,
    startupName: '',
    startupRole: '',
    fundingStage: '',
    foundingYear: null
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Refs for scrolling to incomplete sections
  const personalInfoRef = React.useRef<HTMLDivElement>(null);
  const professionalInfoRef = React.useRef<HTMLDivElement>(null);
  const privacySettingsRef = React.useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [privacySettings, setPrivacySettings] = useState({
    isProfilePublic: true,
    showEmail: false,
    showPhone: false,
    showLocation: true,
    showCompany: true,
    showEducation: true
  });

  const fetchProfile = async () => {
    try {
      const userId = user?.id || localStorage.getItem('userId');
      if (!userId) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        setLocation('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'user-id': userId
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data);
        console.log('Profile picture from DB:', data.alumni?.profile_picture ? `exists (${data.alumni.profile_picture.substring(0, 50)}...)` : 'missing');

        if (data.alumni) {
          const profilePic = data.alumni.profile_picture || '';
          console.log('Setting profile picture:', profilePic ? 'Yes' : 'No');
          
          setProfile({
            firstName: data.alumni.first_name || '',
            lastName: data.alumni.last_name || '',
            email: data.user.email || '',
            phone: data.alumni.phone || '',
            batch: data.alumni.batch || '',
            currentCompany: data.alumni.current_company || '',
            currentPosition: data.alumni.current_position || '',
            location: data.alumni.location || '',
            linkedinUrl: data.alumni.linkedin_url || '',
            bio: data.alumni.bio || '',
            gender: data.alumni.gender || '',
            profilePicture: profilePic,
            // Advanced fields
            employmentStatus: data.alumni.employment_status || '',
            yearsOfExperience: data.alumni.years_of_experience || 0,
            previousCompanies: data.alumni.previous_companies || '[]',
            employmentHistory: data.alumni.employment_history || '[]',
            certifications: data.alumni.certifications || '[]',
            languagesKnown: data.alumni.languages_known || '[]',
            expertiseAreas: data.alumni.expertise_areas || '[]',
            keywords: data.alumni.keywords || '[]',
            timezone: data.alumni.timezone || 'Asia/Kolkata',
            achievements: data.alumni.achievements || '[]',
            awards: data.alumni.awards || '[]',
            volunteerInterests: data.alumni.volunteer_interests || '[]',
            isStartupFounder: data.alumni.is_startup_founder || false,
            startupName: data.alumni.startup_name || '',
            startupRole: data.alumni.startup_role || '',
            fundingStage: data.alumni.funding_stage || '',
            foundingYear: data.alumni.founding_year || null
          });
        } else {
          setProfile(prev => ({
            ...prev,
            email: data.user.email || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set page title
  useEffect(() => {
    document.title = "My Profile - TKS Alumni Portal";
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [user, toast, setLocation]);

  // Validate required fields
  useEffect(() => {
    const requiredFields = [
      profile.firstName,
      profile.lastName,
      profile.email,
      profile.phone,
      profile.batch,
      profile.gender
    ];

    const allRequiredFieldsFilled = requiredFields.every(field => 
      field && field.trim() !== ''
    );

    setIsFormValid(allRequiredFieldsFilled);
  }, [profile]);

  const handleSave = async () => {
    try {
      const userId = user?.id || localStorage.getItem('userId');
      if (!userId) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      // Validate required fields
      if (!profile.firstName || !profile.lastName || !profile.email || !profile.phone || !profile.batch || !profile.gender) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Validate phone number format and length
      const phoneDigits = profile.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        toast({
          title: "Validation Error",
          description: "Phone number must be exactly 10 digits for the selected country",
          variant: "destructive",
        });
        return;
      }

      // Validate name format
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(profile.firstName)) {
        toast({
          title: "Validation Error",
          description: "First name should contain only letters and spaces",
          variant: "destructive",
        });
        return;
      }
      if (!nameRegex.test(profile.lastName)) {
        toast({
          title: "Validation Error",
          description: "Last name should contain only letters and spaces",
          variant: "destructive",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }

      // Validate LinkedIn URL if provided
      if (profile.linkedinUrl && profile.linkedinUrl.trim() !== '') {
        const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|company)\/.+$/i;
        if (!linkedinRegex.test(profile.linkedinUrl)) {
          toast({
            title: "Validation Error",
            description: "Please enter a valid LinkedIn URL",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('Saving profile with picture:', profile.profilePicture ? 'Yes (length: ' + profile.profilePicture.length + ')' : 'No');

      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        },
        body: JSON.stringify({
          ...profile,
          profilePicture: profile.profilePicture || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile saved successfully:', data);

        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });

        // Log the saved profile picture
        console.log('Profile saved with picture:', data.alumni?.profile_picture ? 'Yes' : 'No');
        
        // Trigger custom event to refresh profile across the app
        window.dispatchEvent(new Event('profileUpdated'));

        // Refresh the profile data
        if (user?.id) {
          await fetchProfile();
        }
      } else {
        const error = await response.json();
        console.error('Profile save error:', error);
        toast({
          title: "Error",
          description: `Failed to update profile: ${error.error || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || user?.username || 'User';

  const getDefaultProfilePicture = () => {
    // Use uploaded profile picture if available
    if (profile.profilePicture && profile.profilePicture.trim() !== '') {
      console.log('Using custom profile picture, length:', profile.profilePicture.length);
      console.log('Picture starts with:', profile.profilePicture.substring(0, 30));
      // Check if it's a base64 image or URL
      if (profile.profilePicture.startsWith('data:image') || profile.profilePicture.startsWith('http')) {
        return profile.profilePicture;
      }
      // If it's stored without the data:image prefix, add it
      if (profile.profilePicture.includes('base64,')) {
        return `data:image/jpeg;${profile.profilePicture}`;
      }
    }

    // Default profile pictures based on gender
    const seed = encodeURIComponent(displayName);
    console.log('Using default profile picture for gender:', profile.gender);
    switch (profile.gender) {
      case 'male':
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
      case 'female':
        return `https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${seed}&backgroundColor=ff69b4`;
      case 'other':
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=ffa500`;
      case 'prefer_not_to_say':
        return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=6c63ff`;
      default:
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      // Compress and convert image to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

          console.log('Profile picture uploaded:', compressedBase64.substring(0, 100));
          setProfile(prev => ({ ...prev, profilePicture: compressedBase64 }));

          toast({
            title: "Success",
            description: "Profile picture uploaded. Click 'Save Changes' to apply.",
          });
        };
        img.onerror = () => {
          toast({
            title: "Error",
            description: "Failed to process image",
            variant: "destructive",
          });
          setUploadingImage(false);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive",
        });
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      setUploadingImage(false);
    } finally {
      setTimeout(() => setUploadingImage(false), 500);
    }
  };

  const getMissingFields = () => {
    const missing = [];
    if (!profile.firstName) missing.push('firstName');
    if (!profile.lastName) missing.push('lastName');
    if (!profile.email) missing.push('email');
    if (!profile.phone) missing.push('phone');
    if (!profile.batch) missing.push('batch');
    if (!profile.gender) missing.push('gender');
    return missing;
  };

  const calculateProfileCompleteness = () => {
    const fields = [
      // Essential fields (weight: 2)
      { value: profile.firstName, weight: 2, name: 'First Name' },
      { value: profile.lastName, weight: 2, name: 'Last Name' },
      { value: profile.email, weight: 2, name: 'Email' },
      { value: profile.phone, weight: 2, name: 'Phone' },
      { value: profile.batch, weight: 2, name: 'Batch' },
      { value: profile.gender, weight: 2, name: 'Gender' },
      
      // Important fields (weight: 1.5)
      { value: profile.profilePicture, weight: 1.5, name: 'Profile Picture' },
      { value: profile.bio, weight: 1.5, name: 'Bio' },
      { value: profile.currentCompany, weight: 1.5, name: 'Current Company' },
      { value: profile.currentPosition, weight: 1.5, name: 'Current Position' },
      { value: profile.location, weight: 1.5, name: 'Location' },
      
      // Professional fields (weight: 1)
      { value: profile.linkedinUrl, weight: 1, name: 'LinkedIn' },
      { value: profile.employmentStatus, weight: 1, name: 'Employment Status' },
      { value: profile.yearsOfExperience > 0 ? profile.yearsOfExperience : null, weight: 1, name: 'Experience' },
      
      // Additional fields (weight: 0.5)
      { value: profile.expertiseAreas && profile.expertiseAreas !== '[]' ? profile.expertiseAreas : null, weight: 0.5, name: 'Expertise' },
      { value: profile.languagesKnown && profile.languagesKnown !== '[]' ? profile.languagesKnown : null, weight: 0.5, name: 'Languages' },
      { value: profile.certifications && profile.certifications !== '[]' ? profile.certifications : null, weight: 0.5, name: 'Certifications' },
      { value: profile.achievements && profile.achievements !== '[]' ? profile.achievements : null, weight: 0.5, name: 'Achievements' },
    ];
    
    let completedWeight = 0;
    let totalWeight = 0;
    
    fields.forEach(field => {
      totalWeight += field.weight;
      if (field.value && String(field.value).trim() !== '' && String(field.value) !== '[]') {
        completedWeight += field.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  const handleWizardSave = async (updates: any) => {
    setProfile(prev => ({ ...prev, ...updates }));
    
    const userId = user?.id || localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    // Trigger refresh
    window.dispatchEvent(new Event('profileUpdated'));
    fetchProfile();
  };

  if (loading) {
    return (
      <AppLayout currentPage="feed">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const completenessPercentage = calculateProfileCompleteness();
  const missingFields = getMissingFields();

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Mobile Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="sm:hidden flex items-center gap-2 text-gray-600 hover:text-[#008060]"
            onClick={() => window.history.back()}
          >
            <span className="text-xl">←</span>
            <span>Back</span>
          </Button>

          {/* Profile Header */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={getDefaultProfilePicture()} />
                    <AvatarFallback className="text-2xl bg-[#008060] text-white">
                      {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full w-8 h-8 bg-white"
                    onClick={() => document.getElementById('profilePictureInput')?.click()}
                    disabled={uploadingImage}
                  >
                    📷
                  </Button>
                  <input
                    id="profilePictureInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                  <p className="text-gray-600">{profile.currentPosition || 'Alumni'} {profile.currentCompany && `at ${profile.currentCompany}`}</p>
                  <p className="text-sm text-gray-500">{profile.location}</p>
                </div>

                {/* Profile Completeness Indicator */}
                <ProfileCompletenessIndicator 
                  percentage={completenessPercentage} 
                  onClick={() => setShowWizard(true)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card ref={personalInfoRef} className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    placeholder="Enter first name"
                    required
                    className={!profile.firstName.trim() ? 'border-red-300' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    placeholder="Enter last name"
                    required
                    className={!profile.lastName.trim() ? 'border-red-300' : ''}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="Enter email"
                  required
                  className={!profile.email.trim() ? 'border-red-300' : ''}
                />
              </div>
              <div>
                <Label htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <PhoneInput
                  id="phone"
                  value={profile.phone}
                  onChange={(value) => setProfile({ ...profile, phone: value })}
                  placeholder="Enter phone number"
                  required
                  className={!profile.phone.trim() ? 'border-red-300' : ''}
                  // Add props for country code selection and number length limits if PhoneInput supports them
                />
              </div>
              <div>
                <Label htmlFor="graduationYear">
                  Graduation Year <span className="text-red-500">*</span>
                </Label>
                <select
                  id="graduationYear"
                  value={profile.batch}
                  onChange={(e) => setProfile({ ...profile, batch: e.target.value })}
                  className={`flex h-10 w-full rounded-md border ${!profile.batch ? 'border-red-300' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                  required
                >
                  <option value="">Select graduation year</option>
                  {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="gender">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <select
                  id="gender"
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className={`flex h-10 w-full rounded-md border ${!profile.gender ? 'border-red-300' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card ref={professionalInfoRef} className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentCompany">Current Company</Label>
                <Input
                  id="currentCompany"
                  value={profile.currentCompany}
                  onChange={(e) => setProfile({ ...profile, currentCompany: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="currentPosition">Current Position</Label>
                <Input
                  id="currentPosition"
                  value={profile.currentPosition}
                  onChange={(e) => setProfile({ ...profile, currentPosition: e.target.value })}
                  placeholder="Enter your position"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              <div>
                <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                <Input
                  id="linkedinUrl"
                  value={profile.linkedinUrl}
                  onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card ref={privacySettingsRef} className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label>Public Profile</Label>
                  <p className="text-sm text-gray-600">Display email on your profile</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={privacySettings.showEmail}
                  onChange={(e) => setPrivacySettings({...privacySettings, showEmail: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label>Show Email</Label>
                  <p className="text-sm text-gray-600">Display email on your profile</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={privacySettings.showEmail}
                  onChange={(e) => setPrivacySettings({...privacySettings, showEmail: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label>Show Phone</Label>
                  <p className="text-sm text-gray-600">Display phone number on your profile</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={privacySettings.showPhone}
                  onChange={(e) => setPrivacySettings({...privacySettings, showPhone: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label>Show Location</Label>
                  <p className="text-sm text-gray-600">Display your current location</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={privacySettings.showLocation}
                  onChange={(e) => setPrivacySettings({...privacySettings, showLocation: e.target.checked})}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label>Show Company</Label>
                  <p className="text-sm text-gray-600">Display your current company</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={privacySettings.showCompany}
                  onChange={(e) => setPrivacySettings({...privacySettings, showCompany: e.target.checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Employment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <select
                  id="employmentStatus"
                  value={profile.employmentStatus}
                  onChange={(e) => setProfile({ ...profile, employmentStatus: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select status</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="entrepreneur">Entrepreneur</option>
                  <option value="student">Student</option>
                  <option value="looking">Looking for Opportunities</option>
                </select>
              </div>
              <div>
                <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  value={profile.yearsOfExperience}
                  onChange={(e) => setProfile({ ...profile, yearsOfExperience: parseInt(e.target.value) || 0 })}
                  placeholder="Enter years of experience"
                  min="0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills & Expertise */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="expertiseAreas">Expertise Areas</Label>
                <Textarea
                  id="expertiseAreas"
                  value={(() => {
                    try {
                      const parsed = JSON.parse(profile.expertiseAreas);
                      return Array.isArray(parsed) ? parsed.join(', ') : '';
                    } catch {
                      return profile.expertiseAreas;
                    }
                  })()}
                  onChange={(e) => {
                    const areas = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setProfile({ ...profile, expertiseAreas: JSON.stringify(areas) });
                  }}
                  placeholder="e.g., Web Development, Data Science, Machine Learning"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
              </div>
              <div>
                <Label htmlFor="keywords">Keywords/Tags</Label>
                <Textarea
                  id="keywords"
                  value={(() => {
                    try {
                      const parsed = JSON.parse(profile.keywords);
                      return Array.isArray(parsed) ? parsed.join(', ') : '';
                    } catch {
                      return profile.keywords;
                    }
                  })()}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setProfile({ ...profile, keywords: JSON.stringify(tags) });
                  }}
                  placeholder="e.g., Python, React, Leadership"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
              </div>
            </CardContent>
          </Card>

          {/* Certifications & Languages */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Certifications & Languages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="certifications">Certifications</Label>
                <Textarea
                  id="certifications"
                  value={(() => {
                    try {
                      const parsed = JSON.parse(profile.certifications);
                      return Array.isArray(parsed) ? parsed.join('\n') : '';
                    } catch {
                      return profile.certifications;
                    }
                  })()}
                  onChange={(e) => {
                    const certs = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                    setProfile({ ...profile, certifications: JSON.stringify(certs) });
                  }}
                  placeholder="Enter certifications (one per line)"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="languagesKnown">Languages Known</Label>
                <Textarea
                  id="languagesKnown"
                  value={(() => {
                    try {
                      const parsed = JSON.parse(profile.languagesKnown);
                      return Array.isArray(parsed) ? parsed.join(', ') : '';
                    } catch {
                      return profile.languagesKnown;
                    }
                  })()}
                  onChange={(e) => {
                    const langs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setProfile({ ...profile, languagesKnown: JSON.stringify(langs) });
                  }}
                  placeholder="e.g., English, Hindi, Spanish"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
              </div>
            </CardContent>
          </Card>

          {/* Achievements & Awards */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Achievements & Awards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="achievements">Achievements</Label>
                <Textarea
                  id="achievements"
                  value={(() => {
                    try {
                      const parsed = JSON.parse(profile.achievements);
                      return Array.isArray(parsed) ? parsed.join('\n') : '';
                    } catch {
                      return profile.achievements;
                    }
                  })()}
                  onChange={(e) => {
                    const achievs = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                    setProfile({ ...profile, achievements: JSON.stringify(achievs) });
                  }}
                  placeholder="Enter achievements (one per line)"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="awards">Awards</Label>
                <Textarea
                  id="awards"
                  value={(() => {
                    try {
                      const parsed = JSON.parse(profile.awards);
                      return Array.isArray(parsed) ? parsed.join('\n') : '';
                    } catch {
                      return profile.awards;
                    }
                  })()}
                  onChange={(e) => {
                    const awrds = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                    setProfile({ ...profile, awards: JSON.stringify(awrds) });
                  }}
                  placeholder="Enter awards (one per line)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Startup Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Startup / Entrepreneurship</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isStartupFounder"
                  checked={profile.isStartupFounder}
                  onChange={(e) => setProfile({ ...profile, isStartupFounder: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isStartupFounder">I am a startup founder</Label>
              </div>
              {profile.isStartupFounder && (
                <>
                  <div>
                    <Label htmlFor="startupName">Startup Name</Label>
                    <Input
                      id="startupName"
                      value={profile.startupName}
                      onChange={(e) => setProfile({ ...profile, startupName: e.target.value })}
                      placeholder="Enter startup name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startupRole">Your Role</Label>
                    <Input
                      id="startupRole"
                      value={profile.startupRole}
                      onChange={(e) => setProfile({ ...profile, startupRole: e.target.value })}
                      placeholder="e.g., Co-Founder, CEO"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fundingStage">Funding Stage</Label>
                    <select
                      id="fundingStage"
                      value={profile.fundingStage}
                      onChange={(e) => setProfile({ ...profile, fundingStage: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select stage</option>
                      <option value="bootstrapped">Bootstrapped</option>
                      <option value="pre-seed">Pre-Seed</option>
                      <option value="seed">Seed</option>
                      <option value="series-a">Series A</option>
                      <option value="series-b">Series B</option>
                      <option value="series-c">Series C+</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="foundingYear">Founding Year</Label>
                    <Input
                      id="foundingYear"
                      type="number"
                      value={profile.foundingYear || ''}
                      onChange={(e) => setProfile({ ...profile, foundingYear: parseInt(e.target.value) || null })}
                      placeholder="Enter founding year"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="volunteerInterests">Volunteer Interests</Label>
                <Textarea
                  id="volunteerInterests"
                  value={(() => {
                    try {
                      const parsed = JSON.parse(profile.volunteerInterests);
                      return Array.isArray(parsed) ? parsed.join(', ') : '';
                    } catch {
                      return profile.volunteerInterests;
                    }
                  })()}
                  onChange={(e) => {
                    const interests = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setProfile({ ...profile, volunteerInterests: JSON.stringify(interests) });
                  }}
                  placeholder="e.g., Mentoring, Community Service, Teaching"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
              </div>
            </CardContent>
          </Card>

          {/* LinkedIn Integration */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>LinkedIn Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LinkedInIntegration />
            </CardContent>
          </Card>

          {/* Wizard Modal */}
          {showWizard && (
            <ProfileCompletionWizard
              profile={profile}
              onClose={() => setShowWizard(false)}
              onSave={handleWizardSave}
            />
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <div className="relative group">
              <Button
                onClick={handleSave}
                className="bg-[#008060] hover:bg-[#006b51] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isFormValid}
              >
                Save Changes
              </Button>
              {!isFormValid && (
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  Please fill all required fields (*)
                </div>
              )}
            </div>
            <Button variant="outline" onClick={() => setLocation('/feed')}>
              Cancel
            </Button>
          </div>

          {/* Required fields notice */}
          {!isFormValid && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
              <span className="text-yellow-600">⚠️</span>
              <div className="text-sm text-yellow-800">
                <p className="font-semibold">Please complete all required fields</p>
                <p className="text-xs mt-1">Fields marked with <span className="text-red-500">*</span> are mandatory and must be filled before saving.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};