import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FavoriteButton } from '../src/components/FavoriteButton';
import { api } from '../src/lib/api';

jest.spyOn(api, 'get').mockResolvedValue({ data: [] } as any);
jest.spyOn(api, 'delete').mockResolvedValue({ data: {} } as any);

function renderButton() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['favorites'], []);
  return render(
    <QueryClientProvider client={client}>
      <FavoriteButton listingId="L1" />
    </QueryClientProvider>,
  );
}

describe('FavoriteButton', () => {
  it('optimistically flips to favorited on press', async () => {
    let resolvePost!: (value: unknown) => void;
    jest.spyOn(api, 'post').mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }) as any,
    );

    const { getByRole } = renderButton();
    const button = getByRole('button');
    expect(button.props.accessibilityState.selected).toBe(false);
    fireEvent.press(button);
    await waitFor(() => expect(getByRole('button').props.accessibilityState.selected).toBe(true));
    expect(api.post).toHaveBeenCalledWith('/favorites/L1');
    resolvePost({ data: { id: 'f1', listingId: 'L1' } });
  });
});
