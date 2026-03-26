// ============================================
// AUTH TYPES & INTERFACES
// ============================================

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
  role?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

export interface Complete2FALoginDTO {
  tempToken: string;
  twoFactorCode: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}
