import api from './api';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AbjPayload {
  id_kelurahan: number;
  id_rt: number;
  tanggal_pemeriksaan: string;
  ItemABJ?: Array<{
    nama_kepala_keluarga: string;
    penampungan_berjentik: string;
    penampungan_tidak_berjentik: string;
  }>;
  ItemsABJ?: Array<{
    nama_kepala_keluarga: string;
    penampungan_berjentik: string;
    penampungan_tidak_berjentik: string;
  }>;
}

export const authService = {
  login: (payload: LoginPayload) => {
    const params = new URLSearchParams();
    params.append('username', payload.username);
    params.append('password', payload.password);

    return api.post('http://10.0.2.2:8000/api/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      transformRequest: [(data) => data],
    });
  },
  logout: () => api.post('/logout'),
};

export const abjService = {
  getAll: () => api.get('/abj'),
  create: (payload: AbjPayload) => api.post('/abj', payload),
  getById: (id: number | string) => api.get(`/abj/${id}`),
};

export const laporanService = {
  getAll: (params?: { bulan?: number; tahun?: number; id_kelurahan?: number; id_rt?: number }) =>
    api.get('/laporan', { params }),
  getById: (laporan: number | string) => api.get(`/laporan/${laporan}`),
};

export const dashboardService = {
  getSummary: (params?: { bulan?: number; tahun?: number }) => api.get('/dashboard/summary', { params }),
  getRumahDiperiksaPerBulan: (params?: { bulan?: number; tahun?: number }) => api.get('/dashboard/rumah-diperiksa-per-bulan', { params }),
  getAbjPerBulan: (params?: { bulan?: number; tahun?: number }) => api.get('/dashboard/abj-per-bulan', { params }),
  getAbjPerKelurahan: (params?: { bulan?: number; tahun?: number }) => api.get('/dashboard/abj-per-kelurahan', { params }),
  getAbjPerRt: (params?: { bulan?: number; tahun?: number; id_kelurahan?: number }) => api.get('/dashboard/abj-per-rt', { params }),
};

export const analisaService = {
  getLaporan: (params?: { bulan?: number; tahun?: number }) => api.get('/analisa/laporan', { params }),
};

export const rekapService = {
  getLaporanHasilPemeriksaanJentik: (params?: { bulan?: number; tahun?: number }) => api.get('/rekap/laporan-hasil-pemeriksaan-jentik', { params }),
  exportLaporanHasilPemeriksaanJentik: (params?: { bulan?: number; tahun?: number }) => api.get('/rekap/laporan-hasil-pemeriksaan-jentik/export', { params, responseType: 'blob' }),
  getPendataanPerRt: (params?: { bulan?: number; tahun?: number; id_kelurahan?: number }) => api.get('/rekap/pendataan-per-rt', { params }),
  exportPendataanPerRt: (params?: { bulan?: number; tahun?: number }) => api.get('/rekap/pendataan-per-rt/export', { params, responseType: 'blob' }),
};
