/**
 * Configuration and resolver for Backend API endpoints.
 * Supports:
 * 1. Cloudflare Tunnel (e.g. https://api.trg.id.vn)
 * 2. Vercel environment variable (VITE_API_BASE_URL)
 * 3. Localhost development (fallback to relative /api)
 * 4. Runtime user setting stored in localStorage
 */

const STORAGE_API_BASE_KEY = 'qlvb_api_base_url_v2';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_API_BASE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }

  // Check Vite client-side environment variable
  const envUrl = ((import.meta as any).env?.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // Relative path (same origin or local dev)
  return '';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = (url || '').trim().replace(/\/+$/, '');
  if (!cleaned) {
    localStorage.removeItem(STORAGE_API_BASE_KEY);
  } else {
    localStorage.setItem(STORAGE_API_BASE_KEY, cleaned);
  }
}

/**
 * Returns full URL for an API path.
 * e.g. apiUrl('/api/db-status') -> "https://api.trg.id.vn/api/db-status" or "/api/db-status"
 */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Test connectivity to the Backend API (via Cloudflare Tunnel or local)
 */
export async function testBackendApiConnection(targetUrl?: string): Promise<{
  connected: boolean;
  mySqlConnected: boolean;
  message: string;
  data?: any;
}> {
  const base = targetUrl !== undefined ? targetUrl.trim().replace(/\/+$/, '') : getApiBaseUrl();
  const endpoint = base ? `${base}/api/db-status` : '/api/db-status';

  try {
    const start = performance.now();
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const duration = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        connected: false,
        mySqlConnected: false,
        message: `Máy chủ phản hồi mã lỗi HTTP ${res.status} (${res.statusText}) [${duration}ms]`,
      };
    }

    const data = await res.json();
    return {
      connected: true,
      mySqlConnected: Boolean(data.connected),
      message: data.connected
        ? `Kết nối thành công tới Backend API & MySQL (${duration}ms)!`
        : `Kết nối được tới Backend API (${duration}ms), nhưng MySQL cục bộ chưa kết nối: ${data.error || 'Kiểm tra port 3306'}`,
      data,
    };
  } catch (err: any) {
    return {
      connected: false,
      mySqlConnected: false,
      message: `Không thể kết nối đến ${endpoint}: ${err.message || 'Lỗi mạng / CORS hoặc máy chủ chưa bật'}`,
    };
  }
}
