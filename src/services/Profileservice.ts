import { apiClient } from '../api/client';

export interface UpdateProfilePayload {
  name: string;
  email: string;
  username: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export const profileService = {
  getProfile: () => apiClient.get('/profile'),
  updateProfile: (payload: UpdateProfilePayload) => apiClient.put('/profile', payload),
  changePassword: (payload: ChangePasswordPayload) => apiClient.put('/profile/password', payload),
  deleteAccount: () => apiClient.delete('/profile'),
};