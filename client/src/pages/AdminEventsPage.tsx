import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  is_virtual: boolean;
  virtual_link: string | null;
  max_attendees: number | null;
  registration_deadline: string | null;
  cover_image: string | null;
  organized_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const AdminEventsPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filesDialog, setFilesDialog] = useState(false);
  const [eventFiles, setEventFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deleteFileDialog, setDeleteFileDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Initialize Supabase client
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    location: "",
    is_virtual: false,
    virtual_link: "",
    max_attendees: "",
    registration_deadline: "",
    cover_image: "",
    is_active: true
  });

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Automatic logout on tab close for admins (not on refresh)
  useEffect(() => {
    const handleUnload = () => {
      sessionStorage.setItem('adminRefresh', Date.now().toString());
    };

    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const userId = user?.id || localStorage.getItem('userId');

      const response = await fetch('/api/events?includeInactive=true', {
        headers: {
          'user-id': userId || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        throw new Error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when filters change with debouncing
  useEffect(() => {
    // Skip initial render to prevent double fetch
    if (!events.length && !searchTerm) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      // The filtering happens automatically via filteredEvents
    }, 300); // 300ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Filter events
  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_date: "",
      location: "",
      is_virtual: false,
      virtual_link: "",
      max_attendees: "",
      registration_deadline: "",
      cover_image: "",
      is_active: true
    });
    // Clear any pending cover image upload
    delete (window as any).__pendingEventCover;
  };

  // Open create dialog
  const handleCreateClick = () => {
    resetForm();
    setCreateDialog(true);
  };

  // Open edit dialog
  const handleEditClick = async (event: Event) => {
    setSelectedEvent(event);

    // Fetch current cover image from storage if it exists
    let currentCoverImage = "";

    if (event.id) {
      try {
        // List files in the event's directory
        const { data: files, error } = await supabase.storage
          .from('event_covers')
          .list(event.id);

        if (!error && files && files.length > 0) {
          // Find the cover image file (should be named cover.{ext})
          const coverFile = files.find(file => file.name.startsWith('cover.'));

          if (coverFile) {
            const filePath = `${event.id}/${coverFile.name}`;
            const { data: publicUrlData } = supabase.storage
              .from('event_covers')
              .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
              currentCoverImage = publicUrlData.publicUrl + '?t=' + Date.now(); // Add timestamp to bypass cache
            }
          }
        }
      } catch (error) {
        console.error('Error fetching cover image:', error);
      }
    }

    setFormData({
      title: event.title || "",
      description: event.description || "",
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
      location: event.location || "",
      is_virtual: event.is_virtual || false,
      virtual_link: event.virtual_link || "",
      max_attendees: event.max_attendees?.toString() || "",
      registration_deadline: event.registration_deadline ? new Date(event.registration_deadline).toISOString().slice(0, 16) : "",
      cover_image: currentCoverImage,
      is_active: event.is_active
    });
    setEditDialog(true);
  };

  // Open delete dialog
  const handleDeleteClick = (event: Event) => {
    setSelectedEvent(event);
    setDeleteDialog(true);
  };

  // Custom validation function
  const validateEventData = (eventDate: string, registrationDeadline: string, maxAttendees: string) => {
    // Validate registration deadline is before event date
    if (registrationDeadline && eventDate && new Date(registrationDeadline) >= new Date(eventDate)) {
      toast({
        title: "Validation Error",
        description: "Registration deadline must be before the event date",
        variant: "destructive"
      });
      return false;
    }

    // Validate max attendees
    const attendees = maxAttendees ? parseInt(maxAttendees) : null;
    if (maxAttendees !== "" && (isNaN(attendees as number) || attendees! <= 0)) {
      toast({
        title: "Validation Error",
        description: "Max attendees must be a positive number greater than 0",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  // Create event
  const handleCreate = async () => {
    if (!formData.title || !formData.event_date) {
      toast({
        title: "Validation Error",
        description: "Title and Event Date are required",
        variant: "destructive"
      });
      return;
    }

    // Additional validation for virtual events
    if (formData.is_virtual && !formData.virtual_link) {
      toast({
        title: "Validation Error",
        description: "Virtual link is required for virtual events",
        variant: "destructive"
      });
      return;
    }

    // Validate event data before submission
    if (!validateEventData(formData.event_date, formData.registration_deadline, formData.max_attendees)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = user?.id || localStorage.getItem('userId');

      // First create the event without cover image
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || ''
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          eventDate: formData.event_date,
          location: formData.location || null,
          isVirtual: formData.is_virtual,
          virtualLink: formData.virtual_link || null,
          maxAttendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
          registrationDeadline: formData.registration_deadline || null,
          coverImage: null,
          isActive: formData.is_active
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create event: ${errorText}`);
      }

      const { event } = await response.json();
      const eventId = event.id;

      // Upload cover image if one is pending, using the event ID as directory
      const pendingCoverFile = (window as any).__pendingEventCover as File;

      if (pendingCoverFile) {
        const fileExt = pendingCoverFile.name.split('.').pop()?.toLowerCase() || '';
        const filePath = `${eventId}/cover.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event_covers')
          .upload(filePath, pendingCoverFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error('Failed to upload cover image:', uploadError);
          toast({
            title: "Warning",
            description: "Event created but cover image upload failed",
            variant: "destructive"
          });
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('event_covers')
            .getPublicUrl(uploadData.path);

          // Update event with cover image URL
          await fetch(`/api/events/${eventId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'user-id': userId || ''
            },
            body: JSON.stringify({
              ...event,
              coverImage: publicUrlData.publicUrl
            })
          });
        }

        delete (window as any).__pendingEventCover; // Clear pending upload
      }

      toast({
        title: "Success",
        description: "Event created successfully",
      });

      setCreateDialog(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to create event",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update event
  const handleUpdate = async () => {
    if (!selectedEvent) return;

    if (!formData.title || !formData.event_date) {
      toast({
        title: "Validation Error",
        description: "Title and Event Date are required",
        variant: "destructive"
      });
      return;
    }

    // Additional validation for virtual events
    if (formData.is_virtual && !formData.virtual_link) {
      toast({
        title: "Validation Error",
        description: "Virtual link is required for virtual events",
        variant: "destructive"
      });
      return;
    }

    // Validate event data before submission
    if (!validateEventData(formData.event_date, formData.registration_deadline, formData.max_attendees)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = user?.id || localStorage.getItem('userId');

      // Handle cover image update/deletion
      let uploadedCoverImageUrl = formData.cover_image;
      const pendingCoverFile = (window as any).__pendingEventCover as File;

      if (pendingCoverFile) {
        // Delete existing cover image if it exists
        if (selectedEvent.cover_image) {
          const existingImagePath = selectedEvent.cover_image.split('/storage/v1/object/public/event_covers/')[1];
          if (existingImagePath) {
            const { error: deleteError } = await supabase.storage
              .from('event_covers')
              .remove([existingImagePath]);
            if (deleteError) {
              console.warn(`Could not delete existing cover image: ${deleteError.message}`);
            }
          }
        }

        // Upload new cover image
        const fileExt = pendingCoverFile.name.split('.').pop()?.toLowerCase() || '';
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('event_covers')
          .upload(`${selectedEvent.id}/cover.${fileExt}`, pendingCoverFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload cover image: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('event_covers')
          .getPublicUrl(uploadData.path);

        uploadedCoverImageUrl = publicUrlData.publicUrl || formData.cover_image;
        delete (window as any).__pendingEventCover; // Clear pending upload
      } else if (!formData.cover_image && selectedEvent.cover_image) {
        // Image was deleted but no new one uploaded
        const existingImagePath = selectedEvent.cover_image.split('/storage/v1/object/public/event_covers/')[1];
        if (existingImagePath) {
          const { error: deleteError } = await supabase.storage
            .from('event_covers')
            .remove([existingImagePath]);
          if (deleteError) {
            console.warn(`Could not delete existing cover image: ${deleteError.message}`);
          }
        }
        uploadedCoverImageUrl = null;
      }


      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || ''
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          eventDate: formData.event_date,
          location: formData.location || null,
          isVirtual: formData.is_virtual,
          virtualLink: formData.virtual_link || null,
          maxAttendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
          registrationDeadline: formData.registration_deadline || null,
          coverImage: uploadedCoverImageUrl || null,
          isActive: formData.is_active
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update event: ${errorText}`);
      }

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      setEditDialog(false);
      setSelectedEvent(null);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update event",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete event
  const handleDelete = async () => {
    if (!selectedEvent) return;

    setIsSubmitting(true);
    try {
      const userId = user?.id || localStorage.getItem('userId');

      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: {
          'user-id': userId || ''
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete event: ${errorText}`);
      }

      // Optionally delete the cover image from Supabase storage
      if (selectedEvent.cover_image) {
        const existingImagePath = selectedEvent.cover_image.split('/').pop(); // Extract filename
        if (existingImagePath) {
          const { error: deleteError } = await supabase.storage
            .from('event_covers')
            .remove([`${selectedEvent.id}/${existingImagePath}`]); // Assuming path is eventId/filename
          if (deleteError) {
            console.warn(`Could not delete cover image for event ${selectedEvent.id}: ${deleteError.message}`);
          }
        }
      }

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      setDeleteDialog(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete event",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Handle file upload for event documents
  const handleFileUpload = async (eventId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${eventId}/${fileName}`;

      const { error } = await supabase.storage
        .from('event_docs')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload file",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "File uploaded successfully"
      });

      // Refresh file list if dialog is open for this event
      if (selectedEvent?.id === eventId) {
        fetchEventFiles(eventId);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    }
  };

  // Fetch files for an event
  const fetchEventFiles = async (eventId: string) => {
    try {
      setLoadingFiles(true);
      const { data, error } = await supabase.storage
        .from('event_docs')
        .list(eventId, {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Fetch files error:', error);
        toast({
          title: "Error",
          description: "Failed to load files",
          variant: "destructive"
        });
        return;
      }

      setEventFiles(data?.map(file => file.name) || []);
    } catch (error) {
      console.error('Fetch files error:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  // Open files dialog
  const handleViewFiles = async (event: Event) => {
    setSelectedEvent(event);
    setFilesDialog(true);
    await fetchEventFiles(event.id);
  };

  // Delete file
  const handleDeleteFile = async () => {
    if (!selectedEvent || !fileToDelete) return;

    try {
      const filePath = `${selectedEvent.id}/${fileToDelete}`;
      const { error } = await supabase.storage
        .from('event_docs')
        .remove([filePath]);

      if (error) {
        console.error('Delete file error:', error);
        toast({
          title: "Error",
          description: "Failed to delete file",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "File deleted successfully"
      });

      setDeleteFileDialog(false);
      setFileToDelete(null);
      await fetchEventFiles(selectedEvent.id);
    } catch (error) {
      console.error('Delete file error:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  // Download/View file
  const handleViewFile = async (fileName: string) => {
    if (!selectedEvent) return;

    try {
      const filePath = `${selectedEvent.id}/${fileName}`;
      const { data } = supabase.storage
        .from('event_docs')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('View file error:', error);
      toast({
        title: "Error",
        description: "Failed to open file",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Shared Admin Sidebar */}
      <AdminSidebar currentPage="events" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-gray-600 hover:text-[#008060]"
                onClick={() => setLocation('/admin/dashboard')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline">Back</span>
              </Button>
              <h2 className="text-xl font-semibold text-gray-900">Events Management</h2>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="text-gray-600 hover:bg-red-50 hover:text-red-600"
                onClick={() => {
                  localStorage.removeItem('user');
                  localStorage.removeItem('userId');
                  setLocation('/admin/login');
                }}
              >
                <span className="mr-2">🚪</span>
                Log Out
              </Button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user?.username || 'Admin'}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-[#008060] to-[#006b51] rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold">{user?.username?.charAt(0).toUpperCase() || 'A'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 bg-gradient-to-br from-gray-50 to-white overflow-auto">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Events Management</h1>
                <p className="text-sm text-gray-600">Create, edit, and manage all events</p>
              </div>
              <Button
                onClick={handleCreateClick}
                className="bg-gradient-to-r from-[#008060] to-[#006b51] hover:from-[#006b51] hover:to-[#005d47] text-white shadow-lg"
              >
                <span className="mr-2">➕</span>
                Create New Event
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-lg bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#008060]">{events.length}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Expired Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{events.filter(e => new Date(e.event_date) < new Date()).length}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Virtual Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{events.filter(e => e.is_virtual).length}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">In-Person Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{events.filter(e => !e.is_virtual).length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <Card className="mb-6 border-0 shadow-lg bg-white/80">
            <CardContent className="p-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <Input
                  type="text"
                  placeholder="Search events by title, description, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Search updates automatically on input change
                    }
                  }}
                  className="pl-10 border-2 border-gray-200 focus:border-[#008060]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card className="border-0 shadow-lg bg-white/80">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>📅</span>
                All Events ({filteredEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin"></div>
                    <p className="text-gray-600">Loading events...</p>
                  </div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No events found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Title</TableHead>
                        <TableHead className="font-semibold text-gray-700">Event Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Location</TableHead>
                        <TableHead className="font-semibold text-gray-700">Type</TableHead>
                        <TableHead className="font-semibold text-gray-700">Max Attendees</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>{formatDate(event.event_date)}</TableCell>
                          <TableCell>{event.location || 'Not specified'}</TableCell>
                          <TableCell>
                            <Badge variant={event.is_virtual ? "default" : "secondary"}>
                              {event.is_virtual ? '🌐 Virtual' : '📍 In-Person'}
                            </Badge>
                          </TableCell>
                          <TableCell>{event.max_attendees || 'Unlimited'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              new Date(event.event_date) < new Date() 
                                ? "secondary" 
                                : event.is_active 
                                  ? "default" 
                                  : "destructive"
                            }>
                              {new Date(event.event_date) < new Date() 
                                ? 'Expired' 
                                : event.is_active 
                                  ? 'Active' 
                                  : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(event)}
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                              >
                                ✏️ Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewFiles(event)}
                                className="border-purple-500 text-purple-600 hover:bg-purple-50"
                              >
                                📁 Files
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*,.pdf,.doc,.docx';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      handleFileUpload(event.id, file);
                                    }
                                  };
                                  input.click();
                                }}
                                className="border-green-500 text-green-600 hover:bg-green-50"
                              >
                                📤 Upload
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteClick(event)}
                                className="border-red-500 text-red-600 hover:bg-red-50"
                              >
                                🗑️ Delete
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
        </main>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-3xl bg-white border-2 border-[#008060]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>➕</span>
              Create New Event
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Fill in the details to create a new event. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Event Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Annual Alumni Meet 2025"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe your event..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Event Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Registration Deadline</label>
                <Input
                  type="datetime-local"
                  value={formData.registration_deadline}
                  onChange={(e) => setFormData({...formData, registration_deadline: e.target.value})}
                  onBlur={() => {
                    if (formData.registration_deadline && formData.event_date) {
                      validateEventData(formData.event_date, formData.registration_deadline, formData.max_attendees);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="City, Country or leave empty for virtual"
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Switch
                checked={formData.is_virtual}
                onCheckedChange={(checked) => setFormData({...formData, is_virtual: checked})}
              />
              <label className="text-sm font-medium text-gray-700">This is a virtual event</label>
            </div>

            {formData.is_virtual && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Virtual Link *</label>
                <Input
                  value={formData.virtual_link}
                  onChange={(e) => setFormData({...formData, virtual_link: e.target.value})}
                  placeholder="https://zoom.us/..."
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Attendees</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData({...formData, max_attendees: e.target.value})}
                  onBlur={() => {
                    if (formData.max_attendees) {
                      validateEventData(formData.event_date, formData.registration_deadline, formData.max_attendees);
                    }
                  }}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Event Cover Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#008060] transition-colors cursor-pointer"
                  onClick={() => document.getElementById('create-event-cover-upload')?.click()}
                >
                  {formData.cover_image ? (
                    <div className="space-y-2">
                      <img src={formData.cover_image} alt="Event cover" className="max-h-40 mx-auto rounded" />
                      <p className="text-sm text-gray-600">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-4xl">📸</div>
                      <p className="text-sm text-gray-600">Click to upload event cover image</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  id="create-event-cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Temporarily store the file for upload after event creation
                      (window as any).__pendingEventCover = file;
                      // Show preview
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setFormData({...formData, cover_image: e.target?.result as string});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <label className="text-sm font-medium text-gray-700">Set event as active</label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#008060] to-[#006b51] text-white"
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-3xl bg-white border-2 border-[#008060]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>✏️</span>
              Edit Event
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Update the event details below. Changes will be reflected immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Event Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Annual Alumni Meet 2025"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe your event..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Event Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Registration Deadline</label>
                <Input
                  type="datetime-local"
                  value={formData.registration_deadline}
                  onChange={(e) => setFormData({...formData, registration_deadline: e.target.value})}
                  onBlur={() => {
                    if (formData.registration_deadline && formData.event_date) {
                      validateEventData(formData.event_date, formData.registration_deadline, formData.max_attendees);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="City, Country or leave empty for virtual"
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Switch
                checked={formData.is_virtual}
                onCheckedChange={(checked) => setFormData({...formData, is_virtual: checked})}
              />
              <label className="text-sm font-medium text-gray-700">This is a virtual event</label>
            </div>

            {formData.is_virtual && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Virtual Link *</label>
                <Input
                  value={formData.virtual_link}
                  onChange={(e) => setFormData({...formData, virtual_link: e.target.value})}
                  placeholder="https://zoom.us/..."
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Attendees</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData({...formData, max_attendees: e.target.value})}
                  onBlur={() => {
                    if (formData.max_attendees) {
                      validateEventData(formData.event_date, formData.registration_deadline, formData.max_attendees);
                    }
                  }}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Event Cover Image</label>
                {formData.cover_image ? (
                  <div className="space-y-3">
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 mb-3">Current Cover Image</p>
                      <div className="flex flex-col items-center gap-3">
                        <img src={formData.cover_image} alt="Current event cover" className="max-h-48 w-auto rounded object-cover" />
                        <div className="flex gap-2 w-full justify-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('edit-event-cover-upload')?.click()}
                            className="border-blue-500 text-blue-600 hover:bg-blue-50"
                          >
                            🔄 Replace Image
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (selectedEvent?.cover_image) {
                                try {
                                  // Extract the path from the URL
                                  const coverImagePath = selectedEvent.cover_image.split('/storage/v1/object/public/event_covers/')[1];
                                  if (coverImagePath) {
                                    const { error } = await supabase.storage
                                      .from('event_covers')
                                      .remove([coverImagePath]);

                                    if (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to delete cover image",
                                        variant: "destructive"
                                      });
                                    } else {
                                      setFormData({...formData, cover_image: ""});
                                      toast({
                                        title: "Success",
                                        description: "Cover image deleted successfully"
                                      });
                                    }
                                  }
                                } catch (error) {
                                  console.error('Delete cover error:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete cover image",
                                    variant: "destructive"
                                  });
                                }
                              } else {
                                setFormData({...formData, cover_image: ""});
                              }
                            }}
                            className="border-red-500 text-red-600 hover:bg-red-50"
                          >
                            🗑️ Delete Image
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#008060] transition-colors cursor-pointer"
                    onClick={() => document.getElementById('edit-event-cover-upload')?.click()}
                  >
                    <div className="space-y-2">
                      <div className="text-4xl">📸</div>
                      <p className="text-sm text-gray-600">Click to upload event cover image</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  </div>
                )}
                <input
                  id="edit-event-cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Temporarily store the file for upload after event update
                      (window as any).__pendingEventCover = file;
                      // Show preview
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setFormData({...formData, cover_image: e.target?.result as string});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <label className="text-sm font-medium text-gray-700">Set event as active</label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
            >
              {isSubmitting ? "Updating..." : "Update Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-red-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <span>⚠️</span>
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="bg-red-50 rounded-lg p-4 my-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Event to delete:</p>
              <p className="text-red-700 font-medium">{selectedEvent.title}</p>
              <p className="text-xs text-gray-600 mt-2">Date: {formatDate(selectedEvent.event_date)}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Files Management Dialog */}
      <Dialog open={filesDialog} onOpenChange={setFilesDialog}>
        <DialogContent className="sm:max-w-2xl bg-white border-2 border-purple-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-600 flex items-center gap-2">
              <span>📁</span>
              Event Files
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              {selectedEvent ? `Files for: ${selectedEvent.title}` : 'Manage event documents and images'}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600">Loading files...</p>
                </div>
              </div>
            ) : eventFiles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No files uploaded yet</p>
                <p className="text-sm text-gray-400 mt-2">Click the Upload button in the table to add files</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {eventFiles.map((fileName) => (
                  <div key={fileName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? '🖼️' : '📄'}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{fileName}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewFile(fileName)}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        👁️ View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFileToDelete(fileName);
                          setDeleteFileDialog(true);
                        }}
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFilesDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete File Confirmation Dialog */}
      <Dialog open={deleteFileDialog} onOpenChange={setDeleteFileDialog}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-red-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <span>⚠️</span>
              Confirm File Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {fileToDelete && (
            <div className="bg-red-50 rounded-lg p-4 my-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">File to delete:</p>
              <p className="text-red-700 font-medium break-all">{fileToDelete}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteFileDialog(false);
                setFileToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteFile}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};