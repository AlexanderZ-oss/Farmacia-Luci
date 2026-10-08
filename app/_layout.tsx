import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const { session, isLoading, setSession, fetchProfile, role } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure navigation is mounted before any redirect
    const timer = setTimeout(() => setIsNavigationReady(true), 100);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else useAuthStore.setState({ isLoading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else useAuthStore.setState({ isLoading: false, role: null });
    });

    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (isLoading || !isNavigationReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inStoreGroup = segments[0] === '(store)';
    const inAdminGroup = segments[0] === '(admin)';
    const inStockerGroup = segments[0] === '(stocker)';
    const inCashierGroup = segments[0] === '(cashier)';

    if (!session) {
      // Not logged in: allow store and auth, redirect everything else
      if (!inAuthGroup && !inStoreGroup) {
        router.replace('/(store)');
      }
    } else if (inAuthGroup) {
      // Logged in but on auth screen: redirect to correct panel
      if (role === 'admin') router.replace('/(admin)');
      else if (role === 'stocker') router.replace('/(stocker)');
      else if (role === 'cashier') router.replace('/(cashier)');
      else router.replace('/(store)');
    } else {
      // Logged in: enforce role access to protected panels
      if (inAdminGroup && role !== 'admin') router.replace('/(store)');
      if (inStockerGroup && role !== 'stocker' && role !== 'admin') router.replace('/(store)');
      if (inCashierGroup && role !== 'cashier' && role !== 'admin') router.replace('/(store)');
    }
  }, [session, isLoading, role, segments, isNavigationReady]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});
