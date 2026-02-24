/**
 * Axios API client with authentication interceptors
 */

import axios from 'axios';
import { getToken } from './auth';

// Create axios instance with base configuration
console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL);
export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add authentication token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = getToken();

    // If token exists, add Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle authentication errors
api.interceptors.response.use(
  (response) => {
    // Return successful responses as-is
    return response;
  },
  (error) => {
    // Check for 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Only redirect if we're in the browser (not during SSR)
      if (typeof window !== 'undefined') {
        // Don't redirect if this is a login attempt (expected to fail with 401)
        const isLoginRequest = error.config?.url?.includes('/auth/login');

        // Don't redirect if already on login page
        const isOnLoginPage = window.location.pathname === '/login';

        if (!isLoginRequest && !isOnLoginPage) {
          // Remove invalid token
          localStorage.removeItem('token');

          // Redirect to login page
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);
