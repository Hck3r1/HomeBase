import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyReview, useSubmitReview } from '../../api/reviews';
import { Conversation } from '../../api/messaging';
import { RATING_LABELS, STAR_COLOR, StarRating, ratingLabel } from '../StarRating';
import { useToast } from '../Toast';
import { theme } from '../../theme';

interface Props {
  visible: boolean;
  conversation: Conversation | undefined;
  onClose: () => void;
}

function SubmittedReview({ rating, comment }: { rating: number; comment?: string | null }) {
  return (
    <View style={styles.submitted}>
      <View style={styles.submittedTop}>
        <StarRating value={rating} readonly size={26} centered />
        <Text style={styles.submittedLabel}>{RATING_LABELS[rating]}</Text>
      </View>
      {comment ? <Text style={styles.submittedComment}>"{comment}"</Text> : null}
      <View style={styles.submittedBadge}>
        <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
        <Text style={styles.submittedBadgeText}>Review submitted</Text>
      </View>
    </View>
  );
}

function RatingBlock({
  icon,
  title,
  name,
  rating,
  comment,
  onRatingChange,
  onCommentChange,
  submitted,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  name: string;
  rating: number;
  comment: string;
  onRatingChange: (v: number) => void;
  onCommentChange: (v: string) => void;
  submitted?: { rating: number; comment: string | null } | null;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <View style={styles.blockIcon}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.blockCopy}>
          <Text style={styles.blockTitle}>{title}</Text>
          <Text style={styles.blockName} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>

      {submitted ? (
        <SubmittedReview rating={submitted.rating} comment={submitted.comment} />
      ) : (
        <>
          <View style={styles.starsWrap}>
            <StarRating value={rating} onChange={onRatingChange} size={36} showLabel centered />
            <Text style={styles.tapHint}>{rating > 0 ? ratingLabel(rating) : 'Tap a star to rate'}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder={`Share details about the ${title.toLowerCase()} (optional)`}
            placeholderTextColor={theme.colors.muted}
            value={comment}
            onChangeText={onCommentChange}
            multiline
          />
        </>
      )}
    </View>
  );
}

export function RatingSheet({ visible, conversation, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const submit = useSubmitReview();
  const listingId = conversation?.listing.id ?? '';
  const listerId = conversation?.counterparty?.id ?? '';
  const { data: listingReview } = useMyReview('listing', listingId, visible);
  const { data: listerReview } = useMyReview('lister', listerId, visible);

  const [listingStars, setListingStars] = useState(0);
  const [listerStars, setListerStars] = useState(0);
  const [listingComment, setListingComment] = useState('');
  const [listerComment, setListerComment] = useState('');

  useEffect(() => {
    if (!visible) return;
    setListingStars(listingReview?.rating ?? 0);
    setListerStars(listerReview?.rating ?? 0);
    setListingComment(listingReview?.comment ?? '');
    setListerComment(listerReview?.comment ?? '');
  }, [visible, listingReview, listerReview]);

  async function save() {
    if (!conversation) return;
    const tasks: Promise<unknown>[] = [];
    if (!listingReview && listingStars > 0) {
      tasks.push(
        submit.mutateAsync({
          targetType: 'listing',
          targetId: conversation.listing.id,
          rating: listingStars,
          comment: listingComment.trim() || undefined,
        }),
      );
    }
    if (!listerReview && listerStars > 0 && conversation.counterparty) {
      tasks.push(
        submit.mutateAsync({
          targetType: 'lister',
          targetId: conversation.counterparty.id,
          rating: listerStars,
          comment: listerComment.trim() || undefined,
        }),
      );
    }
    if (!tasks.length) {
      showToast('Select at least one rating to submit');
      return;
    }
    try {
      await Promise.all(tasks);
      showToast('Thanks for your feedback!');
      onClose();
    } catch {
      showToast('Could not submit review. You may have already rated.');
    }
  }

  const allDone = Boolean(listingReview && listerReview);
  const listerTitle = conversation?.counterparty?.listerType === 'agent' ? 'Agent' : 'Landlord';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing(2) }]}>
        <View style={styles.handle} />
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="star" size={22} color={STAR_COLOR} />
          </View>
          <Text style={styles.title}>Rate your experience</Text>
          <Text style={styles.subtitle}>Help other seekers with honest feedback after your inspection</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          <RatingBlock
            icon="home-outline"
            title="Property"
            name={conversation?.listing.title ?? ''}
            rating={listingStars}
            comment={listingComment}
            onRatingChange={setListingStars}
            onCommentChange={setListingComment}
            submitted={listingReview}
          />
          <RatingBlock
            icon="person-outline"
            title={listerTitle}
            name={conversation?.counterparty?.name ?? ''}
            rating={listerStars}
            comment={listerComment}
            onRatingChange={setListerStars}
            onCommentChange={setListerComment}
            submitted={listerReview}
          />
        </ScrollView>

        {allDone ? (
          <Pressable style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryText}>Done</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={save} disabled={submit.isPending}>
            {submit.isPending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.primaryText}>Submit review</Text>
            )}
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(21, 32, 29, 0.45)' },
  sheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(1),
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.line,
    marginBottom: theme.spacing(1.5),
  },
  hero: { alignItems: 'center', marginBottom: theme.spacing(2) },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.starLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1),
  },
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  subtitle: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing(2),
  },
  scroll: { flexGrow: 0 },
  block: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.25), marginBottom: theme.spacing(1.5) },
  blockIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockCopy: { flex: 1 },
  blockTitle: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockName: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginTop: 2 },
  starsWrap: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(1),
    marginBottom: theme.spacing(1.5),
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  tapHint: {
    textAlign: 'center',
    marginTop: theme.spacing(0.5),
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
  },
  input: {
    backgroundColor: theme.colors.input,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing(1.5),
    minHeight: 72,
    color: theme.colors.ink,
    fontSize: theme.font.sizeSm,
    textAlignVertical: 'top',
  },
  submitted: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: theme.spacing(1),
  },
  submittedTop: { alignItems: 'center', gap: 4 },
  submittedLabel: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
    color: theme.colors.primary,
  },
  submittedComment: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.ink,
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  submittedBadgeText: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.primary,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center',
    marginTop: theme.spacing(0.5),
  },
  primaryText: { color: theme.colors.white, fontWeight: theme.font.weightBold, fontSize: theme.font.sizeMd },
  secondaryBtn: {
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
    marginTop: theme.spacing(0.5),
  },
  secondaryText: { color: theme.colors.ink, fontWeight: theme.font.weightSemibold },
});
