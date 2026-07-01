export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  teamId?: string;
  teamName?: string;
  /**
   * V25D78-C55.7.7 BUG-L1: optional human-friendly display name. When the
   * backend starts returning this field (post C55.7.x), the dashboard
   * welcome banner will prefer it over the raw username. Until then the
   * helper falls back to the email so the banner is still readable.
   */
  displayName?: string | null;
}
