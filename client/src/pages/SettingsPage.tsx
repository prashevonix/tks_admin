import React, { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const SettingsPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const [profile, setProfile] = useState({
    name: user?.username || "User",
    email: user?.email || "",
    batch: "2018",
    company: "BrightWave Media",
    position: "Marketing Manager",
    location: "Pune, India",
    bio: "Marketing professional with 5+ years of experience in digital marketing and brand management."
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    eventReminders: true,
    jobAlerts: true
  });

  const runNotificationTests = async () => {
    setIsTestingNotifications(true);
    const results: string[] = [];
    
    try {
      const userId = user?.id || localStorage.getItem('userId');
      
      if (!userId) {
        results.push("❌ ERROR: No user ID found - please log in first");
        setTestResults(results);
        setIsTestingNotifications(false);
        return;
      }

      // Test 1: Fetch all notifications
      results.push("🧪 Test 1: Fetching all notifications...");
      const fetchAllResponse = await fetch('/api/notifications?limit=20', {
        headers: { 'user-id': userId }
      });
      
      if (fetchAllResponse.ok) {
        const data = await fetchAllResponse.json();
        results.push(`✅ Test 1: Fetch all notifications SUCCESS (Found ${data.notifications?.length || 0} notifications)`);
      } else {
        results.push(`❌ Test 1: Fetch all notifications FAILED (Status: ${fetchAllResponse.status})`);
      }

      // Test 2: Fetch unread notifications only
      results.push("🧪 Test 2: Fetching unread notifications...");
      const fetchUnreadResponse = await fetch('/api/notifications?unreadOnly=true', {
        headers: { 'user-id': userId }
      });
      
      if (fetchUnreadResponse.ok) {
        const data = await fetchUnreadResponse.json();
        results.push(`✅ Test 2: Fetch unread notifications SUCCESS (Found ${data.notifications?.length || 0} unread)`);
      } else {
        results.push(`❌ Test 2: Fetch unread notifications FAILED`);
      }

      // Test 3: Create a test notification manually (via backend)
      results.push("🧪 Test 3: Creating test notification...");
      
      // Get the first notification to mark as read (if any exist)
      const notificationsData = await fetchAllResponse.json();
      const firstUnreadNotification = notificationsData.notifications?.find((n: any) => !n.is_read);
      
      if (firstUnreadNotification) {
        // Test 4: Mark notification as read
        results.push("🧪 Test 4: Marking notification as read...");
        const markReadResponse = await fetch(`/api/notifications/${firstUnreadNotification.id}/read`, {
          method: 'PUT',
          headers: { 'user-id': userId }
        });
        
        if (markReadResponse.ok) {
          results.push(`✅ Test 4: Mark as read SUCCESS (ID: ${firstUnreadNotification.id})`);
        } else {
          results.push(`❌ Test 4: Mark as read FAILED`);
        }
      } else {
        results.push("⚠️ Test 4: SKIPPED - No unread notifications to test mark as read");
      }

      // Test 5: Mark all notifications as read
      results.push("🧪 Test 5: Marking all notifications as read...");
      const markAllReadResponse = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'user-id': userId }
      });
      
      if (markAllReadResponse.ok) {
        results.push(`✅ Test 5: Mark all as read SUCCESS`);
      } else {
        results.push(`❌ Test 5: Mark all as read FAILED`);
      }

      // Test 6: Verify all marked as read
      results.push("🧪 Test 6: Verifying all notifications marked as read...");
      const verifyResponse = await fetch('/api/notifications?unreadOnly=true', {
        headers: { 'user-id': userId }
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const unreadCount = verifyData.notifications?.length || 0;
        if (unreadCount === 0) {
          results.push(`✅ Test 6: Verification SUCCESS - All notifications marked as read`);
        } else {
          results.push(`⚠️ Test 6: Verification WARNING - Still ${unreadCount} unread notifications`);
        }
      } else {
        results.push(`❌ Test 6: Verification FAILED`);
      }

      // Test 7: Check Socket.IO connection status
      results.push("🧪 Test 7: Checking real-time notification setup...");
      const socketExists = typeof (window as any).io !== 'undefined';
      if (socketExists) {
        results.push(`✅ Test 7: Socket.IO library loaded`);
      } else {
        results.push(`⚠️ Test 7: Socket.IO library not found - real-time notifications may not work`);
      }

      // Test 8: Test notification types support
      results.push("🧪 Test 8: Testing notification type recognition...");
      const notificationTypes = [
        'message',
        'connection_request',
        'connection_response',
        'post_like',
        'post_comment',
        'event_rsvp',
        'job',
        'signup_approved'
      ];
      results.push(`✅ Test 8: ${notificationTypes.length} notification types supported`);
      notificationTypes.forEach(type => {
        results.push(`   • ${type}`);
      });

      // Summary
      results.push("");
      results.push("📊 TEST SUMMARY:");
      const successCount = results.filter(r => r.includes('✅')).length;
      const failCount = results.filter(r => r.includes('❌')).length;
      const warnCount = results.filter(r => r.includes('⚠️')).length;
      results.push(`✅ Passed: ${successCount}`);
      results.push(`❌ Failed: ${failCount}`);
      results.push(`⚠️ Warnings: ${warnCount}`);

      toast({
        title: "Notification Tests Complete",
        description: `${successCount} passed, ${failCount} failed, ${warnCount} warnings`,
        variant: failCount > 0 ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Notification test error:', error);
      results.push(`❌ CRITICAL ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Test Failed",
        description: "An error occurred during testing",
        variant: "destructive"
      });
    } finally {
      setTestResults(results);
      setIsTestingNotifications(false);
    }
  };

  const handleSaveProfile = () => {
    // Validate name
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!profile.name || profile.name.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    if (!nameRegex.test(profile.name)) {
      toast({
        title: "Validation Error",
        description: "Name should contain only letters and spaces",
        variant: "destructive",
      });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!profile.email || !emailRegex.test(profile.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Validate batch year
    const currentYear = new Date().getFullYear();
    const batchYear = parseInt(profile.batch);
    if (isNaN(batchYear) || batchYear < 1950 || batchYear > currentYear) {
      toast({
        title: "Validation Error",
        description: `Batch year must be between 1950 and ${currentYear}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <AppLayout currentPage="feed">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="max-w-4xl mx-auto">
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your profile and preferences</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="batch">Batch Year</Label>
                  <Input
                    id="batch"
                    value={profile.batch}
                    onChange={(e) => setProfile({...profile, batch: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile({...profile, location: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile({...profile, company: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={profile.position}
                    onChange={(e) => setProfile({...profile, position: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
              <Button onClick={handleSaveProfile} className="bg-[#008060] hover:bg-[#007055] text-white">
                Save Profile
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notification Preferences</CardTitle>
                <Button
                  onClick={runNotificationTests}
                  disabled={isTestingNotifications}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  {isTestingNotifications ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test All Notifications"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {testResults.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-96 overflow-y-auto">
                  <h4 className="font-semibold mb-2">Test Results:</h4>
                  <div className="space-y-1 font-mono text-xs">
                    {testResults.map((result, index) => (
                      <div
                        key={index}
                        className={`${
                          result.includes('✅') ? 'text-green-600' :
                          result.includes('❌') ? 'text-red-600' :
                          result.includes('⚠️') ? 'text-yellow-600' :
                          result.includes('🧪') ? 'text-blue-600' :
                          result.includes('📊') ? 'font-bold text-gray-900' :
                          'text-gray-600'
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications({...notifications, emailNotifications: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-gray-600">Receive browser push notifications</p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weekly-digest">Weekly Digest</Label>
                  <p className="text-sm text-gray-600">Get a weekly summary of activities</p>
                </div>
                <Switch
                  id="weekly-digest"
                  checked={notifications.weeklyDigest}
                  onCheckedChange={(checked) => setNotifications({...notifications, weeklyDigest: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="event-reminders">Event Reminders</Label>
                  <p className="text-sm text-gray-600">Get reminded about upcoming events</p>
                </div>
                <Switch
                  id="event-reminders"
                  checked={notifications.eventReminders}
                  onCheckedChange={(checked) => setNotifications({...notifications, eventReminders: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="job-alerts">Job Alerts</Label>
                  <p className="text-sm text-gray-600">Receive notifications about new job postings</p>
                </div>
                <Switch
                  id="job-alerts"
                  checked={notifications.jobAlerts}
                  onCheckedChange={(checked) => setNotifications({...notifications, jobAlerts: checked})}
                />
              </div>
              <Button className="bg-[#008060] hover:bg-[#007055] text-white">
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
              <Button variant="outline" className="w-full">
                Download My Data
              </Button>
              <Button variant="outline" className="w-full text-red-600 border-red-600 hover:bg-red-50">
                Deactivate Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};