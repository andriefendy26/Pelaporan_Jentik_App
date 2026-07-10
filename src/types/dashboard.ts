export interface DashboardSummary {
  tahun: number;
  total_laporan: number;
  total_rumah_diperiksa: number;
  rumah_bebas_jentik: number;
  abj_persen: number;
  total_kelurahan_tercakup: number;
}

export interface MonthlyRumah {
  bulan: number;
  total_rumah: number;
}

export interface MonthlyAbj {
  bulan: number;
  abj_persen: number;
}

export interface KelurahanAbj {
  id_kelurahan: number;
  nama_kelurahan: string;
  total_rumah: number;
  abj_persen: number;
}