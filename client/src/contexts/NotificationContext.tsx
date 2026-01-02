import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'user-id': user.id
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchNotifications();

      // Listen for notifications from the main Socket.IO connection in App.tsx
      const handleNewNotification = ((event: CustomEvent) => {
        const notification = event.detail;
        setNotifications(prev => [notification, ...prev]);
      }) as EventListener;

      window.addEventListener('new-notification', handleNewNotification);

      return () => {
        window.removeEventListener('new-notification', handleNewNotification);
      };
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user) return;

    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'user-id': user.id
        }
      });

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'user-id': user.id
        }
      });

      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};