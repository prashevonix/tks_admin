
import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Bell, MessageSquare, UserPlus, ThumbsUp, MessageCircle, Calendar, Briefcase, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const fetchNotifications = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/notifications?limit=10', {
        headers: {
          'user-id': userId || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'connection_request':
      case 'connection_response':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'post_like':
        return <ThumbsUp className="w-4 h-4 text-red-500" />;
      case 'post_comment':
        return <MessageCircle className="w-4 h-4 text-purple-500" />;
      case 'event_rsvp':
        return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'job':
        return <Briefcase className="w-4 h-4 text-indigo-500" />;
      case 'signup_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRedirectUrl = (notification: Notification): string => {
    switch (notification.type) {
      case 'message':
        return '/inbox';
      case 'connection_request':
      case 'connection_response':
        return '/connections';
      case 'post_like':
      case 'post_comment':
        return '/feed';
      case 'event_rsvp':
        return '/events';
      case 'job':
        return '/job-portal';
      default:
        return '/feed';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      const userId = localStorage.getItem('userId');
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'PUT',
        headers: {
          'user-id': userId || ''
        }
      });

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );

      // Redirect to appropriate page
      const redirectUrl = getRedirectUrl(notification);
      setLocation(redirectUrl);
      onClose();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to process notification",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const userId = localStorage.getItem('userId');
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'user-id': userId || ''
        }
      });

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div ref={dropdownRef} className="absolute right-0 top-10 sm:top-12 w-72 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-[60]">
      <div className="p-3 sm:p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[#008060] hover:underline"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-2.5 sm:p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer transition-colors ${
                !notification.is_read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs sm:text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
                    {notification.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2">
                    {notification.content}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
