# Dokumentasi REST API

Dokumentasi ini dibuat berdasarkan `api.php`, Controller, dan Model yang tersedia. Digunakan sebagai acuan untuk implementasi di mobile apps.

## Base URL
```
https://<domain-anda>/api
```

## Autentikasi
API ini menggunakan **Laravel Sanctum** (token-based, Bearer Token).

Setelah login, sertakan token pada setiap request ke endpoint yang membutuhkan autentikasi:
```
Authorization: Bearer {token}
Accept: application/json
```

## Format Response Umum
Hampir semua endpoint mengembalikan bentuk:
```json
{
  "success": true,
  "message": "...",
  "data": { }
}
```

---

## 1. Auth

### 1.1 Login
`POST /login`
**Auth:** Tidak perlu token

**Body (form-data / x-www-form-urlencoded / json):**
| Field | Tipe | Wajib |
|---|---|---|
| username | string | Ya |
| password | string | Ya |

**Response 200 - Sukses:**
```json
{
  "success": true,
  "message": "Login berhasil",
  "token": "1|xxxxxxxxxxxxxxxxxxxx",
  "user": {
    "id": 1,
    "name": "...",
    "username": "...",
    "email": "...",
    "id_kelurahan": 1,
    "id_rt": 1
  }
}
```

**Response 401 - Gagal:**
```json
{
  "success": false,
  "message": "Login gagal, username atau password salah"
}
```

> Catatan: gunakan `token` yang diterima sebagai Bearer Token untuk semua request selanjutnya.

---

### 1.2 Logout
`GET /logout`
**Auth:** Bearer Token wajib

**Response 200:**
```json
{
  "success": true,
  "message": "Logout berhasil"
}
```

> Catatan: endpoint ini menghapus semua token milik user (`$user->tokens()->delete()`), jadi semua sesi/perangkat akan ter-logout.

---

## 2. ABJ (Angka Bebas Jentik) — Form Pemeriksaan

### 2.1 List Data ABJ
`GET /abj`
**Auth:** Bearer Token wajib

**Response 200:**
```json
{
  "success": true,
  "message": "Data berhasil diambil",
  "data": [
    {
      "id": 1,
      "id_user": 1,
      "id_kelurahan": 1,
      "id_rt": 1,
      "tanggal_pemeriksaan": "2026-07-01",
      "created_at": "...",
      "updated_at": "...",
      "items_a_b_j": [
        {
          "id": 1,
          "id_form_abj": 1,
          "nama_kepala_keluarga": "Budi",
          "penampungan_berjentik": "2",
          "penampungan_tidak_berjentik": "5",
          "created_at": "...",
          "updated_at": "..."
        }
      ]
    }
  ]
}
```
> Jika data kosong, `data` akan berupa array `[]` dengan pesan `"Data tidak ditemukan"`.
> Diurutkan terbaru dulu (`latest()`).
> Catatan penamaan: nama relasi `ItemsABJ` pada model, tapi saat di-serialize ke JSON oleh Laravel biasanya menjadi snake_case (`items_a_b_j`). Sebaiknya cek langsung response asli di server Anda karena penamaan auto-camel/snake Eloquent untuk singkatan bisa tidak konsisten.

### 2.2 Detail Data ABJ
`GET /abj/{id}`
**Auth:** Bearer Token wajib

**Path Parameter:**
| Param | Tipe | Keterangan |
|---|---|---|
| id | integer | ID form_abj |

**Response 200:** sama seperti struktur 1 item pada list di atas.
**Response 404:** jika id tidak ditemukan (`findOrFail`), Laravel akan mengembalikan response error standar 404.

### 2.3 Simpan Data ABJ (Input Pemeriksaan Jentik)
`POST /abj`
**Auth:** Bearer Token wajib

**Body (JSON):**
| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| id_kelurahan | integer | Ya | harus ada di tabel `kelurahan` |
| id_rt | integer | Ya | harus ada di tabel `rt` |
| tanggal_pemeriksaan | date (YYYY-MM-DD) | Ya | |
| ItemsABJ | array of object | Tidak | daftar rumah yang diperiksa (lihat di bawah) |
| ItemABJ | array of object | Tidak | alias/alternatif nama field, dipakai jika `ItemsABJ` tidak dikirim |

