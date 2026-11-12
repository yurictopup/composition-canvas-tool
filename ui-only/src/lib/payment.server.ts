export type PaymentState = {
  available: boolean;
  qr?: string;
  appLink?: string;
  amount?: number;
  expiresAt?: string;
  paid: boolean;
  status?: string;
  message?: string;
  codes?: string[];
};
