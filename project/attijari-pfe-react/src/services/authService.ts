import { apiClient } from '@/services/api';
import type {
  AccessSpace,
  AppUser,
  AuthTokens,
  UserNotification,
  UserPreferences,
} from '@/types';

export interface AuthResponse {
  user: AppUser;
  accessToken: string;
  refreshToken: string;
}

export interface ProfileUpdatePayload {
  firstName: string;
  lastName: string;
  email: string;
  entity: string;
}

export interface NotificationsResponse {
  notifications: UserNotification[];
  unreadCount: number;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    const message = axiosError.response?.data?.message;
    if (message) return message;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export const authService = {
  async login(email: string, password: string, space?: AccessSpace): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', { email, password, space });
      return res.data;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, 'Connexion impossible. Verifiez vos identifiants.'),
      );
    }
  },

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/register', {
        email,
        password,
        firstName,
        lastName,
      });
      return res.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Création du compte impossible.'));
    }
  },

  async logout(refreshToken: string | null): Promise<void> {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Always succeed client-side
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const res = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
    return res.data;
  },

  async getMe(): Promise<AppUser> {
    const res = await apiClient.get<{ user: AppUser }>('/auth/me');
    return res.data.user;
  },

  async getProfile(): Promise<AppUser> {
    const res = await apiClient.get<{ user: AppUser }>('/auth/profile');
    return res.data.user;
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<AuthResponse & { message: string }> {
    try {
      const res = await apiClient.put<AuthResponse & { message: string }>('/auth/profile', payload);
      return res.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Impossible de mettre à jour le profil.'));
    }
  },

  async getPreferences(): Promise<UserPreferences> {
    const res = await apiClient.get<{ preferences: UserPreferences }>('/auth/preferences');
    return res.data.preferences;
  },

  async updatePreferences(
    payload: UserPreferences,
  ): Promise<{ preferences: UserPreferences; message: string }> {
    try {
      const res = await apiClient.put<{ preferences: UserPreferences; message: string }>(
        '/auth/preferences',
        payload,
      );
      return res.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Impossible de mettre à jour les préférences.'));
    }
  },

  async getNotifications(): Promise<NotificationsResponse> {
    const res = await apiClient.get<NotificationsResponse>('/auth/notifications');
    return res.data;
  },

  async markNotificationsRead(payload: {
    ids?: string[];
    all?: boolean;
  }): Promise<NotificationsResponse> {
    try {
      const res = await apiClient.post<NotificationsResponse>('/auth/notifications/read', payload);
      return res.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Impossible de mettre à jour les notifications.'));
    }
  },

  async clearReadNotifications(): Promise<NotificationsResponse> {
    try {
      const res = await apiClient.delete<NotificationsResponse>('/auth/notifications/read');
      return res.data;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, 'Impossible de supprimer les notifications lues.'),
      );
    }
  },

  async changePassword(
    payload: ChangePasswordPayload,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    try {
      const res = await apiClient.post<{
        message: string;
        accessToken: string;
        refreshToken: string;
      }>('/auth/change-password', payload);
      return res.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Impossible de changer le mot de passe.'));
    }
  },

  async requestPasswordReset(email: string): Promise<{
    message: string;
    deliveryMode: string;
    delivered: boolean;
    credentialsPreview?: {
      email: string;
      temporaryPassword: string;
    };
  }> {
    try {
      const res = await apiClient.post<{
        message: string;
        deliveryMode: string;
        delivered: boolean;
        credentialsPreview?: {
          email: string;
          temporaryPassword: string;
        };
      }>('/auth/forgot-password', { email });
      return res.data;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, 'Impossible de reinitialiser le mot de passe.'),
      );
    }
  },
};
