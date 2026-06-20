import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useSavedStore } from './src/store/savedStore';
import { ToastProvider } from './src/components/Toast';

export default function App() {
  useEffect(() => {
    void useAuthStore.getState().hydrate();
    void useSavedStore.getState().hydrate();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RootNavigator />
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
