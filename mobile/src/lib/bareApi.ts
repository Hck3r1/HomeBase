import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';

/** Axios client without auth interceptors — used for refresh and bootstrap calls. */
export const bareApi = axios.create({
  timeout: 15000,
});

bareApi.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});