**Struktur setiap item pada `ItemsABJ` / `ItemABJ`:**
| Field | Tipe | Wajib |
|---|---|---|
| nama_kepala_keluarga | string | Tidak |
| penampungan_berjentik | string | Tidak |
| penampungan_tidak_berjentik | string | Tidak |

> `id_user` otomatis diambil dari user yang sedang login (token), tidak perlu dikirim dari mobile app.
> Jika kedua field `ItemsABJ` dan `ItemABJ` dikirim, hanya `ItemsABJ` yang dipakai (prioritas).

**Contoh Body:**
```json
{
  "id_kelurahan": 1,
  "id_rt": 3,
  "tanggal_pemeriksaan": "2026-07-10",
  "ItemsABJ": [
    {
      "nama_kepala_keluarga": "Budi",
      "penampungan_berjentik": "1",
      "penampungan_tidak_berjentik": "4"
    },
    {
      "nama_kepala_keluarga": "Siti",
      "penampungan_berjentik": "0",
      "penampungan_tidak_berjentik": "3"
    }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Data ABJ berhasil disimpan",
  "data": {
    "form": {
      "id": 10,
      "id_user": 1,
      "id_kelurahan": 1,
      "id_rt": 3,
      "tanggal_pemeriksaan": "2026-07-10",
      "items_a_b_j": [ /* item yang baru dibuat */ ]
    },
    "items": [ /* item yang baru dibuat, sama seperti di atas */ ]
  }
}
```

**Response 422:** validasi gagal (format standar Laravel: `{ "message": "...", "errors": { field: [..] } }`)

---

## 3. Laporan Bulanan

### 3.1 List Laporan Bulanan
`GET /laporan`
**Auth:** Bearer Token wajib

**Query Parameters (opsional, untuk filter):**
| Param | Tipe | Keterangan |
|---|---|---|
| bulan | integer | filter bulan |
| tahun | integer | filter tahun |
| id_kelurahan | integer | filter kelurahan |
| id_rt | integer | filter RT |

Hasil diurutkan `tahun` dan `bulan` terbaru dulu (descending).

**Response 200:**
```json
{
  "success": true,
  "message": "Data berhasil di ambil",
  "data": [
    [
      {
        "id": 1,
        "id_kelurahan": 1,
        "id_rt": 1,
        "bulan": 7,
        "tahun": 2026,
        "kelurahan": { "id": 1, "name": "..." },
        "r_t": { "id": 1, "name": "..." },
        "user": { "id": 1, "name": "..." }
      }
    ]
  ]
}
```
> ⚠️ Catatan penting: pada implementasi saat ini, `data` adalah **array yang membungkus array laporan** (`[$laporan]`), bukan langsung array laporan. Jadi di mobile app, list laporan sebenarnya ada di `data[0]`, bukan `data` langsung. Ini kemungkinan bug kecil di backend — sebaiknya dikonfirmasi/diperbaiki agar `data` langsung berisi array laporan, supaya lebih mudah dikonsumsi mobile app.

### 3.2 Detail Laporan Bulanan
`GET /laporan/{laporan}`
**Auth:** Bearer Token wajib

**Path Parameter:**
| Param | Tipe |
|---|---|
| laporan | integer (ID) |

**Response 200:**
```json
{
  "success": true,
  "message": "Data berhasil di ambil",
  "data": {
    "id": 1,
    "id_kelurahan": 1,
    "id_rt": 1,
    "bulan": 7,
    "tahun": 2026,
    "kelurahan": { },
    "r_t": { },
    "user": { }
  }
}
```

---

## 4. Dashboard

Semua endpoint di bawah ini mendukung query `bulan` (default: bulan sekarang) dan `tahun` (default: tahun sekarang), kecuali disebutkan lain.

### 4.1 Summary Dashboard
`GET /dashboard/summary`
**Auth:** Bearer Token wajib

**Query:** `bulan`, `tahun` (opsional)

