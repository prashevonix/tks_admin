import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const LoginPage = (): JSX.Element => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { login, user } = useAuth();
  const { toast } = useToast();

  // Set page title
  React.useEffect(() => {
    document.title = "Login - TKS Alumni Portal";
  }, []);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      setLocation('/feed');
    }
  }, [user, setLocation]);

  // Secret key combination to access admin login (Ctrl+Shift+A)
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setLocation('/admin/login');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setLocation]);

  const handleSignIn = async () => {
    // Validate inputs
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!email.includes('@')) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await login(email, password);

      if (success) {
        // Check if there's a redirect URL stored (from shared post)
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectAfterLogin');
          setLocation(redirectUrl);
        } else {
          setLocation("/feed");
        }
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err: any) {
      // Check if it's a blocked account error
      if (err.message && err.message.includes("blocked")) {
        setError(err.message);
      } else {
        setError("An error occurred during login. Please try again.");
      }
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSignIn();
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
                <span className="text-white text-2xl font-bold">T</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
              Welcome Back
              <span className="text-2xl animate-wave">👋</span>
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Stay connected with your alumni network and the latest updates — all in one place.
            </p>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm animate-fade-up-delay-2">
            <CardContent className="p-8 space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-[#008060]">📧</span>
                  Email Address
                </label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
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
                <div className="text-right">
                  <a href="#" className="text-sm text-[#008060] hover:text-[#006b51] hover:underline transition-colors duration-200 font-medium">
                    Forgot Password?
                  </a>
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

          {/* Registration Link */}
          <div className="text-center text-sm text-gray-600 animate-fade-up-delay-4">
            Don't have an account?{" "}
            <a href="/signup" className="text-[#008060] hover:text-[#006b51] font-semibold hover:underline transition-colors duration-200">
              Register here to request access
            </a>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 animate-fade-up-delay-3">
            {/* Sign In Button */}
            <Button
              className="w-full bg-gradient-to-r from-[#008060] to-[#006b51] hover:from-[#006b51] hover:to-[#005d47] text-white py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl shadow-lg relative overflow-hidden group"
              onClick={handleSignIn}
              disabled={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing you in...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>

            {/* LinkedIn Sign In - Coming Soon */}
            <Button
              variant="outline"
              className="w-full border-2 border-gray-200 text-gray-400 py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 cursor-not-allowed opacity-50"
              disabled={true}
            >
              <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center">
                <span className="text-white text-sm font-bold">in</span>
              </div>
              <span>Sign in with LinkedIn (Coming Soon)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="flex-1 relative overflow-hidden group h-screen">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#008060]/20 via-transparent to-[#006b51]/30 z-10"></div>

        {/* Animated Floating Elements */}
        <div className="absolute top-20 right-20 w-4 h-4 bg-white/30 rounded-full z-20"></div>
        <div className="absolute bottom-32 right-32 w-3 h-3 bg-white/40 rounded-full z-20"></div>
        <div className="absolute top-1/2 right-12 w-2 h-2 bg-white/50 rounded-full z-20"></div>

        {/* Welcome Text Overlay */}
        <div className="absolute bottom-12 left-12 z-20 text-white animate-fade-up-delay-4">
          <h3 className="text-2xl font-bold mb-2">Join Your Alumni Network</h3>
          <p className="text-white/90 text-sm max-w-sm leading-relaxed">
            Connect with fellow graduates, discover opportunities, and stay updated with your alma mater.
          </p>
        </div>

        <img
          src="/login-art.png"
          alt="Login artwork"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
          onError={(e) => {
            console.error('Failed to load image:', e.currentTarget.src);
          }}
        />
      </div>
    </div>
  );
};