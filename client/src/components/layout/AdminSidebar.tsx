import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Calendar, MessageSquare, FileText, Upload, Briefcase, Database } from "lucide-react";

interface AdminSidebarProps {
  currentPage: 'dashboard' | 'feed' | 'events' | 'jobs' | 'messages';
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentPage }) => {
  const [, setLocation] = useLocation();

  const navItems = [
    { icon: "📊", label: "Dashboard", path: "/admin/dashboard", key: "dashboard" },
    { icon: "📰", label: "Feed", path: "/admin/feed", key: "feed" },
    { icon: "📅", label: "Events", path: "/admin/events", key: "events" },
    { icon: "💼", label: "Jobs", path: "/admin/jobs", key: "jobs" },
    { icon: "💬", label: "Messages", path: "/admin/messages", key: "messages" },
  ];

  return (
    <div className="hidden lg:flex lg:w-64 xl:w-72 bg-white shadow-xl flex-col border-r border-gray-100">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#008060] to-[#006b51] rounded-xl flex items-center justify-center shadow-lg animate-bounce-gentle">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <div>
            <span className="font-bold text-[#008060] text-lg block leading-tight">The Kalyani School</span>
            <span className="text-xs text-gray-500 font-medium">Admin Portal</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant={item.key === currentPage ? "default" : "ghost"}
            className={`w-full justify-start rounded-xl px-4 py-3 h-auto font-medium transition-all duration-300 ${
              item.key === currentPage
                ? "bg-gradient-to-r from-[#008060] to-[#006b51] text-white shadow-lg hover:shadow-xl hover:from-[#006b51] hover:to-[#005d47]"
                : "text-gray-600 hover:bg-gray-50 hover:text-[#008060]"
            }`}
            onClick={() => setLocation(item.path)}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );
};