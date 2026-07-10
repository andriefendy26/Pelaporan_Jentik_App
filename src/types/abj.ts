export interface ItemAbj {
  id?: number;
  id_form_abj?: number;
  nama_kepala_keluarga: string;
  penampungan_berjentik: string;
  penampungan_tidak_berjentik: string;
}

export interface FormAbj {
  id: number;
  id_user: number;
  id_kelurahan: number;
  id_rt: number;
  tanggal_pemeriksaan: string;
  created_at?: string;
  updated_at?: string;
  items_abj?: ItemAbj[];
}

export interface FormAbjPayload {
  id_kelurahan: number;
  id_rt: number;
  tanggal_pemeriksaan: string;
  ItemsABJ: ItemAbj[];
}