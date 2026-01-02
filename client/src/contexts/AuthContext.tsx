
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Alumni } from '../../../shared/supabase';

interface AuthContextType {
  user: User | null;
  alumni: Alumni | null;
  faculty: any | null;
  student: any | null;
  admin: any | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  hasRole: (roles: string | string[]) => boolean;
  isAlumni: boolean;
  isStudent: boolean;
  isFaculty: boolean;
  isAdministrator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = React.useState<User | null>(null);
  const [alumni, setAlumni] = React.useState<Alumni | null>(null);
  const [faculty, setFaculty] = React.useState<any | null>(null);
  const [student, setStudent] = React.useState<any | null>(null);
  const [admin, setAdmin] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('user');
    console.log('AuthContext init - stored user:', storedUser ? 'exists' : 'none');

    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('AuthContext - parsed user data:', userData.id, 'is_admin:', userData.is_admin);

        setUser(userData);
        console.log('AuthContext - user set in state');
        // Fetch current user data
        fetchCurrentUser(userData.id);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
      }
    }

    setIsLoading(false);

    // Listen for storage changes (when user data is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const userData = JSON.parse(e.newValue);
          fetchCurrentUser(userData.id);
        } catch (error) {
          console.error('Error parsing updated user:', error);
        }
      }
    };

    // Listen for custom profile update events
    const handleProfileUpdate = () => {
      if (user?.id) {
        fetchCurrentUser(user.id);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id]);

  const fetchCurrentUser = async (userId: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'user-id': userId
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch user data:', response.status);
        if (response.status === 401) {
          // User session is invalid, clear local storage
          localStorage.removeItem('user');
          setUser(null);
          setAlumni(null);
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setAlumni(data.alumni);
      } else {
        console.error('Failed to fetch current user, status:', response.status);
        // Don't logout automatically, just clear the invalid session
        setUser(null);
        setAlumni(null);
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Don't logout automatically on network errors
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful, setting user data:', data.user);
        setUser(data.user);
        setAlumni(data.alumni);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userId', data.user.id);
        return true;
      } else {
        console.error('Login failed:', data.error);
        const errorMessage = data.error || 'Login failed';
        setError(errorMessage);
        // Throw error so it can be caught in the login page for special handling
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Network error. Please try again.';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        return true;
      } else {
        setError(data.error || 'Registration failed');
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAlumni(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.user_role);
  };

  const isAlumni = user?.user_role === 'alumni';
  const isStudent = user?.user_role === 'student';
  const isFaculty = user?.user_role === 'faculty';
  const isAdministrator = user?.user_role === 'administrator' || user?.is_admin === true;

  return (
    <AuthContext.Provider value={{
      user,
      alumni,
      faculty,
      student,
      admin,
      login,
      register,
      logout,
      isLoading,
      error,
      hasRole,
      isAlumni,
      isStudent,
      isFaculty,
      isAdministrator
    }}>
      {children}
    </AuthContext.Provider>
  );
}
