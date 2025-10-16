import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    console.log('🔵 AuthGuard useEffect triggered');
    console.log('🔵 AuthGuard state:', { loading, isAuthenticated, segments });
    
    if (loading) {
      console.log('🔵 AuthGuard: Still loading auth state...');
      return; // Don't navigate while loading
    }

    const inAuthGroup = segments[0] === 'auth';
    console.log('🔵 AuthGuard: isAuthenticated:', isAuthenticated, 'inAuthGroup:', inAuthGroup, 'segments:', segments);

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and trying to access protected route
      console.log('🔵 AuthGuard: Redirecting to login (not authenticated, not in auth group)');
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but on auth page, redirect to main app
      console.log('🔵 AuthGuard: Redirecting to tabs (authenticated, in auth group)');
      router.replace('/(tabs)');
    } else {
      console.log('🔵 AuthGuard: No navigation needed');
    }
  }, [isAuthenticated, loading, segments]);

  // Show loading screen while checking auth status
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
