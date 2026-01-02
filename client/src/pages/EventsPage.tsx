import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time?: string;
  location: string;
  venue: string;
  is_virtual: boolean;
  virtual_link?: string;
  cover_image?: string;
  max_attendees?: number;
  registration_deadline?: string;
  organized_by: string;
  organizer?: {
    id: string;
    username: string;
    email: string;
  };
  tags?: string[];
  is_active?: boolean;
  rsvp_count?: number;
  user_rsvp?: {
    status: string;
    guests_count: number;
  };
}

export const EventsPage = (): JSX.Element => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Set page title
  React.useEffect(() => {
    document.title = "Events - TKS Alumni Portal";
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventHeading, setEventHeading] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [selectedEventTags, setSelectedEventTags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rsvpDialog, setRsvpDialog] = useState(false);
  const [selectedEventForRsvp, setSelectedEventForRsvp] = useState<Event | null>(null);
  const [rsvpGuestsCount, setRsvpGuestsCount] = useState(0);
  const [rsvpNotes, setRsvpNotes] = useState("");
  const [eventDetailsDialog, setEventDetailsDialog] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<Event | null>(null);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  const availableTags = [
    { name: "Reunion", color: "bg-yellow-100 text-yellow-800" },
    { name: "Meetup", color: "bg-purple-100 text-purple-800" },
    { name: "Social", color: "bg-pink-100 text-pink-800" },
    { name: "Fun", color: "bg-green-100 text-green-800" },
    { name: "Academic", color: "bg-cyan-100 text-cyan-800" },
    { name: "Professional", color: "bg-indigo-100 text-indigo-800" },
    { name: "Sports", color: "bg-orange-100 text-orange-800" },
    { name: "Networking", color: "bg-blue-100 text-blue-800" },
    { name: "Career", color: "bg-emerald-100 text-emerald-800" },
    { name: "Webinar", color: "bg-teal-100 text-teal-800" },
    { name: "Workshop", color: "bg-violet-100 text-violet-800" },
    { name: "Cultural", color: "bg-rose-100 text-rose-800" }
  ];

  const getTagColor = (tag: string) => {
    const tagData = availableTags.find(t => t.name === tag);
    return tagData?.color || "bg-gray-100 text-gray-800";
  };

  const toggleEventTag = (tagName: string) => {
    setSelectedEventTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const userId = user?.id || localStorage.getItem('userId');
      const params = new URLSearchParams();

      if (searchTerm && searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedLocation && selectedLocation.trim()) params.append('location', selectedLocation.trim());
      if (selectedTag && selectedTag.trim()) params.append('tag', selectedTag.trim());

      const response = await fetch(`/api/events?${params.toString()}`, {
        headers: {
          'user-id': userId || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load events",
        variant: "destructive"
      });
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Extract unique locations from events for filter dropdown
  useEffect(() => {
    const locations = events
      .map(event => event.location)
      .filter((location): location is string => !!location && location.trim() !== '')
      .filter((location, index, self) => self.indexOf(location) === index)
      .sort();
    setAvailableLocations(locations);
  }, [events]);

  // Auto-search when filters change with debouncing
  useEffect(() => {
    // Skip initial render to prevent double fetch
    if (!events.length && !searchTerm && !selectedLocation && !selectedTag) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchEvents();
    }, 300); // 300ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedLocation, selectedTag]);

  const handleCreateEvent = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create an event",
        variant: "destructive",
      });
      return;
    }

    if (!eventHeading.trim() || !eventDescription.trim() || !eventDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      const userId = user?.id || localStorage.getItem('userId');

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || ''
        },
        body: JSON.stringify({
          title: eventHeading,
          description: eventDescription,
          eventDate: eventDate, // Send as YYYY-MM-DD
          eventTime: eventTime || null,
          location: eventLocation || null,
          venue: eventVenue || null,
          imageUrl: null,
          tags: selectedEventTags,
          maxParticipants: maxAttendees ? parseInt(maxAttendees) : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: "Event created successfully!",
        });

        // Reset form
        setEventHeading("");
        setEventDescription("");
        setEventDate("");
        setEventTime("");
        setEventLocation("");
        setEventVenue("");
        setIsVirtual(false);
        setVirtualLink("");
        setMaxAttendees("");
        setSelectedEventTags([]);
        setIsCreateEventOpen(false);

        // Refresh events list
        fetchEvents();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create event",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  const applyFilters = async () => {
    try {
      setIsLoading(true);
      await fetchEvents();
    } catch (error) {
      console.error('Error applying filters:', error);
      toast({
        title: "Error",
        description: "Failed to apply filters. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = async () => {
    try {
      // Reset all filter states
      setSearchTerm("");
      setSelectedLocation("");
      setSelectedTag("");
      setIsLoading(true);

      // Fetch all events without any filters
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch('/api/events', {
        headers: {
          'user-id': userId || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error clearing filters:', error);
      toast({
        title: "Error",
        description: "Failed to clear filters. Please try again.",
        variant: "destructive"
      });
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Time TBA';
    return timeString;
  };

  const handleRsvpClick = (event: Event) => {
    if (!user?.id) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to RSVP.",
        variant: "destructive",
      });
      return;
    }
    setSelectedEventForRsvp(event);
    setRsvpGuestsCount(event.user_rsvp?.guests_count || 0);
    setRsvpNotes("");
    setRsvpDialog(true);
  };

  const handleRsvpSubmit = async () => {
    if (!selectedEventForRsvp || !user?.id) return;

    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/events/${selectedEventForRsvp.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || ''
        },
        body: JSON.stringify({ 
          status: 'attending',
          guestsCount: rsvpGuestsCount,
          notes: rsvpNotes
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "RSVP confirmed!",
        });
        setRsvpDialog(false);
        fetchEvents();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to RSVP",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error RSVPing:', error);
      toast({
        title: "Error",
        description: "Failed to RSVP",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEventDetails(event);
    setEventDetailsDialog(true);
  };

  const isRegistrationOpen = (event: Event) => {
    if (!event.registration_deadline) return true;
    return new Date(event.registration_deadline) > new Date();
  };

  const getEventStatus = (event: Event) => {
    const eventDate = new Date(event.event_date);
    const now = new Date();

    if (eventDate < now) return { label: "Completed", color: "bg-gray-500" };
    if (!event.is_active) return { label: "Cancelled", color: "bg-red-500" };
    if (!isRegistrationOpen(event)) return { label: "Registration Closed", color: "bg-orange-500" };
    return { label: "Upcoming", color: "bg-green-500" };
  };

  return (
    <AppLayout currentPage="events">
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
          {/* Post Event Section */}
          {user?.is_admin && (
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-700">Wish to alert your peers about an event ?</p>
              <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#008060] hover:bg-[#007055] text-white px-6 py-2 rounded flex items-center gap-2">
                    Post an Event
                    <span>📤</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Event</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                        <span className="text-orange-800 font-medium">{user?.username?.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium">{user?.username}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto text-red-500 border-red-500 hover:bg-red-50"
                        onClick={() => setIsCreateEventOpen(false)}
                      >
                        Cancel ✗
                      </Button>
                    </div>

                    {/* Event Heading */}
                    <div>
                      <Input
                        placeholder="Event Heading *"
                        value={eventHeading}
                        onChange={(e) => setEventHeading(e.target.value)}
                        className="border-gray-300"
                        required
                      />
                    </div>

                    {/* Event Description */}
                    <div>
                      <Textarea
                        placeholder="What's happening ? *"
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        className="min-h-[120px] border-gray-300 resize-none"
                        required
                      />
                    </div>

                    {/* Event Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Event Date *</label>
                        <Input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="border-gray-300"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Event Time</label>
                        <Input
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Location and Venue */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Location</label>
                        <Input
                          placeholder="Event location (e.g., Pune)"
                          value={eventLocation}
                          onChange={(e) => setEventLocation(e.target.value)}
                          className="border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Venue</label>
                        <Input
                          placeholder="Event venue (e.g., Hotel Grand)"
                          value={eventVenue}
                          onChange={(e) => setEventVenue(e.target.value)}
                          className="border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Virtual Event */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isVirtual"
                        checked={isVirtual}
                        onChange={(e) => setIsVirtual(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="isVirtual" className="text-sm font-medium">This is a virtual event</label>
                    </div>

                    {/* Virtual Link */}
                    {isVirtual && (
                      <div>
                        <label className="text-sm font-medium mb-1 block">Virtual Link</label>
                        <Input
                          placeholder="Virtual meeting link"
                          value={virtualLink}
                          onChange={(e) => setVirtualLink(e.target.value)}
                          className="border-gray-300"
                        />
                      </div>
                    )}

                    {/* Max Attendees */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Max Attendees (optional)</label>
                      <Input
                        type="number"
                        placeholder="Maximum number of attendees"
                        value={maxAttendees}
                        onChange={(e) => setMaxAttendees(e.target.value)}
                        className="border-gray-300"
                      />
                    </div>

                    {/* Add Tags Section */}
                    <div>
                      <p className="text-sm font-medium mb-3">Add Tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <Badge
                            key={tag.name}
                            variant="outline"
                            className={`cursor-pointer transition-colors ${
                              selectedEventTags.includes(tag.name)
                                ? tag.color
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                            onClick={() => toggleEventTag(tag.name)}
                          >
                            {tag.name}
                            {selectedEventTags.includes(tag.name) && ' ✓'}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Post Button */}
                    <div className="flex justify-end pt-4">
                      <Button
                        className="bg-[#008060] hover:bg-[#007055] text-white px-8"
                        onClick={handleCreateEvent}
                        disabled={isPosting || !eventHeading.trim() || !eventDescription.trim() || !eventDate}
                      >
                        {isPosting ? "Posting..." : "Post Event"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Recent Events Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Events</h2>

            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-4">
              <Input
                placeholder="Search event by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyFilters();
                  }
                }}
                className="flex-1 max-w-md"
              />

              <Select value={selectedLocation || undefined} onValueChange={(value) => setSelectedLocation(value === "all" ? "" : value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {availableLocations.map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTag || undefined} onValueChange={(value) => setSelectedTag(value === "all" ? "" : value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Tag(s)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {availableTags.map(tag => (
                    <SelectItem key={tag.name} value={tag.name}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="text-[#008060] border-[#008060]"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>

              <Button
                className="bg-gray-800 hover:bg-gray-700 text-white"
                onClick={applyFilters}
              >
                Apply Filter
              </Button>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No events found</div>
            ) : (
              events.map((event) => {
                const status = getEventStatus(event);
                const registrationOpen = isRegistrationOpen(event);

                return (
                  <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow max-w-full">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Event Image */}
                        <div className="md:w-48 lg:w-56 xl:w-64 h-48 md:h-auto flex-shrink-0">
                          <img
                            src={event.cover_image || "/figmaAssets/rectangle-10.png"}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 p-4">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                              {/* Status Badge */}
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${status.color} text-white`}>
                                  {status.label}
                                </Badge>
                                {event.is_virtual && (
                                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                                    🌐 Virtual
                                  </Badge>
                                )}
                                {event.user_rsvp && (
                                  <Badge variant="outline" className="border-green-500 text-green-600">
                                    ✓ You're attending
                                  </Badge>
                                )}
                              </div>

                              <h3 className="text-lg font-semibold text-[#008060] mb-2">
                                {event.title}
                              </h3>

                              <div className="space-y-1 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-2">
                                  📅 {formatDate(event.event_date)}
                                  {event.event_time && <span>| ⏰ {formatTime(event.event_time)}</span>}
                                </div>
                                {event.venue && (
                                  <div className="flex items-center gap-2">
                                    📍 {event.venue}{event.location && `, ${event.location}`}
                                  </div>
                                )}
                                {event.max_attendees && (
                                  <div className="flex items-center gap-2">
                                    👥 {event.rsvp_count || 0} / {event.max_attendees} attendees
                                  </div>
                                )}
                                {event.registration_deadline && (
                                  <div className="flex items-center gap-2">
                                    ⏳ Registration closes: {formatDate(event.registration_deadline)}
                                  </div>
                                )}
                              </div>

                              <p className="text-gray-700 text-sm mb-3 leading-relaxed line-clamp-2">
                                {event.description}
                              </p>

                              {/* Tags */}
                              {event.tags && event.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {event.tags.map((tag, index) => (
                                    <span
                                      key={index}
                                      className={`px-2 py-1 text-xs rounded ${getTagColor(tag)}`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex md:flex-col gap-2 md:ml-4">
                              <Button 
                                className="bg-[#008060] hover:bg-[#007055] text-white px-6 py-2 text-sm flex-1 md:flex-none"
                                onClick={() => handleViewDetails(event)}
                              >
                                View Details
                              </Button>
                              {status.label === "Upcoming" && registrationOpen && (
                                <Button 
                                  variant="outline"
                                  className="border-[#008060] text-[#008060] hover:bg-[#008060] hover:text-white px-6 py-2 text-sm flex-1 md:flex-none"
                                  onClick={() => handleRsvpClick(event)}
                                >
                                  {event.user_rsvp ? 'Update RSVP' : 'RSVP Now'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
    {/* RSVP Dialog */}
      <Dialog open={rsvpDialog} onOpenChange={setRsvpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>RSVP for {selectedEventForRsvp?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Number of Guests (including yourself)
              </label>
              <Input
                type="number"
                min="1"
                max={selectedEventForRsvp?.max_attendees || 10}
                value={rsvpGuestsCount || 1}
                onChange={(e) => setRsvpGuestsCount(parseInt(e.target.value) || 1)}
                className="border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedEventForRsvp?.max_attendees && 
                  `Maximum ${selectedEventForRsvp.max_attendees} attendees allowed`
                }
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Additional Notes (Optional)
              </label>
              <Textarea
                placeholder="Any dietary restrictions, accessibility needs, or questions..."
                value={rsvpNotes}
                onChange={(e) => setRsvpNotes(e.target.value)}
                className="min-h-[100px] border-gray-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRsvpDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-[#008060] hover:bg-[#007055] text-white"
              onClick={handleRsvpSubmit}
            >
              Confirm RSVP
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={eventDetailsDialog} onOpenChange={setEventDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#008060]">
              {selectedEventDetails?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedEventDetails && (
            <div className="space-y-4 py-4">
              {selectedEventDetails.cover_image && (
                <img
                  src={selectedEventDetails.cover_image}
                  alt={selectedEventDetails.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}

              <div className="flex flex-wrap gap-2">
                <Badge className={`${getEventStatus(selectedEventDetails).color} text-white`}>
                  {getEventStatus(selectedEventDetails).label}
                </Badge>
                {selectedEventDetails.is_virtual && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                    🌐 Virtual Event
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Date & Time</p>
                  <p className="text-sm text-gray-600">
                    📅 {formatDate(selectedEventDetails.event_date)}
                    {selectedEventDetails.event_time && (
                      <> | ⏰ {formatTime(selectedEventDetails.event_time)}</>
                    )}
                  </p>
                </div>

                {selectedEventDetails.venue && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Venue</p>
                    <p className="text-sm text-gray-600">
                      📍 {selectedEventDetails.venue}
                      {selectedEventDetails.location && `, ${selectedEventDetails.location}`}
                    </p>
                  </div>
                )}

                {selectedEventDetails.is_virtual && selectedEventDetails.virtual_link && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-gray-700">Virtual Link</p>
                    <a 
                      href={selectedEventDetails.virtual_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {selectedEventDetails.virtual_link}
                    </a>
                  </div>
                )}

                {selectedEventDetails.max_attendees && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Capacity</p>
                    <p className="text-sm text-gray-600">
                      👥 {selectedEventDetails.rsvp_count || 0} / {selectedEventDetails.max_attendees} attendees
                    </p>
                  </div>
                )}

                {selectedEventDetails.registration_deadline && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Registration Deadline</p>
                    <p className="text-sm text-gray-600">
                      ⏳ {formatDate(selectedEventDetails.registration_deadline)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedEventDetails.description}
                </p>
              </div>

              {selectedEventDetails.tags && selectedEventDetails.tags.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEventDetails.tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 text-sm rounded ${getTagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {getEventStatus(selectedEventDetails).label === "Upcoming" && 
               isRegistrationOpen(selectedEventDetails) && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full bg-[#008060] hover:bg-[#007055] text-white"
                    onClick={() => {
                      setEventDetailsDialog(false);
                      handleRsvpClick(selectedEventDetails);
                    }}
                  >
                    {selectedEventDetails.user_rsvp ? 'Update RSVP' : 'RSVP Now'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};