
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Award, MessageSquare, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const MentorshipPage = (): JSX.Element => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);
  const [expertiseFilter, setExpertiseFilter] = useState('all');

  useEffect(() => {
    fetchMentors();
  }, [expertiseFilter]);

  const fetchMentors = async () => {
    try {
      const params = new URLSearchParams();
      if (expertiseFilter !== 'all') params.append('expertise', expertiseFilter);

      const response = await fetch(`/api/mentorship/mentors?${params.toString()}`, {
        headers: { 'user-id': user?.id || '' }
      });

      if (response.ok) {
        const data = await response.json();
        setMentors(data.mentors || []);
      }
    } catch (error) {
      console.error('Error fetching mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMentorship = async (mentorId: string) => {
    try {
      const response = await fetch('/api/mentorship/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user?.id || ''
        },
        body: JSON.stringify({ mentorId })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Mentorship request sent!',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send request',
        variant: 'destructive'
      });
    }
  };

  const toggleMentorStatus = async () => {
    try {
      const response = await fetch('/api/mentorship/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user?.id || ''
        },
        body: JSON.stringify({ isMentor: !isMentor })
      });

      if (response.ok) {
        setIsMentor(!isMentor);
        toast({
          title: 'Success',
          description: isMentor ? 'Mentor status disabled' : 'You are now a mentor!',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update mentor status',
        variant: 'destructive'
      });
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alumni Mentorship</h1>
              <p className="text-gray-600">Connect with experienced alumni for guidance</p>
            </div>
            <Button
              onClick={toggleMentorStatus}
              className={isMentor ? 'bg-red-600 hover:bg-red-700' : 'bg-[#008060] hover:bg-[#006b51]'}
            >
              <Users className="w-4 h-4 mr-2" />
              {isMentor ? 'Disable Mentor Status' : 'Become a Mentor'}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by expertise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="education">Education</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <Card key={mentor.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={mentor.profile_picture} />
                      <AvatarFallback className="bg-[#008060] text-white">
                        {mentor.first_name?.[0]}{mentor.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{mentor.first_name} {mentor.last_name}</CardTitle>
                      <p className="text-sm text-gray-600">{mentor.current_position}</p>
                      <p className="text-xs text-gray-500">{mentor.current_company}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Expertise</p>
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise?.slice(0, 3).map((exp: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRequestMentorship(mentor.user_id)}
                    className="w-full bg-[#008060] hover:bg-[#006b51]"
                    size="sm"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Request Mentorship
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
