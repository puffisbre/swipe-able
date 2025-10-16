import AsyncStorage from '@react-native-async-storage/async-storage';

const GRAPHQL_ENDPOINT = "http://localhost:4000/graphql";
const TOKEN_KEY = "@auth_token";

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

  // Simple JWT decode without external dependency
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  // Check if token is expired
  private isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeJWT(token);
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
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
          // Check if token is expired
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
