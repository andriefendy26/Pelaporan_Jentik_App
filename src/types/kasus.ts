export interface Kasus {
  id: number;
  id_user: number;
  id_kelurahan: number;
  id_rt: number;
  nama_penderita: string;
  nik: string | null;
  jenis_kelamin: 'L' | 'P' | null;
  usia: number | null;
  alamat: string | null;
  no_telepon: string | null;
  tanggal_penderita: string;
  kelurahan?: { id: number; name: string };
  rt?: { id: number; name: string };
  created_at?: string;
  updated_at?: string;
}

export interface KasusPayload {
  id_kelurahan: number;
  id_rt: number;
  nama_penderita: string;
  nik?: string;
  jenis_kelamin?: 'L' | 'P';
  usia?: number;
  alamat?: string;
  no_telepon?: string;
  tanggal_penderita: string;
}