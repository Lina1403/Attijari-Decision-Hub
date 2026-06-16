import { apiClient } from '@/services/api';
import type { AppUser } from '@/types';

export interface AdminUser extends AppUser {
  canDelete: boolean;
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

export const adminUserService = {
  async listUsers() {
    try {
      const response = await apiClient.get<{ users: AdminUser[] }>('/admin/users');
      return response.data.users;
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Impossible de charger les comptes.'));
    }
  },

  async deleteUser(userId: string) {
    try {
      const response = await apiClient.delete<{ message: string; user: AppUser }>(
        `/admin/users/${userId}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Impossible de supprimer le compte.'));
    }
  },
};
