import { useEffect, useState } from 'react';
import { Slot, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { C } from '../lib/theme';

export default function RootLayout() {
  const { session, isLoading, setSession, fetchProfile, role } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
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

    const run = () => {
      const inAuthGroup = segments[0] === '(auth)';
      const inStoreGroup = segments[0] === '(store)';
      const inAdminGroup = segments[0] === '(admin)';
      const inStockerGroup = segments[0] === '(stocker)';
      const inCashierGroup = segments[0] === '(cashier)';
      const inSupportGroup = segments[0] === '(support)';

      const goToRoleHome = () => {
        if (role === 'admin') return '/(admin)';
        if (role === 'stocker') return '/(stocker)';
        if (role === 'cashier') return '/(cashier)';
        return '/(store)';
      };

      if (!session) {
        if (!inAuthGroup && !inStoreGroup) {
          router.replace('/(store)');
        }
        return;
      }

      if (inAuthGroup) {
        if (params.returnTo === 'checkout' && role === null) return;
        if (params.returnTo === 'checkout' && role === 'customer') {
          router.replace('/(store)/checkout');
          return;
        }
        router.replace(goToRoleHome());
        return;
      }

      if (inAdminGroup && role !== 'admin') {
        router.replace(goToRoleHome());
        return;
      }

      if (inStockerGroup && role !== 'stocker' && role !== 'admin') {
        router.replace(goToRoleHome());
        return;
      }

      if (inCashierGroup && role !== 'cashier') {
        router.replace(goToRoleHome());
        return;
      }

      // Soporte: todos los roles autenticados pueden reportar/ver sus tickets.
      // La gestión (cambiar progreso) queda restringida al admin en la pantalla.

      if (!inAuthGroup && !inStoreGroup && !inAdminGroup && !inStockerGroup && !inCashierGroup && !inSupportGroup && role !== 'customer') {
        router.replace(goToRoleHome());
      }
    };

    // Diferir al siguiente tick: garantiza que el Root Layout ya esté montado.
    const t = setTimeout(run, 0);
    return () => clearTimeout(t);
  }, [session, isLoading, role, segments, isNavigationReady, params.returnTo]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16A34A" />
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
    backgroundColor: '#FFFFFF',
  },
});
