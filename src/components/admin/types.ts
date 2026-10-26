export type AdminOrder = {
  id: string;
  user_email: string;
  game_name: string;
  package_amt: string;
  price_usd: number;
  player_id: string;
  player_zone: string | null;
  status: string;
  payment: string;
  created_at: string;
  supplier_order_id?: string | null;
  supplier_status?: string | null;
  payment_md5?: string | null;
  paid_at?: string | null;
};
