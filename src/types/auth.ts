export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  id_kelurahan: number | null;
  id_rt: number | null;
  [key: string]: any;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}