import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Validate API base URL format.
 */
function validateApiBaseUrl(url: string): { valid: boolean; warning?: string } {
  try {
    const urlObj = new URL(url);
    
    // Check for valid protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        warning: `Invalid API URL protocol: ${urlObj.protocol}. Use http:// or https://`,
      };
    }
    
    // Check if URL ends with /api (common Laravel API pattern)
    if (!url.endsWith('/api') && !url.endsWith('/api/')) {
      return {
        valid: true,
        warning: 'API URL should typically end with /api. Current URL: ' + url,
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      warning: `Invalid API URL format: ${url}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Validate and normalize the base URL
    let normalizedUrl = baseUrl.trim();
    
    // Remove trailing slash if present (except for root path)
    if (normalizedUrl.endsWith('/') && normalizedUrl !== 'http://' && normalizedUrl !== 'https://') {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    this.baseUrl = normalizedUrl;
    
    // Validate API configuration
    const validation = validateApiBaseUrl(this.baseUrl);
    
    // Log API configuration in development
    if (import.meta.env.DEV) {
      console.log('[ApiClient] Initialized with base URL:', this.baseUrl);
      
      if (!import.meta.env.VITE_API_BASE_URL) {
        console.warn('[ApiClient] VITE_API_BASE_URL not set, using default:', this.baseUrl);
        console.warn('[ApiClient] To configure, set VITE_API_BASE_URL in your .env file');
      }
      
      if (validation.warning) {
        console.warn('[ApiClient] Configuration warning:', validation.warning);
      }
      
      if (!validation.valid) {
        console.error('[ApiClient] Invalid API configuration:', validation.warning);
      }
    }
    
    // In production, still log critical configuration issues
    if (!validation.valid && import.meta.env.PROD) {
      console.error('[ApiClient] Invalid API URL configuration. API requests may fail.');
    }
  }

  /**
   * Get the current Supabase JWT token.
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Make an authenticated API request.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    const method = options.method || 'GET';
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (import.meta.env.DEV) {
      console.warn('[ApiClient] No authentication token available for request:', method, endpoint);
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    // Log request details in development
    if (import.meta.env.DEV) {
      console.log(`[ApiClient] ${method} ${url}`, {
        hasAuth: !!token,
        body: options.body ? JSON.parse(options.body as string) : undefined,
      });
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401) {
        console.warn('[ApiClient] Received 401, attempting to refresh token...');
        // Try to refresh the token
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${session.access_token}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          if (!retryResponse.ok) {
            throw await this.handleError(retryResponse, url, method);
          }
          
          return await retryResponse.json();
        } else {
          throw new Error('Authentication required. Please log in to start a quiz.');
        }
      }

      if (!response.ok) {
        throw await this.handleError(response, url, method);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : ({} as T);
      }

      return {} as T;
    } catch (error) {
      // Enhanced error handling for network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        // Network error - server unreachable, CORS issue, or connection problem
        const errorMessage = this.getNetworkErrorMessage(url);
        console.error('[ApiClient] Network error:', {
          url,
          method,
          error: errorMessage,
          baseUrl: this.baseUrl,
        });
        throw new Error(errorMessage);
      }
      
      // CORS errors
      if (error instanceof TypeError && error.message.includes('CORS')) {
        const errorMessage = 'Cross-origin request blocked. Please check CORS configuration on the API server.';
        console.error('[ApiClient] CORS error:', { url, method });
        throw new Error(errorMessage);
      }
      
      // Re-throw ApiError instances (from handleError)
      if (error instanceof Error && 'message' in error) {
        console.error('[ApiClient] Request failed:', {
          url,
          method,
          error: error.message,
        });
        throw error;
      }
      
      // Unknown error
      console.error('[ApiClient] Unexpected error:', {
        url,
        method,
        error,
      });
      throw new Error('An unexpected error occurred while connecting to the server.');
    }
  }

  /**
   * Get a user-friendly error message for network errors.
   */
  private getNetworkErrorMessage(url: string): string {
    // Check if it's a localhost URL
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'Unable to connect to the quiz server. Please ensure the API server is running at ' + this.baseUrl;
    }
    
    // Check if API_BASE_URL is using default
    if (!import.meta.env.VITE_API_BASE_URL) {
      return 'API server URL not configured. Please set VITE_API_BASE_URL environment variable.';
    }
    
    return 'Unable to connect to the quiz server. Please check your internet connection and ensure the API server is accessible.';
  }

  /**
   * Handle API errors.
   */
  private async handleError(response: Response, url?: string, method?: string): Promise<ApiError> {
    const contentType = response.headers.get('content-type');
    
    // Log error details
    console.error('[ApiClient] API error response:', {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
    });
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const error = await response.json();
        const message = error.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Provide user-friendly messages for common status codes
        if (response.status === 400) {
          return {
            message: message.includes('questions') && message.includes('empty')
              ? 'This quiz has no questions available. Please select another quiz.'
              : `Invalid request: ${message}`,
            errors: error.errors,
          };
        }
        
        if (response.status === 403) {
          return {
            message: 'You do not have permission to access this resource.',
            errors: error.errors,
          };
        }
        
        if (response.status === 404) {
          return {
            message: 'The requested resource was not found. Please try again.',
            errors: error.errors,
          };
        }
        
        if (response.status >= 500) {
          return {
            message: `Server error: ${message}. Please try again later.`,
            errors: error.errors,
          };
        }
        
        return {
          message,
          errors: error.errors,
        };
      } catch (parseError) {
        // Failed to parse JSON error response
        console.error('[ApiClient] Failed to parse error response:', parseError);
      }
    }

    // Provide user-friendly messages for common status codes
    if (response.status === 400) {
      return {
        message: 'Invalid request. Please check your input and try again.',
      };
    }
    
    if (response.status === 403) {
      return {
        message: 'You do not have permission to perform this action.',
      };
    }
    
    if (response.status === 404) {
      return {
        message: 'The requested resource was not found.',
      };
    }
    
    if (response.status >= 500) {
      return {
        message: `Server error (${response.status}). Please try again later.`,
      };
    }

    return {
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  /**
   * GET request.
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request.
   */
  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request.
   */
  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request.
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Fetch decks (quizzes).
   */
  async fetchDecks(params?: {
    module?: number;
    kind?: 'public' | 'user' | 'public-rw-listed' | 'bookmarked';
  }) {
    const queryParams = new URLSearchParams();
    if (params?.module) {
      queryParams.append('module', params.module.toString());
    }
    if (params?.kind) {
      queryParams.append('kind', params.kind);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/decks?${queryString}` : '/decks';
    
    return this.get(endpoint);
  }

  /**
   * Fetch a specific deck by ID.
   */
  async fetchDeck(id: number | string) {
    return this.get(`/decks/${id}`);
  }

  /**
   * Fetch user sessions.
   */
  async fetchSessions(take?: number) {
    const endpoint = take ? `/sessions?take=${take}` : '/sessions';
    return this.get(endpoint);
  }

  /**
   * Create a new session from a deck.
   */
  async createSession(deckId: number): Promise<{ id: number }> {
    return this.post<{ id: number }>('/sessions', { deck_id: deckId });
  }

  /**
   * Fetch a specific session by ID.
   */
  async fetchSession(id: number | string) {
    return this.get(`/sessions/${id}`);
  }

  /**
   * Update a session.
   */
  async updateSession(id: number | string, data: Record<string, unknown>) {
    return this.put(`/sessions/${id}`, data);
  }

  /**
   * Create answer choice for a session.
   */
  async createAnswerChoice(
    sessionId: number | string,
    questionId: number,
    answerId: number
  ) {
    return this.post(`/sessions/${sessionId}/answerchoices`, {
      question_id: questionId,
      answer_id: answerId,
    });
  }

  /**
   * Check if the API server is reachable.
   * This is a lightweight health check that can be called before making requests.
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Try to fetch a simple endpoint (public decks endpoint is a good choice)
      const response = await fetch(`${this.baseUrl}/decks/public`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      return response.ok || response.status === 401; // 401 is OK, means server is reachable
    } catch (error) {
      console.warn('[ApiClient] Health check failed:', error);
      return false;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);




