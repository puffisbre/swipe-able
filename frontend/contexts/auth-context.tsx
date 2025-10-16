import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { graphqlClient } from "@/utils/graphql-client";

// Types
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  friendCode: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

interface RegisterInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

// GraphQL endpoint is now handled by graphqlClient

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "@auth_token";
const USER_KEY = "@auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Set up auth error callback for GraphQL client
  useEffect(() => {
    const handleAuthError = async () => {
      console.log('Auth error detected, logging out user');
      // Clear stored data
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    };
    
    graphqlClient.setAuthErrorCallback(handleAuthError);
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading auth data:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, errors } = await graphqlClient.publicRequest(`
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user {
              id
              username
              email
              firstName
              lastName
              friendCode
              profileImage
            }
          }
        }
      `, {
        input: { email, password },
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      const { token: newToken, user: newUser } = data.login;

      // Store auth data
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      
      // Navigation will be handled by AuthGuard
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (input: RegisterInput) => {
    try {
      const { data, errors } = await graphqlClient.publicRequest(`
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
            user {
              id
              username
              email
              firstName
              lastName
              friendCode
              profileImage
            }
          }
        }
      `, { input });

      if (errors) {
        throw new Error(errors[0].message);
      }

      const { token: newToken, user: newUser } = data.register;

      // Store auth data
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      
      // Navigation will be handled by AuthGuard
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout mutation on server (optional, for logging purposes)
      try {
        await graphqlClient.authenticatedRequest(`
          mutation Logout {
            logout
          }
        `);
      } catch (error) {
        // If logout mutation fails, we still want to clear local data
        console.warn("Logout mutation failed:", error);
      }

      // Clear stored data
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);

      setToken(null);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
