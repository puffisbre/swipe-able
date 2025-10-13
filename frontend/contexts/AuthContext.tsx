import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@apollo/client";
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  ME_QUERY,
} from "../utils/graphql-queries";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  friendCode: string;
  profileImage?: string;
  friends?: User[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface LoginResponse {
  login: AuthResponse;
}

interface RegisterResponse {
  register: AuthResponse;
}

interface MeResponse {
  me: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<{ success: boolean; error?: string }>;
  register: (
    input: RegisterInput
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // GraphQL mutations and queries
  const [loginMutation] = useMutation<LoginResponse>(LOGIN_MUTATION);
  const [registerMutation] = useMutation<RegisterResponse>(REGISTER_MUTATION);

  const {
    data: userData,
    refetch: refetchUser,
    error: userError,
  } = useQuery<MeResponse>(ME_QUERY, {
    skip: !isAuthenticated,
    errorPolicy: "all",
  });

  // Handle user data updates
  useEffect(() => {
    if (userData?.me) {
      setUser(userData.me);
    }
  }, [userData]);

  // Handle user query errors
  useEffect(() => {
    if (userError) {
      console.error("Error fetching user:", userError);
      // If token is invalid, logout
      if (
        userError.message.includes("inloggad") ||
        userError.message.includes("authentication")
      ) {
        logout();
      }
    }
  }, [userError]);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        setIsAuthenticated(true);
        // ME_QUERY will be triggered automatically due to skip: !isAuthenticated
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsLoading(false);
    }
  };

  const login = async (
    input: LoginInput
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const { data } = await loginMutation({
        variables: { input },
      });

      if (data?.login?.token && data?.login?.user) {
        // Store token
        await AsyncStorage.setItem("authToken", data.login.token);

        // Update state
        setUser(data.login.user);
        setIsAuthenticated(true);

        return { success: true };
      } else {
        return { success: false, error: "Inloggning misslyckades" };
      }
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.message || "Ett fel uppstod vid inloggning",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    input: RegisterInput
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const { data } = await registerMutation({
        variables: { input },
      });

      if (data?.register?.token && data?.register?.user) {
        // Store token
        await AsyncStorage.setItem("authToken", data.register.token);

        // Update state
        setUser(data.register.user);
        setIsAuthenticated(true);

        return { success: true };
      } else {
        return { success: false, error: "Registrering misslyckades" };
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: error.message || "Ett fel uppstod vid registrering",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Remove token from storage
      await AsyncStorage.removeItem("authToken");

      // Reset state
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const refreshUser = () => {
    if (isAuthenticated) {
      refetchUser();
    }
  };

  // Update loading state when user data is fetched
  useEffect(() => {
    if (isAuthenticated && (userData?.me || userData === undefined)) {
      setIsLoading(false);
    }
  }, [userData, isAuthenticated]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
