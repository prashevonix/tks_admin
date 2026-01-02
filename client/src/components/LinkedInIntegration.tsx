
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const LinkedInIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [syncFields, setSyncFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkLinkedInStatus();
  }, []);

  const checkLinkedInStatus = async () => {
    try {
      console.log('[LinkedIn] Checking status...');
      const userId = user?.id || localStorage.getItem('userId');
      console.log('[LinkedIn] User ID:', userId);
      
      const response = await fetch('/api/profile/linkedin/status', {
        headers: { 'user-id': userId || '' }
      });
      
      console.log('[LinkedIn] Status response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[LinkedIn] Status data:', data);
        setIsConnected(data.connected);
        setSyncFields(data.syncFields || []);
      } else {
        console.error('[LinkedIn] Status check failed:', response.statusText);
      }
    } catch (error) {
      console.error('[LinkedIn] Error checking status:', error);
    }
  };

  const handleConnect = async () => {
    try {
      console.log('[LinkedIn] Initiating connection...');
      const userId = user?.id || localStorage.getItem('userId');
      console.log('[LinkedIn] User ID:', userId);
      
      const response = await fetch('/api/auth/linkedin', {
        headers: { 'user-id': userId || '' }
      });
      
      console.log('[LinkedIn] Connect response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[LinkedIn] Connect failed:', errorData);
        toast({
          title: "Connection Failed",
          description: errorData.details || errorData.error || "Failed to connect LinkedIn",
          variant: "destructive",
        });
        return;
      }
      
      const data = await response.json();
      console.log('[LinkedIn] Auth URL received, redirecting...');
      console.log('[LinkedIn] Auth URL length:', data.authUrl?.length);
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error('[LinkedIn] Connect error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect LinkedIn",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      console.log('[LinkedIn Test] Starting comprehensive test...');
      const userId = user?.id || localStorage.getItem('userId');
      
      const response = await fetch('/api/test/linkedin', {
        headers: { 'user-id': userId || '' }
      });
      
      const result = await response.json();
      console.log('[LinkedIn Test] Test results:', result);
      
      // Display detailed results
      if (result.success) {
        toast({
          title: "✓ All Tests Passed",
          description: result.results.summary,
        });
      } else {
        const failedTests = Object.entries(result.results.tests)
          .filter(([_, test]: [string, any]) => !test.passed)
          .map(([name]) => name);
        
        toast({
          title: "Tests Failed",
          description: `Failed: ${failedTests.join(', ')}. Check console for details.`,
          variant: "destructive",
        });
      }
      
      // Log detailed results to console
      console.group('LinkedIn Integration Test Results');
      console.log('Summary:', result.results.summary);
      console.log('Timestamp:', result.results.timestamp);
      console.log('User ID:', result.results.userId);
      console.groupCollapsed('Test Details');
      Object.entries(result.results.tests).forEach(([name, test]: [string, any]) => {
        console.group(name);
        console.log('Passed:', test.passed ? '✓' : '✗');
        console.log('Details:', test.details);
        console.groupEnd();
      });
      console.groupEnd();
      if (result.results.errors.length > 0) {
        console.groupCollapsed('Errors');
        result.results.errors.forEach((error: string, i: number) => {
          console.error(`${i + 1}. ${error}`);
        });
        console.groupEnd();
      }
      console.groupEnd();
    } catch (error) {
      console.error('[LinkedIn Test] Test failed:', error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to run tests",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch('/api/profile/linkedin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || ''
        },
        body: JSON.stringify({ syncFields })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "LinkedIn data synced successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync LinkedIn data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch('/api/profile/linkedin', {
        method: 'DELETE',
        headers: { 'user-id': userId || '' }
      });

      if (response.ok) {
        setIsConnected(false);
        toast({
          title: "Success",
          description: "LinkedIn disconnected successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect LinkedIn",
        variant: "destructive",
      });
    }
  };

  const toggleSyncField = (field: string) => {
    setSyncFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      checkLinkedInStatus().then(() => {
        // Get last sync time from integration
        const userId = user?.id || localStorage.getItem('userId');
        fetch('/api/profile/linkedin/status', {
          headers: { 'user-id': userId || '' }
        }).then(res => res.json()).then(data => {
          if (data.integration?.last_sync_at) {
            setLastSyncTime(data.integration.last_sync_at);
          }
        });
      });
    }
  }, [isConnected]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              in
            </div>
            <div>
              <Label className="text-lg">
                {isConnected ? 'LinkedIn Connected' : 'Connect LinkedIn Account'}
              </Label>
              <p className="text-sm text-gray-600">
                {isConnected 
                  ? lastSyncTime 
                    ? `Last synced: ${new Date(lastSyncTime).toLocaleString()}`
                    : 'Manage your LinkedIn sync'
                  : 'Auto-sync your professional profile data'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700 text-white">
                Connect LinkedIn
              </Button>
            ) : (
              <Button onClick={handleDisconnect} variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-3 block">Sync Preferences</Label>
            <p className="text-xs text-gray-500 mb-3">Select which data to sync from your LinkedIn profile</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-2 hover:bg-white rounded">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5"
                  checked={syncFields.includes('basic_info')}
                  onChange={() => toggleSyncField('basic_info')}
                />
                <div>
                  <span className="text-sm font-medium">Basic Information</span>
                  <p className="text-xs text-gray-500">Name, email, bio</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 hover:bg-white rounded">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5"
                  checked={syncFields.includes('work_experience')}
                  onChange={() => toggleSyncField('work_experience')}
                />
                <div>
                  <span className="text-sm font-medium">Work Experience</span>
                  <p className="text-xs text-gray-500">Current company, role, total experience</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 hover:bg-white rounded">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5"
                  checked={syncFields.includes('education')}
                  onChange={() => toggleSyncField('education')}
                />
                <div>
                  <span className="text-sm font-medium">Education</span>
                  <p className="text-xs text-gray-500">University, degree, field of study, graduation year</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 hover:bg-white rounded">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5"
                  checked={syncFields.includes('skills')}
                  onChange={() => toggleSyncField('skills')}
                />
                <div>
                  <span className="text-sm font-medium">Skills</span>
                  <p className="text-xs text-gray-500">Professional skills and endorsements</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 hover:bg-white rounded">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5"
                  checked={syncFields.includes('profile_photo')}
                  onChange={() => toggleSyncField('profile_photo')}
                />
                <div>
                  <span className="text-sm font-medium">Profile Photo</span>
                  <p className="text-xs text-gray-500">Your LinkedIn profile picture</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 hover:bg-white rounded">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5"
                  checked={syncFields.includes('location')}
                  onChange={() => toggleSyncField('location')}
                />
                <div>
                  <span className="text-sm font-medium">Location</span>
                  <p className="text-xs text-gray-500">Current city and country</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center gap-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={forceOverwrite}
                onChange={(e) => setForceOverwrite(e.target.checked)}
              />
              <div>
                <span className="text-sm font-medium text-yellow-800">Force Overwrite</span>
                <p className="text-xs text-yellow-700">Replace existing data even if already filled</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSync}
            disabled={loading || syncFields.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Syncing...
              </span>
            ) : (
              `Sync ${syncFields.length} ${syncFields.length === 1 ? 'Category' : 'Categories'}`
            )}
          </Button>
          
          <p className="text-xs text-center text-gray-500">
            💡 Tip: Uncheck "Force Overwrite" to only fill empty fields
          </p>
        </div>
      )}
    </>
  );
};
