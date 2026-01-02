import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PostCreator } from "@/components/feed/PostCreator";
import { PostCard } from "@/components/feed/PostCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

export const FeedPage = (): JSX.Element => {
  const [postText, setPostText] = useState("");
  const [, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, alumni } = useAuth();

  // Set page title
  React.useEffect(() => {
    document.title = "Feed - TKS Alumni Portal";
  }, []);

  // Loading and error states
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Posts data
  const [posts, setPosts] = useState<any[]>([]);

  // Post creation states
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  // Post interaction states
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState<Set<string>>(new Set());

  // Job interest states
  const [interestedJobs, setInterestedJobs] = useState<Set<number>>(new Set());

  // Connection states
  const [sentConnections, setSentConnections] = useState<Set<string>>(new Set());

  // Post options and comments
  const [showPostOptions, setShowPostOptions] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<{[key: string]: string}>({});



  // Notification dropdown state
  const [showNotifications, setShowNotifications] = useState(false);

  // Refresh functionality states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 80; // Distance to trigger refresh
  const MAX_PULL_DISTANCE = 120; // Maximum pull distance

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowPostOptions(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPosts = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setIsLoadingPosts(true);
      }
      setError(null);

      const response = await fetch('/api/posts?limit=20&offset=0');

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      const apiPosts = data.posts || [];

      // Set posts from API
      setPosts(apiPosts);

      if (isRefresh) {
        toast({
          title: "Refreshed",
          description: "Feed updated successfully",
        });
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load posts. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPosts(false);
      setIsRefreshing(false);
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPosts(true);
  };

  // Pull-to-refresh handlers for touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || !pullStartY) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;

    // Only allow pulling down when at the top
    if (contentRef.current && contentRef.current.scrollTop === 0 && distance > 0) {
      // Apply resistance - the more you pull, the harder it gets
      const resistance = 0.5;
      const adjustedDistance = Math.min(distance * resistance, MAX_PULL_DISTANCE);
      setPullDistance(adjustedDistance);

      // Prevent default scroll behavior while pulling - but only for vertical movement
      if (adjustedDistance > 10) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance >= PULL_THRESHOLD) {
      handleRefresh();
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
    setPullStartY(0);
  };

  // Pull-to-refresh handlers for mouse (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start pull if at top of scroll and not clicking on interactive elements
    if (contentRef.current && contentRef.current.scrollTop === 0) {
      const target = e.target as HTMLElement;
      // Don't activate pull-to-refresh if clicking on buttons, inputs, or other interactive elements
      if (target.closest('button, a, input, textarea, [role="button"]')) {
        return;
      }
      setPullStartY(e.clientY);
      // Don't set isPulling yet - wait for actual movement
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // This handler is now just for visual feedback, actual pulling handled in global effect
  };

  const handleMouseUp = () => {
    // Cleanup handled in global effect
  };

  // Add global mouse event listeners for desktop drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!pullStartY) return;

      const currentY = e.clientY;
      const distance = currentY - pullStartY;

      // Only activate pulling if user has dragged at least 10px down
      if (contentRef.current && contentRef.current.scrollTop === 0 && distance > 10) {
        if (!isPulling) {
          setIsPulling(true);
        }
        const resistance = 0.5;
        const adjustedDistance = Math.min(distance * resistance, MAX_PULL_DISTANCE);
        setPullDistance(adjustedDistance);
      }
    };

    const handleGlobalMouseUp = () => {
      if (pullStartY) {
        if (isPulling && pullDistance >= PULL_THRESHOLD) {
          handleRefresh();
        } else {
          setIsPulling(false);
          setPullDistance(0);
        }
        setPullStartY(0);
      }
    };

    if (pullStartY) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPulling, pullStartY, pullDistance]);

  // State for events from database
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [suggestedConnections, setSuggestedConnections] = useState<any[]>([]);

  // Fetch events
  useEffect(() => {
    fetchUpcomingEvents();
    fetchRecentJobs();
    fetchSuggestedConnections();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/events?limit=5&sort=upcoming&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const response = await fetch('/api/jobs?limit=3&sort=recent');
      if (response.ok) {
        const data = await response.json();
        setRecentJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching recent jobs:', error);
    }
  };

  const fetchSuggestedConnections = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/connections/suggestions?userId=${userId}&limit=3`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedConnections(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggested connections:', error);
    }
  };

  const handleFileAttachment = (type: 'document' | 'photo' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'document' ? '.pdf,.doc,.docx' :
                   type === 'photo' ? 'image/*' : 'video/*';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        setAttachedFiles(prev => [...prev, ...Array.from(files)]);
      }
    };
    input.click();
  };

  const handleCreateEvent = () => {
    setLocation("/events?create=true");
  };

  const handlePost = async () => {
    if (!postText.trim() && attachedFiles.length === 0) return;

    setIsPosting(true);
    try {
      const userId = localStorage.getItem('userId');
      let uploadedFileUrl = null;

      // Upload file if there's an attachment
      if (attachedFiles.length > 0) {
        const file = attachedFiles[0];
        const formData = new FormData();
        formData.append('file', file);

        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);

        const uploadResponse = await fetch('/api/upload/post-attachment', {
          method: 'POST',
          headers: {
            'user-id': userId || '',
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedFileUrl = uploadData.url;
          console.log('File uploaded successfully:', uploadedFileUrl);
        } else {
          const errorData = await uploadResponse.json();
          console.error('Upload failed:', errorData);
          toast({
            title: "Upload Failed",
            description: errorData.error || "Failed to upload file",
            variant: "destructive",
          });
          setIsPosting(false);
          return;
        }
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || '',
        },
        body: JSON.stringify({
          content: postText,
          imageUrl: uploadedFileUrl,
          postType: 'general',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const data = await response.json();

      // Add new post to the top of the feed
      setPosts(prev => [data.post, ...prev]);

      // Reset form
      setPostText("");
      setAttachedFiles([]);

      toast({
        title: "Success",
        description: uploadedFileUrl ? "Post created with attachment!" : "Post created successfully!",
      });
    } catch (error) {
      console.error("Failed to create post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      // Get current like status
      const wasLiked = post.isLikedByUser || likedPosts.has(postId);
      const originalLikesCount = post.likes_count;
      const originalIsLikedByUser = post.isLikedByUser;

      // Optimistically update UI immediately
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes_count: wasLiked
              ? Math.max(0, p.likes_count - 1)
              : p.likes_count + 1,
            isLikedByUser: !wasLiked
          };
        }
        return p;
      }));

      // Update liked posts set
      if (!wasLiked) {
        setLikedPosts(prev => new Set([...prev, postId]));
      } else {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }

      // Send request to server
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'user-id': userId || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      // Don't sync with server response - trust the optimistic update
      // The server will handle the actual database update
    } catch (error) {
      console.error('Error liking post:', error);

      // Revert optimistic update on error
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes_count: originalLikesCount,
            isLikedByUser: originalIsLikedByUser
          };
        }
        return p;
      }));

      // Revert liked posts set
      if (!originalIsLikedByUser) {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        setLikedPosts(prev => new Set([...prev, postId]));
      }

      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleComment = (postId: string) => {
    setShowComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };



  const handleReadMore = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleJobInterest = (jobIndex: number, interested: boolean) => {
    setInterestedJobs(prev => {
      const newSet = new Set(prev);
      if (interested) {
        newSet.add(jobIndex);
      } else {
        newSet.delete(jobIndex);
      }
      return newSet;
    });
  };

  const handleConnect = async (connectionId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/connections/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || '',
        },
        body: JSON.stringify({ receiverId: connectionId }),
      });

      if (response.ok) {
        setSentConnections(prev => new Set([...prev, connectionId]));
        toast({
          title: "Connection request sent",
          description: "Your connection request has been sent",
        });
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      });
    }
  };

  const handlePostOptions = (postId: string) => {
    const userId = localStorage.getItem('userId');
    const post = posts.find(p => p.id === postId);

    // Only show options if the current user is the author of the post
    if (!post || post.author_id !== userId) {
      return;
    }

    setShowPostOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handlePostComment = async (postId: string) => {
    const commentText = commentTexts[postId];
    if (!commentText?.trim()) return;

    const userId = localStorage.getItem('user');
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment on posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      const userIdParsed = JSON.parse(userId).id;

      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userIdParsed || '',
        },
        body: JSON.stringify({
          content: commentText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      // Clear comment text
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));

      // Update comments count
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comments_count: p.comments_count + 1 }
          : p
      ));

      toast({
        title: "Comment posted",
        description: "Your comment has been added.",
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCommentTextChange = (postId: string, text: string) => {
    setCommentTexts(prev => ({ ...prev, [postId]: text }));
  };



  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const userId = localStorage.getItem('userId');

      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'user-id': userId || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      setPosts(prev => prev.filter(post => post.id !== postId));
      setShowPostOptions(new Set());

      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    }
  };

  // This function is called when a post is created by the PostCreator component
  // It's not currently used but is kept here in case it's needed in the future
  const handlePostCreated = (newPost: any) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
  };


  return (
    <AppLayout currentPage="feed">
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative isolate">
        {/* Main Content */}
        <div
          ref={contentRef}
          className="flex-1 w-full max-w-[900px] mx-auto px-4 py-6 lg:mr-72 xl:mr-80 overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          style={{
            transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'none',
            transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: isPulling ? 'grabbing' : 'default',
            userSelect: isPulling ? 'none' : 'auto'
          }}
        >
          {/* Refresh Button - Always Visible */}
          <div className="mb-6 flex justify-end">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-white hover:shadow-md transition-all duration-200 border-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
            </Button>
          </div>

          {/* Pull-to-refresh indicator */}
          <div
            className="flex flex-col justify-center items-center transition-all duration-200"
            style={{
              height: isPulling || isRefreshing ? `${pullDistance}px` : '0px',
              opacity: isPulling || isRefreshing ? Math.min(pullDistance / PULL_THRESHOLD, 1) : 0,
              overflow: 'hidden'
            }}
          >
            <div className="flex flex-col items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
              <RefreshCw
                className={`w-6 h-6 text-[#008060] transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
                style={{
                  transform: isRefreshing ? 'none' : `rotate(${pullDistance * 3}deg)`
                }}
              />
              <p className="text-xs text-gray-700 font-semibold">
                {isRefreshing ? 'Refreshing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
              </p>
            </div>
          </div>

          {/* Post Creation */}
          <div className="mb-8">
          <PostCreator
            postText={postText}
            attachedFiles={attachedFiles}
            isPosting={isPosting}
            onPostTextChange={setPostText}
            onFileAttachment={handleFileAttachment}
            onCreateEvent={handleCreateEvent}
            onPost={handlePost}
            onRemoveFile={(index) => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
          />

          {/* Loading State */}
          {isLoadingPosts && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#008060]"></div>
              <p className="mt-2 text-gray-600">Loading posts...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
              <Button
                onClick={fetchPosts}
                className="mt-2 bg-red-600 hover:bg-red-700"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingPosts && !error && posts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-2">No posts yet</p>
              <p className="text-gray-500 text-sm">Be the first to share something!</p>
            </div>
          )}

          {/* Posts Feed */}
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={post.isLikedByUser || likedPosts.has(post.id)}
                isExpanded={expandedPosts.has(post.id)}
                showComments={showComments.has(post.id)}
                commentText={commentTexts[post.id] || ''}
                onLike={() => handleLike(post.id)}
                onComment={() => handleComment(post.id)}
                onReadMore={() => handleReadMore(post.id)}
                onPostComment={() => handlePostComment(post.id)}
                onCommentTextChange={(text) => handleCommentTextChange(post.id, text)}
                onOptionsClick={() => handlePostOptions(post.id)}
                onEdit={() => console.log('Edit post', post.id)}
                onDelete={() => handleDeletePost(post.id)}
                showOptions={showPostOptions.has(post.id)}
              />
            ))}
          </div>
        </div>

        {/* Right Sidebar - Fixed */}
        <div 
          className="hidden lg:block w-72 xl:w-80 bg-white/95 backdrop-blur-sm border-l border-gray-200 shadow-xl fixed right-0 top-[72px] md:top-[96px] bottom-0 overflow-y-auto z-10"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="p-5 xl:p-7 space-y-7 xl:space-y-9">

            {/* Upcoming Events Section */}
        <div>
          <div className="flex items-center justify-between mb-4 xl:mb-5">
            <h3 className="font-semibold text-gray-900 text-base xl:text-lg">Upcoming Events</h3>
            <button
              onClick={() => setLocation("/events")}
              className="text-[#008060] text-sm xl:text-base hover:text-[#007055] font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>View all</span>
              <span className="text-lg leading-none">→</span>
            </button>
          </div>

          <div className="space-y-4">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 3).map((event) => {
                const isRegistered = event.user_rsvp && event.user_rsvp.status === 'going';
                const isPast = new Date(event.event_date) < new Date();
                
                return (
                  <div 
                    key={event.id} 
                    className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 xl:p-5 hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-gray-100 cursor-pointer"
                    onClick={() => setLocation("/events")}
                  >
                    <div className="flex items-start gap-2 xl:gap-3">
                      <div className="text-center min-w-0">
                        <div className="text-[10px] xl:text-xs text-gray-600 font-medium">
                          {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] xl:text-xs text-gray-600">
                          {event.event_time || new Date(event.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs xl:text-sm text-gray-900 mb-1 line-clamp-2">{event.title}</h4>
                        <p className="text-[10px] xl:text-xs text-gray-600 mb-2 xl:mb-3">
                          {event.is_virtual ? '🌐 Virtual' : `📍 ${event.location || event.venue}`}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isRegistered ? (
                            <span className="px-2 xl:px-3 py-1 text-[10px] xl:text-xs text-white rounded-full font-medium bg-green-500">
                              ✓ Registered
                            </span>
                          ) : isPast ? (
                            <span className="px-2 xl:px-3 py-1 text-[10px] xl:text-xs text-white rounded-full font-medium bg-gray-400">
                              Ended
                            </span>
                          ) : (
                            <span className="px-2 xl:px-3 py-1 text-[10px] xl:text-xs text-[#008060] bg-green-50 rounded-full font-medium border border-[#008060]">
                              Register
                            </span>
                          )}
                          {event.rsvp_count > 0 && (
                            <span className="text-[10px] xl:text-xs text-gray-500">
                              {event.rsvp_count} {event.rsvp_count === 1 ? 'attendee' : 'attendees'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
            )}
          </div>
        </div>

        {/* Recent Jobs Section */}
        <div>
          <div className="flex items-center justify-between mb-4 xl:mb-5">
            <h3 className="font-semibold text-gray-900 text-base xl:text-lg">Recent Jobs</h3>
            <button
              onClick={() => setLocation("/job-portal")}
              className="text-[#008060] text-sm hover:text-[#007055] font-medium flex items-center gap-1"
            >
              View all →
            </button>
          </div>

          <div className="space-y-4">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <div key={job.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 xl:p-5 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer border border-gray-100" onClick={() => setLocation("/job-portal")}>
                  <div className="flex items-center gap-2 xl:gap-3">
                    <div className="w-10 h-10 xl:w-12 xl:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-xl xl:text-2xl">💼</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs xl:text-sm text-gray-900 truncate">{job.title}</h4>
                      <p className="text-[10px] xl:text-xs text-gray-600">{job.company} | {job.location}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent jobs</p>
            )}
          </div>
        </div>

        {/* You May Know Section */}
        <div>
          <div className="flex items-center justify-between mb-4 xl:mb-5">
            <h3 className="font-semibold text-gray-900 text-base xl:text-lg">You May Know</h3>
            <button
              onClick={() => setLocation("/connections")}
              className="text-[#008060] text-sm hover:text-[#007055] font-medium flex items-center gap-1"
            >
              View all →
            </button>
          </div>

          <div className="space-y-4">
            {suggestedConnections.length > 0 ? (
              suggestedConnections.map((connection) => {
                const connectionName = `${connection.first_name} ${connection.last_name}`.trim() || connection.username;
                const getConnectionAvatar = () => {
                  if (connection.profile_picture) return connection.profile_picture;
                  const seed = encodeURIComponent(connectionName);
                  switch (connection.gender) {
                    case 'male':
                      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
                    case 'female':
                      return `https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${seed}&backgroundColor=ff69b4`;
                    default:
                      return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=008060`;
                  }
                };

                // Get connection probability indicator
                const getConnectionProbability = (score: number) => {
                  if (score >= 40) return { text: 'High match', color: 'text-green-600', icon: '🎯' };
                  if (score >= 25) return { text: 'Good match', color: 'text-blue-600', icon: '✨' };
                  return { text: 'Potential match', color: 'text-gray-600', icon: '💫' };
                };

                const probability = getConnectionProbability(connection.connection_score || 0);

                return (
                  <div 
                    key={connection.user_id || connection.id} 
                    className="flex flex-col gap-2 p-3 xl:p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-white hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-[#008060]/20"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12 xl:w-14 xl:h-14 ring-2 ring-offset-2 ring-[#008060]/10">
                        <AvatarImage src={getConnectionAvatar()} alt={connectionName} />
                        <AvatarFallback className="bg-[#008060] text-white text-sm">
                          {connectionName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm xl:text-base text-gray-900 truncate mb-1">
                          {connectionName}
                        </h4>
                        <p className="text-[10px] xl:text-xs text-gray-600 line-clamp-1 mb-2">
                          {connection.current_role && connection.current_company
                            ? `${connection.current_role} at ${connection.current_company}`
                            : connection.current_role || connection.current_company || 'Alumni'}
                        </p>
                        {connection.connection_score > 0 && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-xs">{probability.icon}</span>
                            <span className={`text-[10px] xl:text-xs font-medium ${probability.color}`}>
                              {probability.text}
                            </span>
                          </div>
                        )}
                        {connection.connection_reasons && connection.connection_reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {connection.connection_reasons.slice(0, 2).map((reason: string, idx: number) => (
                              <span 
                                key={idx}
                                className="text-[9px] xl:text-[10px] px-2 py-0.5 bg-[#008060]/5 text-[#008060] rounded-full border border-[#008060]/10"
                              >
                                {reason}
                              </span>
                            ))}
                            {connection.connection_reasons.length > 2 && (
                              <span className="text-[9px] xl:text-[10px] px-2 py-0.5 text-gray-500">
                                +{connection.connection_reasons.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleConnect(connection.user_id || connection.id)}
                      disabled={sentConnections.has(connection.user_id || connection.id)}
                      className={`w-full text-xs py-2 rounded-lg font-medium transition-all ${
                        sentConnections.has(connection.user_id || connection.id)
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-[#008060] hover:bg-[#007055] text-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      {sentConnections.has(connection.user_id || connection.id) ? '✓ Request Sent' : 'Connect'}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-1">No suggestions yet</p>
                <p className="text-xs text-gray-400">Complete your profile to get better matches</p>
              </div>
            )}
          </div>
        </div>

        </div>
        </div>
        </div>
      </div>
    </AppLayout>
  );
};