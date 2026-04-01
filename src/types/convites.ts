
export interface Convite {
  id: string;
  email: string;
  token: string;
  usado: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConviteInsert {
  email: string;
  token: string;
  expires_at: string;
}

export interface ConviteUpdate {
  usado?: boolean;
}
