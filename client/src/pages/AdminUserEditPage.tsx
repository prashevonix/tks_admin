
import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";

export const AdminUserEditPage = (): JSX.Element => {
  const [, params] = useRoute("/admin/users/:userId/edit");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [alumniData, setAlumniData] = useState<any>(null);
  const [pendingChanges, setPendingChanges] = useState<{[key: string]: {section: 'user' | 'alumni', value: any}}>({});

  // Fetch user and alumni data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = user?.id || localStorage.getItem('userId');
        if (!userId || !params?.userId) return;

        // Fetch user data
        const userResponse = await fetch(`/api/admin/users`, {
          headers: { 'user-id': userId }
        });

        if (userResponse.ok) {
          const users = await userResponse.json();
          const targetUser = users.find((u: any) => u.id === params.userId);
          setUserData(targetUser);
        }

        // Fetch alumni profile
        const alumniResponse = await fetch(`/api/alumni/search?limit=1000`, {
          headers: { 'user-id': userId }
        });

        if (alumniResponse.ok) {
          const { alumni } = await alumniResponse.json();
          const targetAlumni = alumni.find((a: any) => a.user_id === params.userId);
          setAlumniData(targetAlumni || {});
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [params?.userId, user, toast]);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    section: 'user' | 'alumni';
    field: string;
    oldValue: any;
    newValue: any;
  }>({
    open: false,
    section: 'user',
    field: '',
    oldValue: '',
    newValue: ''
  });

  const handleFieldChange = (section: 'user' | 'alumni', field: string, value: any) => {
    const oldValue = section === 'user' ? userData?.[field] : alumniData?.[field];
    
    // Don't track if value hasn't changed
    if (oldValue === value) {
      // Remove from pending changes if it was there
      const newPendingChanges = { ...pendingChanges };
      delete newPendingChanges[field];
      setPendingChanges(newPendingChanges);
      
      // Update local state
      if (section === 'user') {
        setUserData({ ...userData, [field]: value });
      } else {
        setAlumniData({ ...alumniData, [field]: value });
      }
      return;
    }

    // Track the change
    setPendingChanges({
      ...pendingChanges,
      [field]: { section, value }
    });

    // Update local state optimistically
    if (section === 'user') {
      setUserData({ ...userData, [field]: value });
    } else {
      setAlumniData({ ...alumniData, [field]: value });
    }
  };

  const handleSaveChanges = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast({
        title: "No Changes",
        description: "No changes to save",
      });
      return;
    }

    // Show confirmation dialog with all pending changes
    setConfirmDialog({
      open: true,
      section: 'user',
      field: 'multiple',
      oldValue: `${Object.keys(pendingChanges).length} field(s)`,
      newValue: `${Object.keys(pendingChanges).length} change(s) pending`
    });
  };

  const handleConfirmedUpdate = async () => {
    try {
      const userId = user?.id || localStorage.getItem('userId');
      let successCount = 0;
      let errorCount = 0;

      // Process all pending changes
      for (const [field, { section, value }] of Object.entries(pendingChanges)) {
        try {
          if (section === 'user') {
            const validUserFields = ['username', 'email', 'user_role', 'is_admin'];
            if (validUserFields.includes(field)) {
              const response = await fetch(`/api/admin/users/${params?.userId}/update`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'user-id': userId || ''
                },
                body: JSON.stringify({ field, value })
              });

              if (!response.ok) {
                errorCount++;
              } else {
                successCount++;
              }
            }
          } else {
            const response = await fetch(`/api/admin/alumni/${params?.userId}/field-update`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'user-id': userId || ''
              },
              body: JSON.stringify({ field, value })
            });

            if (!response.ok) {
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (err) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Changes Saved",
          description: `Successfully updated ${successCount} field(s)`,
        });
        setPendingChanges({});
      }

      if (errorCount > 0) {
        toast({
          title: "Some Updates Failed",
          description: `${errorCount} field(s) failed to update`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating fields:", error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setConfirmDialog({ open: false, section: 'user', field: '', oldValue: '', newValue: '' });
    }
  };

  const handleCancelUpdate = () => {
    setConfirmDialog({ open: false, section: 'user', field: '', oldValue: '', newValue: '' });
  };

  

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation('/admin/dashboard')}
              className="border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit User Profile</h1>
              <p className="text-gray-600">Make changes and click Save Changes</p>
            </div>
          </div>
          <Button
            onClick={handleSaveChanges}
            disabled={Object.keys(pendingChanges).length === 0}
            className="bg-gradient-to-r from-[#008060] to-[#006b51] hover:from-[#006b51] hover:to-[#005a43] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes {Object.keys(pendingChanges).length > 0 && `(${Object.keys(pendingChanges).length})`}
          </Button>
        </div>

        {/* User Account Information */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>👤</span>
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Username</label>
                <Input
                  value={userData?.username || ''}
                  onChange={(e) => handleFieldChange('user', 'username', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <Input
                  type="email"
                  value={userData?.email || ''}
                  onChange={(e) => handleFieldChange('user', 'email', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">User Role</label>
                <Select
                  value={userData?.user_role || 'alumni'}
                  onValueChange={(value) => handleFieldChange('user', 'user_role', value)}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-[#008060]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alumni">Alumni</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Admin Status</label>
                <Select
                  value={userData?.is_admin ? 'true' : 'false'}
                  onValueChange={(value) => handleFieldChange('user', 'is_admin', value === 'true')}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-[#008060]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Regular User</SelectItem>
                    <SelectItem value="true">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>📝</span>
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">First Name</label>
                <Input
                  value={alumniData?.first_name || ''}
                  onChange={(e) => handleFieldChange('alumni', 'first_name', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Last Name</label>
                <Input
                  value={alumniData?.last_name || ''}
                  onChange={(e) => handleFieldChange('alumni', 'last_name', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Phone</label>
                <Input
                  value={alumniData?.phone || ''}
                  onChange={(e) => handleFieldChange('alumni', 'phone', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Gender</label>
                <Select
                  value={alumniData?.gender || ''}
                  onValueChange={(value) => handleFieldChange('alumni', 'gender', value)}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-[#008060]">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Bio</label>
                <Textarea
                  value={alumniData?.bio || ''}
                  onChange={(e) => handleFieldChange('alumni', 'bio', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060] min-h-[100px]"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🎓</span>
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Batch</label>
                <Input
                  value={alumniData?.batch || ''}
                  onChange={(e) => handleFieldChange('alumni', 'batch', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Graduation Year</label>
                <select
                  value={alumniData?.graduation_year || ''}
                  onChange={(e) => handleFieldChange('alumni', 'graduation_year', parseInt(e.target.value))}
                  className="flex h-10 w-full rounded-md border-2 border-gray-200 bg-background px-3 py-2 text-sm ring-offset-background focus:border-[#008060] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select graduation year</option>
                  {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Course</label>
                <Input
                  value={alumniData?.course || ''}
                  onChange={(e) => handleFieldChange('alumni', 'course', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Branch</label>
                <Input
                  value={alumniData?.branch || ''}
                  onChange={(e) => handleFieldChange('alumni', 'branch', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Roll Number</label>
                <Input
                  value={alumniData?.roll_number || ''}
                  onChange={(e) => handleFieldChange('alumni', 'roll_number', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">CGPA</label>
                <Input
                  value={alumniData?.cgpa || ''}
                  onChange={(e) => handleFieldChange('alumni', 'cgpa', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>💼</span>
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Current Company</label>
                <Input
                  value={alumniData?.current_company || ''}
                  onChange={(e) => handleFieldChange('alumni', 'current_company', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Current Role</label>
                <Input
                  value={alumniData?.current_role || ''}
                  onChange={(e) => handleFieldChange('alumni', 'current_role', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Industry</label>
                <Input
                  value={alumniData?.industry || ''}
                  onChange={(e) => handleFieldChange('alumni', 'industry', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Current City</label>
                <Input
                  value={alumniData?.current_city || ''}
                  onChange={(e) => handleFieldChange('alumni', 'current_city', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">LinkedIn URL</label>
                <Input
                  value={alumniData?.linkedin_url || ''}
                  onChange={(e) => handleFieldChange('alumni', 'linkedin_url', e.target.value)}
                  className="border-2 border-gray-200 focus:border-[#008060]"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        
      {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => { if (!open) handleCancelUpdate(); }}>
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
                  <span className="text-sm font-medium text-gray-600">Pending Changes:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Object.keys(pendingChanges).length} field(s)
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {Object.entries(pendingChanges).map(([field, { section }]) => (
                    <div key={field} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      <span className="capitalize">{field.replace(/_/g, ' ')}</span>
                      <span className="text-gray-500 text-xs">({section})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 flex items-start gap-2">
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
      </div>
    </div>
  );
};