**Response 200:**
```json
{
  "success": true,
  "message": "Dashboard berhasil diambil",
  "data": {
    "meta": { "bulan": 7, "tahun": 2026 },
    "rumah_diperiksa_per_bulan": {
      "labels": ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"],
      "datasets": [
        { "label": "Rumah Diperiksa (2026)", "data": [0,0,0,0,0,0,120,0,0,0,0,0], "backgroundColor": "#3b82f6" }
      ]
    },
    "abj_per_bulan": {
      "labels": ["Jan","Feb", "..."],
      "datasets": [
        { "label": "ABJ % (2026)", "data": [0,0,"...",95.5], "borderColor": "#10b981", "backgroundColor": "rgba(16, 185, 129, 0.15)", "fill": true }
      ]
    },
    "abj_per_kelurahan": [ /* lihat struktur di 4.4 */ ],
    "abj_per_rt": [ /* lihat struktur di 4.5 */ ]
  }
}
```

### 4.2 Rumah Diperiksa per Bulan
`GET /dashboard/rumah-diperiksa-per-bulan`
**Query:** `tahun` (opsional, default tahun sekarang)

**Response 200:**
```json
{
  "success": true,
  "message": "Data rumah diperiksa per bulan berhasil diambil",
  "data": {
    "labels": ["Jan","Feb","...","Des"],
    "datasets": [
      { "label": "Rumah Diperiksa (2026)", "data": [0,0,"...",0], "backgroundColor": "#3b82f6" }
    ]
  }
}
```

### 4.3 ABJ per Bulan
`GET /dashboard/abj-per-bulan`
**Query:** `tahun` (opsional)

**Response 200:**
```json
{
  "success": true,
  "message": "Data ABJ per bulan berhasil diambil",
  "data": {
    "labels": ["Jan","Feb","...","Des"],
    "datasets": [
      { "label": "ABJ % (2026)", "data": [0,0,"...",0], "borderColor": "#10b981", "backgroundColor": "rgba(16, 185, 129, 0.15)", "fill": true }
    ]
  }
}
```

### 4.4 ABJ per Kelurahan
`GET /dashboard/abj-per-kelurahan`
**Query:** `bulan`, `tahun` (opsional)

**Response 200:**
```json
{
  "success": true,
  "message": "Data ABJ per kelurahan berhasil diambil",
  "data": [
    { "id_kelurahan": 1, "nama_kelurahan": "...", "..." : "..." }
  ]
}
```
> Struktur detail tiap item di array ini ditentukan oleh `AbjAggregationService::abjPerKelurahan()`, yang belum termasuk pada file yang Anda berikan. Mohon sertakan file service tersebut agar dokumentasi field-nya bisa dibuat presisi. Sementara ini pastikan mobile app membaca field secara dinamis / cek response asli dari server.

### 4.5 ABJ per RT
`GET /dashboard/abj-per-rt`
**Query:** `bulan`, `tahun` (opsional), `id_kelurahan` (opsional, untuk filter RT dalam 1 kelurahan)

**Response 200:**
```json
{
  "success": true,
  "message": "Data ABJ per RT berhasil diambil",
  "data": [
    { "id_rt": 1, "nama_rt": "...", "...": "..." }
  ]
}
```
> Sama seperti 4.4, struktur field detail tergantung `AbjAggregationService::abjPerRt()`.

---

## 5. Analisa

### 5.1 Analisa Laporan
`GET /analisa/laporan`
**Auth:** Bearer Token wajib
**Query:** `bulan`, `tahun` (opsional)

**Response 200:**
```json
{
  "success": true,
  "message": "Analisa laporan berhasil diambil",
  "data": {
    "meta": { "bulan": 7, "tahun": 2026 },
    "kelengkapan_laporan": { },
    "ketepatan_waktu_pelaporan": { }
  }
}
```
> Struktur `kelengkapan_laporan` dan `ketepatan_waktu_pelaporan` berasal dari `AbjAggregationService::kelengkapanLaporan()` dan `ketepatanWaktuPelaporan()` — belum tersedia di file yang diberikan, jadi field-nya belum bisa didokumentasikan secara pasti.

---

## 6. Rekap Laporan

### 6.1 Rekap Hasil Pemeriksaan Jentik
`GET /rekap/laporan-hasil-pemeriksaan-jentik`
**Auth:** Bearer Token wajib
**Query:** `bulan`, `tahun` (opsional)

