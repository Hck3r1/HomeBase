import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';

/** Axios client without auth interceptors — used for refresh and bootstrap calls. */
export const bareApi = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});
