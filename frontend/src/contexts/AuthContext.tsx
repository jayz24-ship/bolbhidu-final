import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../utils/api';
import { getGoogleIdToken } from '../utils/googleAuth';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  isAdmin?: boolean;
  reportCount?: number;
  suspendedUntil?: Date | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (data: { name?: string; bio?: string; location?: string; avatar?: string }) => Promise<void>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session - simple check without API call
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        // Invalid user data, clear everything
        console.log('[AuthContext] Invalid user data, clearing session');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_id');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.auth.login(email, password);
      const userData = response.data.user;
      
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('user_id', userData.id);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!googleClientId) {
        throw new Error('Google OAuth not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.');
      }

      // Get ID token from Google using One Tap
      const idToken = await getGoogleIdToken(googleClientId);

      // Send ID token to backend
      const response = await apiService.auth.loginWithGoogle(idToken);
      const userData = response.data.user;
      
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('user_id', userData.id);
      setUser(userData);
    } catch (error: any) {
      console.error('[Google Login Error]', error);
      throw new Error(error.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.auth.register(email, password, name);
      const userData = response.data.user;
      
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('user_id', userData.id);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    setUser(null);
  };

  const updateProfile = async (data: { name?: string; bio?: string; location?: string; avatar?: string }) => {
    setIsLoading(true);
    try {
      console.log('[AuthContext] Updating profile with data:', data);
      console.log('[AuthContext] Data types:', {
        name: typeof data.name,
        bio: typeof data.bio,
        location: typeof data.location,
        avatar: typeof data.avatar,
      });
      console.log('[AuthContext] Avatar value:', data.avatar);
      const response = await apiService.auth.updateProfile(data);
      console.log('[AuthContext] Profile update response:', response.data);
      
      const userData = response.data.user;
      
      if (!userData) {
        console.error('[AuthContext] No user data in response:', response.data);
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('user_data', JSON.stringify(userData));
      setUser(userData);
      console.log('[AuthContext] Profile updated successfully');
    } catch (error: any) {
      console.error('[AuthContext] Profile update error:', error);
      console.error('[AuthContext] Error response:', error.response?.data);
      
      // Handle different error response structures
      const errorMessage = 
        error.response?.data?.error?.message || 
        error.response?.data?.message || 
        error.message || 
        'Profile update failed';
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    register,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};