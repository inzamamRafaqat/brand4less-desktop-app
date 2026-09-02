export const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('brand4less_token');
  }

  /**
   * Builds a same-origin URL for a browser-native download (<a href> / download attr)
   * that carries the auth token as a query param, since anchors cannot set headers.
   */
  downloadUrl(endpoint: string): string {
    const token = this.getToken();
    const sep = endpoint.includes('?') ? '&' : '?';
    return `${API_BASE}${endpoint}${token ? `${sep}token=${encodeURIComponent(token)}` : ''}`;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('brand4less_token');
      localStorage.removeItem('brand4less_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    // Handle binary responses (e.g. excel / pdf downloads)
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('spreadsheet') || contentType.includes('pdf'))) {
      if (!response.ok) throw new Error('File download failed');
      const blob = await response.blob();
      return { success: true, blob } as any;
    }

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || `Request failed with status ${response.status}`);
    }

    return json;
  }

  get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any) {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  put<T = any>(endpoint: string, body?: any) {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
