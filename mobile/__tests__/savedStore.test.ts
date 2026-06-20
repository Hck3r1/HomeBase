import { useSavedStore } from '../src/store/savedStore';

jest.mock('../src/lib/secureStorage', () => ({
  secureStorage: {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  },
}));

describe('savedStore', () => {
  beforeEach(() => {
    useSavedStore.setState({ ids: [], hydrated: true });
  });

  it('toggles a listing id', async () => {
    const { toggle, isSaved } = useSavedStore.getState();
    expect(isSaved('abc')).toBe(false);
    await toggle('abc');
    expect(useSavedStore.getState().isSaved('abc')).toBe(true);
    await toggle('abc');
    expect(useSavedStore.getState().isSaved('abc')).toBe(false);
  });
});
