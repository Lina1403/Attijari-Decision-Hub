import { apiClient } from '@/services/api';
import type { AccessRequest, AccessRequestEmailDelivery } from '@/types';

export interface CreateAccessRequestPayload {
  fullName: string;
  email: string;
  requestedRole: 'MARKETING' | 'COMMERCIAL';
  message?: string;
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

export const accessRequestService = {
  async createRequest(payload: CreateAccessRequestPayload) {
    try {
      const response = await apiClient.post<{
        message: string;
        request: AccessRequest;
      }>('/access-requests', payload);
      return response.data;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Impossible d'envoyer la demande d'acces."),
      );
    }
  },

  async listRequests() {
    try {
      const response = await apiClient.get<{ requests: AccessRequest[] }>('/admin/access-requests');
      return response.data.requests;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Impossible de charger les demandes d'acces."),
      );
    }
  },

  async approveRequest(requestId: string) {
    try {
      const response = await apiClient.patch<{
        message: string;
        request: AccessRequest;
        emailDelivery: AccessRequestEmailDelivery;
      }>(`/admin/access-requests/${requestId}/approve`);
      return response.data;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Impossible d'approuver la demande d'acces."),
      );
    }
  },

  async rejectRequest(requestId: string, reviewComment = '') {
    try {
      const response = await apiClient.patch<{
        message: string;
        request: AccessRequest;
      }>(`/admin/access-requests/${requestId}/reject`, { reviewComment });
      return response.data;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Impossible de refuser la demande d'acces."),
      );
    }
  },
};
