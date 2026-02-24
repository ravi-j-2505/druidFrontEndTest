
import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { loginUser, registerUser, getCurrentUser } from '@/services/api';
import IndexedDB from '@/lib/IndexedDB';

// Create a global reference to the logout function
let globalLogout: (() => void) | null = null;

// This function can be called from anywhere to trigger a logout
export const triggerLogout = () => {
  if (globalLogout) {
    globalLogout();
  }
};

interface User {
  user_id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await loginUser(email, password);
      
      if (response.error) {
        toast.error(response.error);
        return;
      }
      
      if (response.data) {
        const { access_token } = response.data;
        setToken(access_token);
        localStorage.setItem('token', access_token);
        
        // Fetch user profile with the token
        const userResponse = await getCurrentUser(access_token);
        
        if (userResponse.error) {
          toast.error(userResponse.error);
          return;
        }
        
        if (userResponse.data) {
          setUser(userResponse.data);
          localStorage.setItem('user', JSON.stringify(userResponse.data));
          toast.success("Successfully logged in!");
        }
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await registerUser(email, username, password);
      
      if (response.error) {
        toast.error(response.error);
        return;
      }
      
      if (response.data) {
        // Registration successful, now login to get the token
        await login(email, username, password);
        toast.success("Successfully registered!");
      }
    } catch (error) {
      toast.error("Registration failed. Please try again.");
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // IndexedDB.truncate('documents')

    toast.success("Successfully logged out!");
  };

  // Store the logout function in the global reference
  useEffect(() => {
    globalLogout = logout;
    
    return () => {
      globalLogout = null;
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isAuthenticated: !!user,
      login, 
      register, 
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
