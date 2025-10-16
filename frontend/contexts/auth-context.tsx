import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// GraphQL endpoint
const GRAPHQL_ENDPOINT = "http://localhost:4000/graphql"; // Update with your backend URL

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
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
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
          `,
          variables: {
            input: { email, password },
          },
        }),
      });

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0].message);
      }

      const { token: newToken, user: newUser } = data.login;

      // Store auth data
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (input: RegisterInput) => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
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
          `,
          variables: { input },
        }),
      });

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0].message);
      }

      const { token: newToken, user: newUser } = data.register;

      // Store auth data
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
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
