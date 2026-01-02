import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const AdminLoginPage = (): JSX.Element => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { login, logout, user, isAdministrator } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in as admin
  React.useEffect(() => {
    if (user && isAdministrator) {
      setLocation('/admin/dashboard');
    }
  }, [user, isAdministrator, setLocation]);

  

  const handleAdminLogin = async () => {
    setIsLoading(true);
    setError(null);

    // Validate email
    if (!email || email.trim() === '') {
      setError("Admin email is required");
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid admin email address");
      setIsLoading(false);
      return;
    }

    // Validate password
    if (!password || password.trim() === '') {
      setError("Password is required");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      // Use dedicated admin login endpoint
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        // Check if user is actually an admin
        if (!data.user.is_admin && data.user.user_role !== 'administrator') {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges. Redirecting to user login...",
            variant: "destructive",
          });
          
          // Clear any stored data
          localStorage.removeItem('user');
          localStorage.removeItem('userId');
          
          // Redirect to user login after a brief delay
          setTimeout(() => {
            setLocation('/login');
          }, 1500);
          return;
        }
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userId', data.user.id);
        
        toast({
          title: "Admin login successful!",
          description: `Welcome, ${data.user.username}`,
        });
        
        // Reload to trigger auth context update
        window.location.href = "/admin/dashboard";
      } else {
        // Check if this is a non-admin user trying to access admin portal
        if (data.isNotAdmin) {
          toast({
            title: "Access Denied",
            description: "This portal is for administrators only. Redirecting to user login...",
            variant: "destructive",
          });
          
          setTimeout(() => {
            setLocation('/login');
          }, 2000);
        } else {
          setError(data.error || "Invalid credentials");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
      console.error("Admin login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdminLogin();
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6 animate-fade-up">
          {/* Welcome Header */}
          <div className="space-y-3 text-center animate-fade-up-delay-1">
            <div className="inline-block animate-bounce-gentle">
              <div className="w-16 h-16 bg-gradient-to-br from-[#008060] to-[#006b51] rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg">
                <span className="text-white text-2xl font-bold">🔐</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
              Admin Portal
              <span className="text-2xl">⚡</span>
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Secure access to administrative dashboard and management tools.
            </p>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm animate-fade-up-delay-2">
            <CardContent className="p-8 space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-[#008060]">📧</span>
                  Admin Email
                </label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@thekalyani.school"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/20 focus:border-[#008060] transition-all duration-300 group-hover:border-gray-300"
                    disabled={isLoading}
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#008060]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-[#008060]">🔒</span>
                  Password
                </label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/20 focus:border-[#008060] transition-all duration-300 group-hover:border-gray-300"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#008060] transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#008060]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-shake">
              <p className="text-red-600 text-sm flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </p>
            </div>
          )}

          {/* Back to Login */}
          <div className="text-center text-sm text-gray-600 animate-fade-up-delay-4">
            Not an admin?{" "}
            <a href="/login" className="text-[#008060] hover:text-[#006b51] font-semibold hover:underline transition-colors duration-200">
              Go to User Login
            </a>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 animate-fade-up-delay-3">
            {/* Sign In Button */}
            <Button
              className="w-full bg-gradient-to-r from-[#008060] to-[#006b51] hover:from-[#006b51] hover:to-[#005d47] text-white py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl shadow-lg relative overflow-hidden group"
              onClick={handleAdminLogin}
              disabled={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Authenticating...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Access Admin Portal
                  <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="flex-1 relative overflow-hidden group h-screen">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#008060]/20 via-transparent to-[#006b51]/30 z-10"></div>

        {/* Animated Floating Elements */}
        <div className="absolute top-20 right-20 w-4 h-4 bg-white/30 rounded-full animate-floating z-20"></div>
        <div className="absolute bottom-32 right-32 w-3 h-3 bg-white/40 rounded-full animate-floating z-20" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-12 w-2 h-2 bg-white/50 rounded-full animate-floating z-20" style={{animationDelay: '2s'}}></div>

        {/* Welcome Text Overlay */}
        <div className="absolute bottom-12 left-12 z-20 text-white animate-fade-up-delay-4">
          <h3 className="text-2xl font-bold mb-2">Manage Your Alumni Network</h3>
          <p className="text-white/90 text-sm max-w-sm leading-relaxed">
            Access powerful tools to manage events, approvals, and stay connected with your alumni community.
          </p>
        </div>

        <img
          src="/login-art.png"
          alt="Admin Portal"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
          onError={(e) => {
            console.error('Failed to load image:', e.currentTarget.src);
          }}
        />
      </div>
    </div>
  );
};