**Response 200:**
```json
{
  "success": true,
  "message": "Rekap hasil pemeriksaan jentik berhasil diambil",
  "data": [ /* struktur sama dengan abjPerKelurahan, lihat 4.4 */ ]
}
```

### 6.2 Export Rekap Hasil Pemeriksaan Jentik (Excel)
`GET /rekap/laporan-hasil-pemeriksaan-jentik/export`
**Auth:** Bearer Token wajib
**Query:** `bulan`, `tahun` (opsional)

**Response:** File `.xlsx` (binary), nama file: `laporan-hasil-pemeriksaan-jentik-{tahun}-{bulan}.xlsx`
> Untuk mobile app, request ini perlu ditangani sebagai **file download** (bukan JSON), simpan response body sebagai file biner dengan Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### 6.3 Rekap Pendataan per RT
`GET /rekap/pendataan-per-rt`
**Auth:** Bearer Token wajib
**Query:** `bulan`, `tahun` (opsional), `id_kelurahan` (opsional)

**Response 200:**
```json
{
  "success": true,
  "message": "Rekap pendataan per RT berhasil diambil",
  "data": [ /* struktur sama dengan abjPerRt, lihat 4.5 */ ]
}
```

### 6.4 Export Rekap Pendataan per RT (Excel)
`GET /rekap/pendataan-per-rt/export`
**Auth:** Bearer Token wajib
**Query:** `bulan`, `tahun` (opsional)

**Response:** File `.xlsx` (binary), nama file: `rekap-pendataan-per-rt-{tahun}-{bulan}.xlsx`

---

## 7. Ringkasan Endpoint

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/login` | ❌ | Login, dapatkan token |
| GET | `/logout` | ✅ | Logout, hapus semua token |
| GET | `/abj` | ✅ | List form ABJ |
| POST | `/abj` | ✅ | Simpan form ABJ + item |
| GET | `/abj/{id}` | ✅ | Detail form ABJ |
| GET | `/laporan` | ✅ | List laporan bulanan (filter bulan/tahun/kelurahan/rt) |
| GET | `/laporan/{laporan}` | ✅ | Detail laporan bulanan |
| GET | `/dashboard/summary` | ✅ | Semua data dashboard sekaligus |
| GET | `/dashboard/rumah-diperiksa-per-bulan` | ✅ | Grafik rumah diperiksa per bulan |
| GET | `/dashboard/abj-per-bulan` | ✅ | Grafik ABJ % per bulan |
| GET | `/dashboard/abj-per-kelurahan` | ✅ | ABJ per kelurahan |
| GET | `/dashboard/abj-per-rt` | ✅ | ABJ per RT |
| GET | `/analisa/laporan` | ✅ | Kelengkapan & ketepatan waktu laporan |
| GET | `/rekap/laporan-hasil-pemeriksaan-jentik` | ✅ | Data rekap pemeriksaan jentik (JSON) |
| GET | `/rekap/laporan-hasil-pemeriksaan-jentik/export` | ✅ | Export Excel |
| GET | `/rekap/pendataan-per-rt` | ✅ | Data rekap pendataan per RT (JSON) |
| GET | `/rekap/pendataan-per-rt/export` | ✅ | Export Excel |

---

## Catatan untuk Tim Mobile

1. **Header wajib untuk semua request setelah login:**
   ```
   Authorization: Bearer {token}
   Accept: application/json
   ```
2. **Endpoint `/laporan`** saat ini membungkus data laporan dalam array tambahan (`data[0]` berisi list, bukan `data` langsung) — perlu disesuaikan penanganannya di mobile app atau diminta diperbaiki di backend.
3. Beberapa endpoint (`abj-per-kelurahan`, `abj-per-rt`, `analisa/laporan`, endpoint rekap) bergantung pada `AbjAggregationService` yang belum disertakan dalam file yang diberikan — struktur field persisnya perlu dicek langsung dari response API atau dari source code service tersebut agar dokumentasi lengkap 100%.
4. Endpoint export (`/export`) mengembalikan file biner Excel, bukan JSON — tangani secara berbeda dari endpoint lain (unduh & simpan file).
5. Semua error validasi mengikuti format bawaan Laravel (HTTP 422) dan error autentikasi (HTTP 401/403) mengikuti format standar Sanctum.