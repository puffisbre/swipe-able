import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { decode } from 'react-native-jwt-io';

// Get the appropriate backend URL based on environment
const getBackendUrl = () => {
  // In development, use localhost for simulator, or your computer's IP for physical device
  if (__DEV__) {
    // Try to use the Expo dev server's IP if available
    const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
      return `http://${expoHost}:4000/graphql`;
    }
    // Fallback to localhost for simulator
    return "http://localhost:4000/graphql";
  }
  // In production, use your actual backend URL
  return "https://your-production-backend.com/graphql";
};

const GRAPHQL_ENDPOINT = getBackendUrl();
const TOKEN_KEY = "@auth_token";

// Debug log to see which URL is being used
if (__DEV__) {
  console.log('🔗 GraphQL Endpoint:', GRAPHQL_ENDPOINT);
}

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class GraphQLClient {
  private endpoint: string;
  private onAuthError?: () => void;

  constructor(endpoint: string = GRAPHQL_ENDPOINT) {
    this.endpoint = endpoint;
  }

  // Set callback for auth errors (like token expiration)
  setAuthErrorCallback(callback: () => void) {
    this.onAuthError = callback;
  }

  // Check if token is expired using react-native-jwt-io
  private isTokenExpired(token: string): boolean {
    try {
      const decoded = decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      console.warn('Error decoding token:', error);
      return true;
    }
  }

  async request<T = any>(
    query: string,
    variables?: Record<string, any>,
    includeAuth: boolean = true
  ): Promise<GraphQLResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add auth header if needed
      if (includeAuth) {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          // Only check token expiration for authenticated requests, not for logout
          if (this.isTokenExpired(token)) {
            console.warn('Token is expired, triggering logout');
            if (this.onAuthError) {
              this.onAuthError();
            }
            throw new Error('Token expired');
          }
          headers.Authorization = `Bearer ${token}`;
        }
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Check for authentication errors in GraphQL response
      if (result.errors) {
        const authError = result.errors.find((error: any) => 
          error.message.includes('Du måste vara inloggad') ||
          error.message.includes('Authentication') ||
          error.message.includes('Token')
        );
        
        if (authError && this.onAuthError) {
          this.onAuthError();
          throw new Error('Authentication failed');
        }
      }
      
      return result;
    } catch (error) {
      console.error('GraphQL request error:', error);
      throw error;
    }
  }

  // Helper method for authenticated requests
  async authenticatedRequest<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    return this.request<T>(query, variables, true);
  }

  // Helper method for public requests (login, register)
  async publicRequest<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    return this.request<T>(query, variables, false);
  }
}

// Export a default instance
export const graphqlClient = new GraphQLClient();
