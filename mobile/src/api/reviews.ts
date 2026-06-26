import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface Review {
  id: string;
  reviewerId: string;
  targetType: 'listing' | 'lister';
  targetId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export function useRatingSummary(targetType: 'listing' | 'lister', targetId: string) {
  return useQuery({
    queryKey: ['rating-summary', targetType, targetId],
    queryFn: async () =>
      (await api.get<RatingSummary>('/reviews/summary', { params: { targetType, targetId } })).data,
    enabled: Boolean(targetId),
  });
}

export function useMyReview(targetType: 'listing' | 'lister', targetId: string, enabled = true) {
  return useQuery({
    queryKey: ['my-review', targetType, targetId],
    queryFn: async () =>
      (await api.get<Review | null>('/reviews/mine', { params: { targetType, targetId } })).data,
    enabled: enabled && Boolean(targetId),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      targetType: 'listing' | 'lister';
      targetId: string;
      rating: number;
      comment?: string;
    }) => (await api.post<Review>('/reviews', input)).data,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['rating-summary', vars.targetType, vars.targetId] });
      void qc.invalidateQueries({ queryKey: ['my-review', vars.targetType, vars.targetId] });
      void qc.invalidateQueries({ queryKey: ['conversation'] });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
