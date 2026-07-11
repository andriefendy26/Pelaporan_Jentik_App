import { apiClient } from '../api/client';
import { FormAbjPayload } from '../types/abj';
import { KasusPayload } from '../types/kasus';

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
  logout: () => apiClient.get('/logout'),
};

export const abjService = {
  getAll: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/abj', { params }),
  create: (payload: FormAbjPayload) => apiClient.post('/abj', payload),
  getById: (id: number | string) => apiClient.get(`/abj/${id}`),
  update: (id: number | string, payload: FormAbjPayload) => apiClient.put(`/abj/${id}`, payload),
  delete: (id: number | string) => apiClient.delete(`/abj/${id}`),
};

export interface LaporanBulananStatus {
  status: 'draft' | 'submitted' | 'belum_ada_data';
  submitted_at: string | null;
}

export const laporanBulananService = {
  submit: (payload: { bulan: number; tahun: number }) =>
    apiClient.post('/laporan-bulanan/submit', payload),
  getStatus: (params: { bulan: number; tahun: number }) =>
    apiClient.get<{ status: string; submitted_at: string | null }>('/laporan-bulanan/status', { params }),
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

export const kasusService = {
  getAll: (params?: { bulan?: number; tahun?: number }) => apiClient.get('/kasus', { params }),
  create: (payload: KasusPayload) => apiClient.post('/kasus', payload),
  getById: (id: number | string) => apiClient.get(`/kasus/${id}`),
  update: (id: number | string, payload: KasusPayload) => apiClient.put(`/kasus/${id}`, payload),
  delete: (id: number | string) => apiClient.delete(`/kasus/${id}`),
};