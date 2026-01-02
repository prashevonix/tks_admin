import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { Home, Calendar, MessageSquare, Settings, Bell, LogOut, Search, Briefcase, Users, User, ArrowLeft } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage?: 'feed' | 'job-portal' | 'events' | 'connections' | 'inbox';
}

// Define user roles
type UserRole = 'alumni' | 'current_student' | 'faculty' | 'administrator';

export const AppLayout: React.FC<AppLayoutProps> = ({ children, currentPage = 'feed' }) => {
  const [location, setLocation] = useLocation();
  const { user, alumni, faculty, student, admin, logout } = useAuth(); // Assuming these properties exist in useAuth
  const { setShowSearchModal } = useSearch();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(0);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);

  // Fetch unread notification count
  React.useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch('/api/notifications?unreadOnly=true', {
          headers: {
            'user-id': user.id
          }
        });

        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.notifications?.length || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    fetchNotificationCount();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Determine current page from URL if not provided
  const getCurrentPage = () => {
    if (currentPage !== 'feed') return currentPage;

    if (location.includes('/feed')) return 'feed';
    if (location.includes('/job-portal')) return 'job-portal';
    if (location.includes('/events')) return 'events';
    if (location.includes('/connections')) return 'connections';
    if (location.includes('/inbox')) return 'inbox';
    if (location.includes('/profile')) return 'profile';
    if (location.includes('/settings')) return 'settings';
    return 'feed';
  };

  const activePage = getCurrentPage();

  const displayName = alumni
    ? `${alumni.first_name || ''} ${alumni.last_name || ''}`.trim() || user?.username || 'User'
    : user?.username || 'User';

  const getProfilePicture = () => {
    if (alumni?.profile_picture && alumni.profile_picture.trim() !== '') {
      return alumni.profile_picture;
    }

    const seed = encodeURIComponent(displayName);
    const gender = alumni?.gender;

    switch (gender) {
      case 'male':
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
      case 'female':
        return `https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${seed}&backgroundColor=ff69b4`;
      case 'other':
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=ffa500`;
      case 'prefer_not_to_say':
        return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=6c63ff`;
      default:
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
    }
  };

  const getUserRole = (): UserRole | null => {
    // Use the user's user_role field directly
    if (user?.user_role) {
      return user.user_role as UserRole;
    }
    // Fallback to checking individual role objects
    if (admin) return 'administrator';
    if (faculty) return 'faculty';
    if (student) return 'current_student';
    if (alumni) return 'alumni';
    return null;
  };

  const role = getUserRole();
  const roleLabel = role ? role.replace('_', ' ').toUpperCase() : 'User'; // More user-friendly role display

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  // Define navigation items with their required roles
  const navItems = [
    { id: 'feed', icon: Home, label: 'Feed', path: '/feed', roles: ['alumni', 'current_student', 'faculty', 'administrator'] },
    { id: 'job-portal', icon: Briefcase, label: 'Job Portal', path: '/job-portal', roles: ['alumni', 'current_student', 'faculty'] },
    { id: 'events', icon: Calendar, label: 'Events', path: '/events', roles: ['alumni', 'current_student', 'faculty', 'administrator'] },
    { id: 'connections', icon: Users, label: 'Connections', path: '/connections', roles: ['alumni', 'current_student', 'faculty'] },
    { id: 'inbox', icon: MessageSquare, label: 'Inbox', path: '/inbox', roles: ['alumni', 'current_student', 'faculty', 'administrator'] },
  ];

  // Define bottom navigation items
  const bottomNavItems = [
    {
      icon: User,
      label: "Profile",
      path: "/profile",
      onClick: () => setLocation("/profile")
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/settings",
      onClick: () => setLocation("/settings")
    }
  ];

  // Helper function to check if the user has at least one of the required roles
  const hasRole = (requiredRoles: UserRole[]): boolean => {
    if (!user) return false; // If no user is logged in, deny access
    if (!role) return true; // If role is not determined yet, show all items (fail open)
    return requiredRoles.includes(role as UserRole);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Left Sidebar - Fixed */}
      <div className={`${showMobileMenu ? 'flex' : 'hidden'} lg:flex w-60 xl:w-72 bg-white shadow-xl flex-col border-r border-gray-100 fixed h-full z-50 lg:z-30`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#008060] to-[#006b51] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">T</span>
            </div>
            <div>
              <span className="font-bold text-[#008060] text-lg block leading-tight">The Kalyani School</span>
              <span className="text-xs text-gray-500 font-medium">Alumni Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems
            .filter(item => hasRole(item.roles as UserRole[]))
            .map((item) => (
              <Button
                key={item.id}
                variant={activePage === item.id ? "default" : "ghost"}
                className={`w-full justify-start rounded-xl px-4 py-3 h-auto font-medium transition-all duration-300 ${
                  activePage === item.id
                    ? "bg-gradient-to-r from-[#008060] to-[#006b51] text-white shadow-lg hover:shadow-xl hover:from-[#006b51] hover:to-[#005d47]" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#008060]"
                }`}
                onClick={() => {
                  setLocation(item.path);
                  setShowMobileMenu(false);
                }}
              >
                <item.icon className="mr-3 text-lg" />
                {item.label}
              </Button>
            ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-gray-100 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = location.includes(item.path);
            return (
              <Button
                key={item.label}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start rounded-xl px-4 py-3 h-auto font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-[#008060] to-[#006b51] text-white shadow-lg hover:shadow-xl hover:from-[#006b51] hover:to-[#005d47]" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#008060]"
                }`}
                onClick={item.onClick}
              >
                <item.icon className="mr-3 text-lg" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Content - Fixed Layout */}
      <div className="flex-1 flex flex-col lg:ml-60 xl:ml-72 min-h-screen">
        {/* Header - Fixed */}
        <div className="bg-white border-b border-gray-100 p-3 sm:p-4 md:p-6 fixed top-0 right-0 left-0 lg:left-60 xl:left-72 z-20">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden mr-2"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <span className="text-xl">☰</span>
            </Button>

            {/* Back Button - Show on all pages except feed */}
            {activePage !== 'feed' && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-[#008060]"
                onClick={() => setLocation('/feed')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline">Back</span>
              </Button>
            )}

            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-md">
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="w-full bg-gray-50 border-0 rounded-full px-8 sm:px-10 py-2 sm:py-3 text-xs sm:text-sm text-left text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    Search...
                  </span>
                  <kbd className="hidden sm:inline-block px-2 py-1 bg-white rounded text-xs text-gray-500">⌘K</kbd>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:text-gray-900 relative w-8 h-8 sm:w-10 sm:h-10"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="text-base sm:text-xl" />
                  {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>

                {showNotifications && <NotificationDropdown onClose={() => setShowNotifications(false)} />}
              </div>
              <div className="hidden md:flex items-center gap-2 sm:gap-3">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">{displayName}</p>
                  <span className="text-xs text-gray-500 capitalize">{roleLabel}</span>
                </div>
                <button onClick={() => setLocation("/profile")}>
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 hover:ring-2 hover:ring-[#008060] transition-all">
                    <AvatarImage src={getProfilePicture()} alt={displayName} />
                    <AvatarFallback className="text-xs sm:text-sm bg-[#008060] text-white">{getInitials(displayName)}</AvatarFallback>
                  </Avatar>
                </button>
              </div>
              {user && (
                <Button
                  variant="outline"
                  className="text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all duration-200 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-1 sm:mr-2 text-base" />
                  <span className="hidden sm:inline">Log Out</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Page Content - Scrollable */}
        <div className="flex-1 overflow-y-auto mt-[72px] sm:mt-[80px] md:mt-[96px]">
          {children}
        </div>
      </div>
    </div>
  );
};