import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Building2, 
  GraduationCap,
  Linkedin,
  Calendar,
  Download,
  Share2,
  UserPlus,
  MessageSquare,
  ArrowLeft,
  Globe
} from "lucide-react";

export const PublicProfilePage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/profile/:userId");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);

  const userId = params?.userId;

  useEffect(() => {
    if (userId) {
      fetchPublicProfile();
      checkConnectionStatus();
    }
  }, [userId]);

  const fetchPublicProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/alumni/public/${userId}`);

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
        setLocation('/feed');
      }
    } catch (error) {
      console.error('Error fetching public profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!currentUser?.id) return;

    try {
      const response = await fetch(`/api/connections/status/${userId}`, {
        headers: {
          'user-id': currentUser.id
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.status);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleSendConnectionRequest = async () => {
    if (!currentUser?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send connection requests",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingRequest(true);
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          recipientId: userId,
          message: `Hi ${profile?.first_name}, I'd like to connect with you on the alumni network.`
        })
      });

      if (response.ok) {
        setConnectionStatus('pending');
        toast({
          title: "Success",
          description: "Connection request sent!",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to send connection request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSendMessage = () => {
    setLocation(`/inbox?compose=${userId}`);
  };

  const getProfilePicture = () => {
    if (profile?.profile_picture && typeof profile.profile_picture === 'string' && profile.profile_picture.trim() !== '') {
      return profile.profile_picture;
    }

    const firstName = (profile?.first_name || '').toString();
    const lastName = (profile?.last_name || '').toString();
    const displayName = `${firstName} ${lastName}`.trim() || 'User';
    const seed = encodeURIComponent(displayName);

    const gender = profile?.gender || 'default';
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">Profile not found</p>
              <Button 
                onClick={() => setLocation('/feed')} 
                className="mt-4 bg-[#008060] hover:bg-[#006b51]"
              >
                Go to Feed
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const firstName = (profile?.first_name || '').toString();
  const lastName = (profile?.last_name || '').toString();
  const displayName = `${firstName} ${lastName}`.trim() || currentUser?.username || 'User';
  const isOwnProfile = currentUser?.id === userId;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-gray-600 hover:text-[#008060]"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>

          {/* Profile Header Card */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                  <AvatarImage src={getProfilePicture()} />
                  <AvatarFallback className="text-3xl bg-[#008060] text-white">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayName}</h1>

                  {profile.current_position && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-700 mb-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{profile.current_position}</span>
                      {profile.current_company && (
                        <>
                          <span>at</span>
                          <Building2 className="w-4 h-4" />
                          <span className="font-semibold">{profile.current_company}</span>
                        </>
                      )}
                    </div>
                  )}

                  {profile.location && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-600 mb-4">
                    <GraduationCap className="w-4 h-4" />
                    <Badge variant="secondary" className="bg-[#008060]/10 text-[#008060]">
                      Class of {profile.graduation_year || profile.batch}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && currentUser && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                        {connectionStatus === 'none' && (
                          <Button
                            onClick={handleSendConnectionRequest}
                            disabled={sendingRequest}
                            className="bg-[#008060] hover:bg-[#006b51]"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            {sendingRequest ? 'Sending...' : 'Connect'}
                          </Button>
                        )}

                      {connectionStatus === 'pending' && (
                        <Button variant="outline" disabled>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Request Pending
                        </Button>
                      )}

                      {connectionStatus === 'connected' && (
                        <Badge variant="outline" className="px-4 py-2 text-green-600 border-green-600">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Connected
                        </Badge>
                      )}

                      <Button
                          variant="outline"
                          onClick={handleSendMessage}
                          className="border-[#008060] text-[#008060] hover:bg-[#008060]/10"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      </div>

                      {/* Additional Actions */}
                      <div className="flex gap-2 justify-center sm:justify-start">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const vCard = `BEGIN:VCARD\nVERSION:3.0\nFN:${displayName}\nEMAIL:${profile.show_email ? profile.email : ''}\nTEL:${profile.show_phone ? profile.phone : ''}\nEND:VCARD`;
                            const blob = new Blob([vCard], { type: 'text/vcard' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${displayName.replace(/\s+/g, '_')}.vcf`;
                            a.click();
                          }}
                          className="text-gray-600 hover:text-[#008060]"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download Contact
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: `${displayName}'s Profile`,
                                text: `Check out ${displayName}'s profile on our alumni network!`,
                                url: window.location.href
                              });
                            } else {
                              navigator.clipboard.writeText(window.location.href);
                              toast({ title: "Link copied to clipboard!" });
                            }
                          }}
                          className="text-gray-600 hover:text-[#008060]"
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          Share Profile
                        </Button>
                      </div>
                    </div>
                  )}

                  {isOwnProfile && (
                    <Button
                      onClick={() => setLocation('/profile')}
                      className="bg-[#008060] hover:bg-[#006b51]"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          {profile.bio && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Professional Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.current_company && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Current Company</p>
                    <p className="font-semibold text-gray-900">{profile.current_company}</p>
                  </div>
                </div>
              )}

              {profile.current_position && (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Current Position</p>
                    <p className="font-semibold text-gray-900">{profile.current_position}</p>
                  </div>
                </div>
              )}

              {profile.linkedin_url && (
                <div className="flex items-start gap-3">
                  <Linkedin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">LinkedIn</p>
                    <a 
                      href={profile.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Profile <Globe className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.batch && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Batch</p>
                    <p className="font-semibold text-gray-900">{profile.batch}</p>
                  </div>
                </div>
              )}

              {profile.graduation_year && (
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Graduation Year</p>
                    <p className="font-semibold text-gray-900">{profile.graduation_year}</p>
                  </div>
                </div>
              )}

              {profile.course && (
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Course</p>
                    <p className="font-semibold text-gray-900">{profile.course}</p>
                  </div>
                </div>
              )}

              {profile.branch && (
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Branch</p>
                    <p className="font-semibold text-gray-900">{profile.branch}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information (Privacy Aware) */}
          {(profile.show_email || profile.show_phone) && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.show_email && profile.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a 
                        href={`mailto:${profile.email}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {profile.email}
                      </a>
                    </div>
                  </div>
                )}

                {profile.show_phone && profile.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <a 
                        href={`tel:${profile.phone}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {profile.phone}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};