import { apiClient } from '../api/client';
import { FormAbjPayload } from '../types/abj';

export interface LoginPayload {
  username: string;
  password: string;
}

export const authService = {
  login: (payload: LoginPayload) => {
    const params = new URLSearchParams();
    params.append('username', payload.username);
    params.append('password', payload.password);

    return apiClient.post('/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      transformRequest: [(data) => data],
    });
  },
  logout: () => apiClient.post('/logout'),
};

export const abjService = {
  getAll: () => apiClient.get('/abj'),
  create: (payload: FormAbjPayload) => apiClient.post('/abj', payload),
  getById: (id: number | string) => apiClient.get(`/abj/${id}`),
  update: (id: number | string, payload: FormAbjPayload) => apiClient.put(`/abj/${id}`, payload),
  delete: (id: number | string) => apiClient.delete(`/abj/${id}`),
};

export const laporanService = {
  getAll: (params?: { bulan?: number; tahun?: number; id_kelurahan?: number; id_rt?: number }) =>
    apiClient.get('/laporan', { params }),
  getById: (laporan: number | string) => apiClient.get(`/laporan/${laporan}`),
};

export const dashboardService = {
  getSummary: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/dashboard/summary', { params }),
  getRumahDiperiksaPerBulan: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/dashboard/rumah-diperiksa-per-bulan', { params }),
  getAbjPerBulan: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/dashboard/abj-per-bulan', { params }),
  getAbjPerKelurahan: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/dashboard/abj-per-kelurahan', { params }),
  getAbjPerRt: (params?: { bulan?: number; tahun?: number; id_kelurahan?: number }) => apiClient.get('/dashboard/abj-per-rt', { params }),
};

export const analisaService = {
  getLaporan: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/analisa/laporan', { params }),
};

export const rekapService = {
  getLaporanHasilPemeriksaanJentik: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/rekap/laporan-hasil-pemeriksaan-jentik', { params }),
  exportLaporanHasilPemeriksaanJentik: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/rekap/laporan-hasil-pemeriksaan-jentik/export', { params, responseType: 'blob' }),
  getPendataanPerRt: (params?: { bulan?: number; tahun?: number; id_kelurahan?: number }) => apiClient.get('/rekap/pendataan-per-rt', { params }),
  exportPendataanPerRt: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/rekap/pendataan-per-rt/export', { params, responseType: 'blob' }),
};