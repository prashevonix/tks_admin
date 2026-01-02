import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const ConnectionsPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Set page title
  React.useEffect(() => {
    document.title = "Connections - TKS Alumni Portal";
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedEducation, setSelectedEducation] = useState("");

  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatuses, setConnectionStatuses] = useState<Map<number, 'none' | 'pending' | 'connected'>>(new Map());
  const [sendingRequest, setSendingRequest] = useState<Set<number>>(new Set());
  const [connectionStats, setConnectionStats] = useState({
    totalConnections: 0,
    pendingSent: 0,
    pendingReceived: 0,
    totalPending: 0
  });

  useEffect(() => {
    fetchAlumni();
    fetchConnectionStats();
  }, []);

  // Auto-search when filters change with debouncing
  useEffect(() => {
    // Skip initial render to prevent double fetch
    if (!alumni.length && !searchTerm && !selectedLocation && !selectedBatch && !selectedIndustry) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchAlumni();
    }, 300); // 300ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedLocation, selectedBatch, selectedIndustry]);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedLocation) params.append('location', selectedLocation);
      if (selectedBatch) params.append('batch', selectedBatch);
      if (selectedIndustry) params.append('industry', selectedIndustry);

      const response = await fetch(`/api/alumni/search?${params.toString()}`, {
        headers: {
          'user-id': user?.id || localStorage.getItem('userId') || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        const alumniList = data.alumni || [];
        setAlumni(alumniList);

        // Fetch connection statuses for all alumni
        if (user?.id) {
          await fetchConnectionStatuses(alumniList);
        }
      }
    } catch (error) {
      console.error('Error fetching alumni:', error);
      toast({
        title: "Error",
        description: "Failed to load alumni. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatuses = async (alumniList: any[]) => {
    if (!user?.id || alumniList.length === 0) return;

    const statuses = new Map<number, 'none' | 'pending' | 'connected'>();

    for (const alumnus of alumniList) {
      try {
        const response = await fetch(`/api/connections/status/${alumnus.id}`, {
          headers: {
            'user-id': user.id
          }
        });

        if (response.ok) {
          const data = await response.json();
          statuses.set(alumnus.id, data.status);
        } else {
          statuses.set(alumnus.id, 'none');
        }
      } catch (error) {
        console.error(`Error fetching connection status for ${alumnus.id}:`, error);
        statuses.set(alumnus.id, 'none');
      }
    }

    setConnectionStatuses(statuses);
  };

  const fetchConnectionStats = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/connections/stats', {
        headers: {
          'user-id': user.id
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStats(data);
      }
    } catch (error) {
      console.error('Error fetching connection stats:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedLocation("");
    setSelectedBatch("");
    setSelectedIndustry("");
    setSelectedEducation("");
  };

  const handleViewProfile = (alumniId: number) => {
    setLocation(`/profile/${alumniId}`);
  };

  const handleConnect = async (alumnus: any) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send connection requests",
        variant: "destructive"
      });
      return;
    }

    if (sendingRequest.has(alumnus.id)) return;

    try {
      setSendingRequest(prev => new Set(prev).add(alumnus.id));

      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({
          recipientId: alumnus.id,
          message: `Hi ${alumnus.first_name}, I'd like to connect with you on the alumni network.`
        })
      });

      if (response.ok) {
        setConnectionStatuses(prev => {
          const newStatuses = new Map(prev);
          newStatuses.set(alumnus.id, 'pending');
          return newStatuses;
        });

        // Refresh connection stats
        fetchConnectionStats();

        toast({
          title: "Success",
          description: `Connection request sent to ${alumnus.first_name} ${alumnus.last_name}!`
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to send connection request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingRequest(prev => {
        const newSet = new Set(prev);
        newSet.delete(alumnus.id);
        return newSet;
      });
    }
  };

  const getProfilePicture = (alumnus: any) => {
    if (alumnus.profile_picture && alumnus.profile_picture.trim() !== '') {
      return alumnus.profile_picture;
    }

    const displayName = `${alumnus.first_name || ''} ${alumnus.last_name || ''}`.trim();
    const seed = encodeURIComponent(displayName);
    const gender = alumnus.gender || 'default';

    switch (gender) {
      case 'male':
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
      case 'female':
        return `https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${seed}&backgroundColor=ff69b4`;
      case 'other':
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=ffa500`;
      default:
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
    }
  };

  const exportConnections = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Company', 'Position', 'Location', 'Batch'].join(','),
      ...alumni.map(a => [
        `"${a.first_name} ${a.last_name}"`,
        a.email || '',
        a.phone || '',
        a.current_company || '',
        a.current_position || '',
        a.location || '',
        a.batch || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumni_connections_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleApplyFilters = () => {
    // This function is no longer needed as filtering is handled by auto-search
  };

  return (
    <AppLayout currentPage="connections">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Fellow Alumni</h2>
            <Button
              onClick={exportConnections}
              variant="outline"
              className="border-[#008060] text-[#008060] hover:bg-[#008060]/10"
            >
              <span className="mr-2">📥</span>
              Export Connections
            </Button>
          </div>

          {/* Connection Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-[#008060]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Connections</p>
                    <p className="text-2xl font-bold text-[#008060]">{connectionStats.totalConnections}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#008060]/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🤝</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Requests Sent</p>
                    <p className="text-2xl font-bold text-blue-600">{connectionStats.pendingSent}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📤</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Requests Received</p>
                    <p className="text-2xl font-bold text-orange-600">{connectionStats.pendingReceived}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📥</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Pending</p>
                    <p className="text-2xl font-bold text-purple-600">{connectionStats.totalPending}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⏳</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <Input
                  placeholder="Search alumni by name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchAlumni(); // Trigger fetch directly on Enter key press
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

                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2015">2015</SelectItem>
                    <SelectItem value="2016">2016</SelectItem>
                    <SelectItem value="2017">2017</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedEducation} onValueChange={setSelectedEducation}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Education Qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masters">Masters</SelectItem>
                    <SelectItem value="bachelors">Bachelors</SelectItem>
                    <SelectItem value="phd">PhD</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters} className="text-[#008060]">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alumni Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-600">Name</th>
                      <th className="text-left p-4 font-medium text-gray-600">Batch</th>
                      <th className="text-left p-4 font-medium text-gray-600">Location</th>
                      <th className="text-left p-4 font-medium text-gray-600">Industry</th>
                      <th className="text-left p-4 font-medium text-gray-600">Company</th>
                      <th className="text-left p-4 font-medium text-gray-600">Education Qualification</th>
                      <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-4 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
                            <p className="text-gray-600">Loading alumni...</p>
                          </div>
                        </td>
                      </tr>
                    ) : alumni.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-600">
                          No alumni found. Try adjusting your filters.
                        </td>
                      </tr>
                    ) : (
                      alumni.map((person) => {
                        const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim();
                        const status = connectionStatuses.get(person.id) || 'none';
                        const isSending = sendingRequest.has(person.id);
                        const isOwnProfile = user?.id === person.id;

                        return (
                          <tr key={person.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={getProfilePicture(person)} alt={fullName} />
                                  <AvatarFallback className="bg-[#008060] text-white">
                                    {fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{fullName || 'Alumni Member'}</span>
                              </div>
                            </td>
                            <td className="p-4 text-gray-600">{person.batch || '-'}</td>
                            <td className="p-4 text-gray-600">{person.location || '-'}</td>
                            <td className="p-4 text-gray-600">{person.industry || '-'}</td>
                            <td className="p-4">
                              <div>
                                <div className="font-medium">{person.current_company || '-'}</div>
                                <div className="text-sm text-gray-500">{person.current_position || '-'}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <div className="font-medium">{person.course || person.education || '-'}</div>
                                <div className="text-sm text-gray-500">{person.branch || person.university || '-'}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[#008060] border-[#008060] hover:bg-[#008060]/10"
                                  onClick={() => handleViewProfile(person.id)}
                                >
                                  View Profile
                                </Button>
                                {!isOwnProfile && (
                                  <>
                                    {status === 'none' && (
                                      <Button
                                        size="sm"
                                        className="bg-[#008060] hover:bg-[#007055] text-white"
                                        onClick={() => handleConnect(person)}
                                        disabled={isSending}
                                      >
                                        {isSending ? 'Sending...' : 'Connect +'}
                                      </Button>
                                    )}
                                    {status === 'pending' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled
                                        className="cursor-not-allowed"
                                      >
                                        Pending
                                      </Button>
                                    )}
                                    {status === 'connected' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 border-green-600 cursor-default"
                                        disabled
                                      >
                                        Connected ✓
                                      </Button>
                                    )}
                                  </>
                                )}
                                {isOwnProfile && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled
                                    className="cursor-not-allowed text-gray-400"
                                  >
                                    You
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
    </AppLayout>
  );
};