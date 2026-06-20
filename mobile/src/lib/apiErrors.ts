import axios from 'axios';

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.error?.message;
    if (typeof message === 'string' && message.length > 0) return message;
    if (err.message === 'Network Error') {
      return 'Cannot reach the server. Check your connection and that the API is running.';
    }
  }
  return fallback;
}
