import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { theme } from '../../theme';

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  React.useEffect(() => {
    return () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    };
  }, [qc]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + theme.spacing(2) }]}>
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />
      <EmptyState
        icon="notifications-outline"
        title="No notifications yet"
        text="Alerts for new messages, listing updates, and inspection reminders will show up here."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
});
