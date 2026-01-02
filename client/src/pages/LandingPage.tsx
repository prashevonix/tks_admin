import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Calendar, Briefcase, Users, Award, BookOpen, Globe, Smartphone, Heart } from "lucide-react";
import { WhyJoinSection } from "./sections/WhyJoinSection";
import { WhatYouWillFindSection } from "./sections/WhatYouWillFindSection";
import { UpcomingEventsSection } from "./sections/UpcomingEventsSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { CallToActionSection } from "./sections/CallToActionSection";
import { useAuth } from "@/contexts/AuthContext";

export const LandingPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  // Set page title
  React.useEffect(() => {
    document.title = "Welcome - TKS Alumni Portal";
  }, []);

  // Redirect authenticated users from the landing page
  React.useEffect(() => {
    if (user) {
      setLocation("/feed"); // Assuming '/feed' is the page after login
    }
  }, [user, setLocation]);

  const handleAuthAction = () => {
    if (user) {
      logout();
    } else {
      setLocation("/login");
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Modern Header Navigation */}
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group cursor-pointer">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <span className="text-white font-bold text-sm sm:text-base md:text-lg">TKS</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs sm:text-sm md:text-base lg:text-xl text-gray-900 group-hover:text-green-600 transition-colors duration-300 leading-tight">The Kalyani School</span>
                  <span className="text-[10px] sm:text-xs md:text-sm text-gray-500 font-medium leading-tight">Alumni Portal</span>
                </div>
              </div>
              <nav className="hidden lg:flex items-center gap-4 xl:gap-6 2xl:gap-8">
                {['Home', 'About', 'Events', 'Contact'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`} className="text-sm xl:text-base text-gray-700 hover:text-green-600 font-medium transition-all duration-300 hover:scale-105 relative group">
                    {item}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300"></span>
                  </a>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
              {user ? (
                <Button
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 lg:px-6 text-xs sm:text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap"
                  onClick={handleAuthAction}
                >
                  Log Out
                </Button>
              ) : (
                <Button
                  className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 lg:px-6 text-xs sm:text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap"
                  onClick={handleAuthAction}
                >
                  <span className="hidden sm:inline">Register / </span>Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Redesigned */}
      <section id="home" className="relative overflow-hidden">
        {/* Revolutionary Background Design */}
        <div className="absolute inset-0">
          {/* Primary Gradient Base */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50"></div>

          {/* Secondary Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/60 via-transparent to-green-50/40"></div>

          {/* Diagonal Gradient Accent */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-25/20 to-teal-50/30"></div>

          {/* Animated Mesh Gradient */}
          <div className="absolute inset-0 opacity-40 animate-gradient-shift" style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 40%, rgba(34, 197, 94, 0.1) 0%, transparent 70%),
              radial-gradient(ellipse 60% 40% at 80% 60%, rgba(16, 185, 129, 0.08) 0%, transparent 70%),
              radial-gradient(ellipse 100% 80% at 40% 20%, rgba(5, 150, 105, 0.05) 0%, transparent 80%),
              radial-gradient(ellipse 120% 60% at 60% 80%, rgba(52, 211, 153, 0.06) 0%, transparent 75%)
            `
          }}></div>

          {/* Dynamic Floating Orbs */}
          <div className="absolute top-16 left-16 w-64 h-64 bg-gradient-to-br from-emerald-200/20 via-green-300/15 to-teal-200/10 rounded-full blur-3xl"></div>
          <div className="absolute top-32 right-24 w-48 h-48 bg-gradient-to-br from-green-300/25 via-emerald-200/20 to-teal-300/15 rounded-full blur-2xl"></div>
          <div className="absolute bottom-24 left-1/3 w-80 h-80 bg-gradient-to-br from-teal-200/15 via-emerald-300/10 to-green-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-32 right-16 w-56 h-56 bg-gradient-to-br from-emerald-300/20 via-green-200/15 to-teal-300/25 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-8 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-300/15 rounded-full blur-xl"></div>
          <div className="absolute top-3/4 right-1/3 w-40 h-40 bg-gradient-to-br from-teal-300/18 to-green-400/12 rounded-full blur-2xl"></div>

          {/* Sophisticated Pattern Overlays */}
          <div className="absolute inset-0 opacity-8">
            {/* Hexagonal Pattern */}
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }}></div>

            {/* Dot Grid Pattern */}
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(34, 197, 94, 0.15) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>

          {/* Animated Particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-1/4 w-2 h-2 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-particle-float opacity-60"></div>
            <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-gradient-to-r from-green-400 to-teal-500 rounded-full animate-particle-float opacity-70" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/3 left-1/5 w-3 h-3 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full animate-particle-float opacity-50" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/4 right-1/4 w-2.5 h-2.5 bg-gradient-to-r from-emerald-500 to-green-400 rounded-full animate-particle-float opacity-65" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute top-2/3 left-2/3 w-1 h-1 bg-gradient-to-r from-green-500 to-teal-400 rounded-full animate-particle-float opacity-80" style={{animationDelay: '1.5s'}}></div>
          </div>

          {/* Subtle Noise Texture */}
          <div className="absolute inset-0 opacity-20 mix-blend-soft-light" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.3'/%3E%3C/svg%3E")`
          }}></div>

          {/* Edge Vignette */}
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse at center, transparent 0%, transparent 70%, rgba(255,255,255,0.1) 100%)`
          }}></div>
        </div>

        {/* Main Hero Content */}
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 lg:py-12">
          <div className="text-center space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
            {/* Hero Headline */}
            <div className="space-y-2 sm:space-y-2 md:space-y-3 lg:space-y-3 overflow-visible">
              <div className="inline-block">
                <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wide shadow-lg">
                  Welcome to TKS Alumni Community
                </span>
              </div>

              <div className="pb-1 sm:pb-1 md:pb-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.2] tracking-tight px-2">
                  <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1 sm:mb-2 md:mb-2 py-1">
                    Stay Connected.
                  </div>
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 bg-clip-text text-transparent mb-1 sm:mb-2 md:mb-2 py-1">
                    Grow Together.
                  </div>
                  <div className="text-gray-900 py-1">
                    Build Your Legacy.
                  </div>
                </h1>
              </div>
            </div>

            {/* Hero Description */}
            <div className="max-w-4xl mx-auto pt-1 sm:pt-1 md:pt-2">
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed font-medium px-3 sm:px-4">
                Join thousands of <span className="text-green-600 font-bold bg-green-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg">TKS alumni</span> worldwide.
                Reconnect with classmates, discover opportunities, and stay part of the family that shaped your journey.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-4 justify-center items-center pt-2 sm:pt-3 md:pt-4 lg:pt-5 px-3 sm:px-4">
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 rounded-lg sm:rounded-xl md:rounded-2xl w-full sm:w-auto sm:min-w-[240px] md:min-w-[280px] lg:min-w-[300px] relative overflow-hidden group"
                onClick={() => setLocation("/signup")}
              >
                <span className="relative z-10">Join the Community</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </Button>
              <Button
                variant="outline"
                className="border-2 border-green-600 text-green-600 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:border-green-700 px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg font-semibold shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 rounded-lg sm:rounded-xl md:rounded-2xl w-full sm:w-auto sm:min-w-[240px] md:min-w-[280px] lg:min-w-[300px] backdrop-blur-sm bg-white/90"
                onClick={() => setLocation("/login")}
              >
                Register / Login
              </Button>
            </div>

            {/* Stats Section */}
            <div className="pt-3 sm:pt-4 md:pt-5 lg:pt-6 px-3 sm:px-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5 max-w-5xl mx-auto">
                <div className="text-center p-3 sm:p-4 md:p-5 bg-gradient-to-br from-white/90 to-green-50/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-green-100/50">
                  <div className="text-3xl sm:text-4xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1 sm:mb-1.5 md:mb-2">5000+</div>
                  <div className="text-gray-700 font-semibold text-sm sm:text-base md:text-base">Active Alumni</div>
                  <div className="w-10 sm:w-12 h-1 bg-gradient-to-r from-green-500 to-emerald-500 mx-auto mt-1 sm:mt-1.5 md:mt-2 rounded-full"></div>
                </div>
                <div className="text-center p-3 sm:p-4 md:p-5 bg-gradient-to-br from-white/90 to-emerald-50/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-emerald-100/50">
                  <div className="text-3xl sm:text-4xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1 sm:mb-1.5 md:mb-2">50+</div>
                  <div className="text-gray-700 font-semibold text-sm sm:text-base md:text-base">Countries</div>
                  <div className="w-10 sm:w-12 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto mt-1 sm:mt-1.5 md:mt-2 rounded-full"></div>
                </div>
                <div className="text-center p-3 sm:p-4 md:p-5 bg-gradient-to-br from-white/90 to-teal-50/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-teal-100/50">
                  <div className="text-3xl sm:text-4xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent mb-1 sm:mb-1.5 md:mb-2">25+</div>
                  <div className="text-gray-700 font-semibold text-sm sm:text-base md:text-base">Years of Legacy</div>
                  <div className="w-10 sm:w-12 h-1 bg-gradient-to-r from-teal-500 to-green-500 mx-auto mt-1 sm:mt-1.5 md:mt-2 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="pt-2 sm:pt-3 md:pt-4 px-3 sm:px-4">
              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-12 text-gray-700">
                <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 bg-white/60 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-full shadow-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap">Global Network</span>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 bg-white/60 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-full shadow-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse shadow-sm" style={{animationDelay: '0.5s'}}></div>
                  <span className="font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap">Career Opportunities</span>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 bg-white/60 backdrop-blur-sm px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-full shadow-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-gradient-to-r from-teal-500 to-green-500 rounded-full animate-pulse shadow-sm" style={{animationDelay: '1s'}}></div>
                  <span className="font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap">Lifetime Connections</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        </section>

      {/* Why Join Section */}
      <section id="about" className="py-6 sm:py-8 md:py-10 px-3 sm:px-4 relative bg-gradient-to-b from-gray-50/80 via-slate-50/60 to-white">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/20 via-transparent to-green-50/15"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2322c55e' fill-opacity='0.03'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20v20h40V20H20z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}></div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-7 md:mb-8">
            <div className="inline-block mb-2 sm:mb-3">
              <span className="bg-green-100 text-green-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wide">
                Why Choose TKS Alumni Portal
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-4 px-2">
              More Than Just A Directory
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed px-2">
              Being part of The Kalyani School community doesn't end at graduation. Our Alumni Portal is your gateway to lifelong connections, opportunities, and growth.
            </p>
          </div>
          <WhyJoinSection />
        </div>
      </section>

      {/* What You'll Find Inside Section */}
      <section className="py-6 sm:py-8 md:py-10 px-3 sm:px-4 relative bg-gradient-to-b from-white via-gray-50/40 to-slate-50/60">
        <div className="absolute inset-0 bg-gradient-to-l from-green-50/15 via-transparent to-emerald-50/20"></div>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `linear-gradient(45deg, transparent 65%, rgba(34, 197, 94, 0.02) 65.5%, rgba(34, 197, 94, 0.02) 66.5%, transparent 67%)`,
          backgroundSize: '20px 20px'
        }}></div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-7 md:mb-8">
            <div className="inline-block mb-2 sm:mb-3">
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wide">
                Platform Features
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-4 px-2">
              Everything You Need In One Place
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed px-2">
              From networking forums to private messaging and event updates, discover all the tools designed to keep you connected with the TKS family.
            </p>
          </div>
          <WhatYouWillFindSection />
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section id="events" className="py-6 sm:py-8 md:py-10 px-3 sm:px-4 relative bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-teal-50/70">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-100/20 to-transparent"></div>
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.08) 0%, transparent 50%)`,
          backgroundSize: '80px 80px'
        }}></div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="inline-block mb-3 sm:mb-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wide">
                Community Events
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-5 md:mb-6 px-2">
              Stay Connected Through Events
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed px-2">
              Whether it's reunions, webinars, or networking sessions, our events bring the TKS community together from around the world.
            </p>
          </div>
          <UpcomingEventsSection />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-6 sm:py-8 md:py-10 px-3 sm:px-4 relative bg-gradient-to-b from-slate-50/80 via-white to-gray-50/60">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-50/30 via-transparent to-blue-50/20"></div>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238b5cf6' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="inline-block mb-3 sm:mb-4">
              <span className="bg-purple-100 text-purple-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wide">
                Success Stories
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-5 md:mb-6 px-2">
              Voices From Our Alumni
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed px-2">
              From Pune to cities across the globe, TKS alumni are making their mark. Hear how the Alumni Portal helps them stay connected and grow together.
            </p>
          </div>
          <TestimonialsSection />
        </div>
      </section>

      {/* Call to Action Section */}
      <CallToActionSection />

      {/* Modern Footer */}
      <footer id="contact" className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10 lg:gap-12 mb-8 sm:mb-12 md:mb-16">
            {/* Brand Section */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-green-600 font-bold text-sm sm:text-base md:text-lg">TKS</span>
                </div>
                <div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold">The Kalyani School</div>
                  <div className="text-green-200 text-xs sm:text-sm md:text-base">Alumni Portal</div>
                </div>
              </div>
              <p className="text-green-100 leading-relaxed text-sm sm:text-base md:text-lg max-w-md">
                Connecting generations of TKS alumni worldwide. Stay connected, grow together, and build lasting relationships that matter.
              </p>
              <div className="flex gap-2.5 sm:gap-3 md:gap-4 mt-3 sm:mt-4 md:mt-6">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                  <div key={social} className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-green-500 rounded-md sm:rounded-lg md:rounded-xl flex items-center justify-center cursor-pointer hover:bg-green-400 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                    <span className="text-xs sm:text-sm font-medium">{social[0].toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 md:mb-6">Quick Links</h3>
              <ul className="space-y-1.5 sm:space-y-2 md:space-y-3">
                {['Home', 'About', 'Events', 'Directory', 'Jobs', 'Contact'].map((link) => (
                  <li key={link}>
                    <a href={`#${link.toLowerCase()}`} className="text-green-100 hover:text-white transition-colors duration-300 hover:translate-x-2 inline-block text-xs sm:text-sm md:text-base">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 md:mb-6">Get in Touch</h3>
              <div className="space-y-2.5 sm:space-y-3 md:space-y-4 text-green-100 text-xs sm:text-sm md:text-base">
                <div>
                  <div className="font-semibold text-white">Address</div>
                  <div>The Kalyani School<br />Pune, Maharashtra<br />India</div>
                </div>
                <div>
                  <div className="font-semibold text-white">Email</div>
                  <div className="break-words">alumni@thekalyani.school</div>
                </div>
              </div>
              <Button
                className="mt-3 sm:mt-4 md:mt-6 bg-white text-green-600 hover:bg-gray-100 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-xs sm:text-sm md:text-base"
                onClick={() => window.open('mailto:alumni@thekalyani.school')}
              >
                Contact Us
              </Button>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-green-500 pt-4 sm:pt-6 md:pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
              <div className="text-green-100 text-xs sm:text-sm md:text-base text-center md:text-left">
                © 2025 The Kalyani School. All Rights Reserved.
              </div>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                {['Terms of Service', 'Privacy Policy', 'Cookie Policy'].map((item) => (
                  <a key={item} href="#" className="text-green-100 hover:text-white transition-colors duration-300 text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};