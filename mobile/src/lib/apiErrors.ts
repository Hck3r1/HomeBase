import axios from 'axios';

const OFFLINE =
  'Cannot reach the server. Make sure the backend is running (npm run dev in backend/) and your phone is on the same Wi‑Fi.';

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(err)) {
    const apiMessage = err.response?.data?.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.length > 0) return apiMessage;

    const plainMessage = err.response?.data?.message;
    if (typeof plainMessage === 'string' && plainMessage.length > 0) return plainMessage;

    if (!err.response) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        return `${OFFLINE} (request timed out)`;
      }
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        return OFFLINE;
      }
      return OFFLINE;
    }
  }
  return fallback;
}
