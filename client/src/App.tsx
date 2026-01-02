import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";
import { io } from "socket.io-client";

import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { FeedPage } from "@/pages/FeedPage";
import { JobPortalPage } from "@/pages/JobPortalPage";
import { EventsPage } from "@/pages/EventsPage";
import { ConnectionsPage } from "@/pages/ConnectionsPage";
import { InboxPage } from "@/pages/InboxPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminEventsPage } from "./pages/AdminEventsPage";
import { AdminMessagesPage } from "@/pages/AdminMessagesPage";
import AdminImportPage from "./pages/AdminImportPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { AdminUserEditPage } from "./pages/AdminUserEditPage";
import { AdminFeedPage } from "./pages/AdminFeedPage";
import { PublicProfilePage } from "@/pages/PublicProfilePage";
import { MentorshipPage } from "@/pages/MentorshipPage";
import { SharedPostPage } from "./pages/SharedPostPage";
import { AdminJobsPage } from "@/pages/AdminJobsPage";
import { SystemTestsPage } from "@/pages/SystemTestsPage";


function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/job-portal" component={JobPortalPage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/connections" component={ConnectionsPage} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/profile" component={UserProfilePage} />
      <Route path="/profile/:userId" component={PublicProfilePage} />
      <Route path="/mentorship" component={MentorshipPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/feed" component={AdminFeedPage} />
      <Route path="/admin/events" component={AdminEventsPage} />
      <Route path="/admin/messages" component={AdminMessagesPage} />
      <Route path="/admin/jobs" component={AdminJobsPage} />
      <Route path="/admin/users/:userId/edit" component={AdminUserEditPage} />
      <Route path="/admin/import" component={AdminImportPage} />
      <Route path="/system-tests" component={SystemTestsPage} />
      <Route path="/post/:postId" component={SharedPostPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Connect to the server - use current origin
      const serverUrl = import.meta.env.DEV 
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : window.location.origin;

      console.log('Connecting Socket.IO to:', serverUrl);

      const socket = io(serverUrl, {
        auth: {
          token: userId
        },
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        path: '/socket.io/' // Explicitly set the path
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected');
        socket.emit('authenticate', userId);
      });

      socket.on('notification', (data) => {
        console.log('Received notification:', data);
        // Trigger notification count refresh
        window.dispatchEvent(new CustomEvent('new-notification', { detail: data }));
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
      });

      return () => {
        socket.disconnect();
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SearchProvider>
            <NotificationProvider>
              <TooltipProvider>
                <Router />
                <GlobalSearchModal />
                <Toaster />
              </TooltipProvider>
            </NotificationProvider>
          </SearchProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;