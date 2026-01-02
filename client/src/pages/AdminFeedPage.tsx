import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { CheckCircle, XCircle, Eye, Calendar, User, ArrowLeft } from "lucide-react";

export const AdminFeedPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    fetchPendingPosts();
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

  const fetchPendingPosts = async () => {
    try {
      setIsLoading(true);
      const userId = localStorage.getItem('userId');

      const response = await fetch('/api/admin/posts/pending', {
        headers: {
          'user-id': userId || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending posts');
      }

      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      toast({
        title: "Error",
        description: "Failed to load pending posts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPost = (post: any) => {
    setSelectedPost(post);
    setShowPostDialog(true);
  };

  const handleApproveClick = () => {
    setActionType('approve');
    setShowPostDialog(false);
    setShowConfirmDialog(true);
  };

  const handleRejectClick = () => {
    setActionType('reject');
    setShowPostDialog(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedPost) return;

    try {
      const userId = localStorage.getItem('userId');
      const endpoint = actionType === 'approve' 
        ? `/api/admin/posts/${selectedPost.id}/approve`
        : `/api/admin/posts/${selectedPost.id}/reject`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'user-id': userId || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${actionType} post`);
      }

      toast({
        title: "Success",
        description: `Post ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      // Remove post from list
      setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
      setShowConfirmDialog(false);
      setSelectedPost(null);
    } catch (error) {
      console.error(`Error ${actionType}ing post:`, error);
      toast({
        title: "Error",
        description: `Failed to ${actionType} post`,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Shared Admin Sidebar */}
      <AdminSidebar currentPage="feed" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
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
              <h2 className="text-xl font-semibold text-gray-900">Post Approval</h2>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/admin/login';
                }}
              >
                <span className="mr-2">🚪</span>
                Log Out
              </Button>
              <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-200">
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

        {/* Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-white overflow-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Post Approval</h1>
            <p className="text-sm text-gray-600">Review and approve posts from alumni</p>
          </div>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#008060]"></div>
              <p className="mt-4 text-gray-600">Loading pending posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-600">No pending posts to review at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="bg-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage 
                          src={post.author_alumni?.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author?.username}`} 
                          alt={post.author?.username} 
                        />
                        <AvatarFallback className="bg-[#008060] text-white">
                          {getInitials(post.author?.username || 'U')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {post.author_alumni?.first_name && post.author_alumni?.last_name
                                ? `${post.author_alumni.first_name} ${post.author_alumni.last_name}`
                                : post.author?.username}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {formatDate(post.created_at)}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleViewPost(post)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </Button>
                        </div>

                        <p className="text-gray-700 line-clamp-3 mb-4">
                          {post.content}
                        </p>

                        {post.image_url && (
                          <div className="mb-4">
                            <img 
                              src={post.image_url} 
                              alt="Post attachment" 
                              className="rounded-lg max-h-48 object-cover"
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedPost(post);
                              handleApproveClick();
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedPost(post);
                              handleRejectClick();
                            }}
                            variant="destructive"
                            className="flex items-center gap-2"
                            size="sm"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Post Detail Dialog */}
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post Details</DialogTitle>
            </DialogHeader>

            {selectedPost && (
              <div className="space-y-6">
                {/* Author Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Author Information
                  </h3>
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage 
                        src={selectedPost.author_alumni?.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedPost.author?.username}`} 
                        alt={selectedPost.author?.username} 
                      />
                      <AvatarFallback className="bg-[#008060] text-white">
                        {getInitials(selectedPost.author?.username || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Name:</span>{' '}
                        {selectedPost.author_alumni?.first_name && selectedPost.author_alumni?.last_name
                          ? `${selectedPost.author_alumni.first_name} ${selectedPost.author_alumni.last_name}`
                          : selectedPost.author?.username}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Email:</span>{' '}
                        {selectedPost.author_alumni?.email || selectedPost.author?.email}
                      </p>
                      {selectedPost.author_alumni?.phone && (
                        <p className="text-sm">
                          <span className="font-medium">Phone:</span> {selectedPost.author_alumni.phone}
                        </p>
                      )}
                      {selectedPost.author_alumni?.batch && (
                        <p className="text-sm">
                          <span className="font-medium">Batch:</span> {selectedPost.author_alumni.batch}
                        </p>
                      )}
                      {selectedPost.author_alumni?.current_company && (
                        <p className="text-sm">
                          <span className="font-medium">Company:</span>{' '}
                          {selectedPost.author_alumni.current_company}
                          {selectedPost.author_alumni.current_role && ` - ${selectedPost.author_alumni.current_role}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Post Content</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.content}</p>
                </div>

                {/* Attached Media */}
                {selectedPost.image_url && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Attached Media</h3>
                    <img 
                      src={selectedPost.image_url} 
                      alt="Post attachment" 
                      className="rounded-lg w-full object-contain max-h-96"
                    />
                  </div>
                )}

                {/* Post Metadata */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Post Metadata
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Created:</span> {formatDate(selectedPost.created_at)}</p>
                    <p><span className="font-medium">Type:</span> {selectedPost.post_type}</p>
                    <p><span className="font-medium">Status:</span> Pending Approval</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={handleApproveClick}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Post
              </Button>
              <Button
                onClick={handleRejectClick}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'approve' ? 'Approve Post?' : 'Reject Post?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === 'approve' 
                  ? 'Are you sure you want to approve this post? It will be visible to all users on the feed.'
                  : 'Are you sure you want to reject this post? This action will hide the post from users.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};