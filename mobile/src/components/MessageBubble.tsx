import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../api/messaging';
import { theme } from '../theme';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}

export function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <View style={[styles.wrap, mine ? styles.mineWrap : styles.theirsWrap]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.body, mine && styles.mineBody]}>{message.body}</Text>
        <Text style={[styles.time, mine && styles.mineTime]}>{formatTime(message.createdAt)}</Text>
      </View>
      {mine && message.readAt ? <Text style={styles.receipt}>Read</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 3, maxWidth: '82%' },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
    ...theme.shadow.sm,
  },
  mine: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 6,
  },
  theirs: {
    backgroundColor: theme.colors.white,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  body: { fontSize: theme.font.sizeMd, color: theme.colors.ink, lineHeight: 21 },
  mineBody: { color: theme.colors.white },
  time: {
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  mineTime: { color: 'rgba(255,255,255,0.75)' },
  receipt: { fontSize: 11, color: theme.colors.muted, marginTop: 2, marginRight: 4 },
});
