// Bakong KHQR payload (EMVCo merchant-presented QR, individual account).
// Tags follow the NBC KHQR spec as implemented by the bakong-khqr SDK.

function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC-16/CCITT-FALSE over the UTF-8 bytes, as KHQR tag 63 expects. */
export function crc16(data: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(data)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function formatKhqrAmount(amount: number): string {
  return amount.toFixed(2).replace(/\.?0+$/, "");
}

export type KhqrInput = {
  accountId: string;
  merchantName: string;
  merchantCity?: string;
  amount: number;
  currency: "USD" | "KHR";
  billNumber?: string;
  createdAt: number;
  expiresAt: number;
};

export function buildKhqr(input: KhqrInput): string {
  if (!input.accountId || input.accountId.length > 32)
    throw new Error("Invalid Bakong account ID.");
  if (!(input.amount > 0)) throw new Error("KHQR amount must be above zero.");
  const merchantName = input.merchantName.slice(0, 25);
  const merchantCity = (input.merchantCity ?? "Phnom Penh").slice(0, 15);

  let qr = tlv("00", "01");
  qr += tlv("01", "12"); // dynamic: carries an amount
  qr += tlv("29", tlv("00", input.accountId));
  qr += tlv("52", "5999");
  qr += tlv("53", input.currency === "USD" ? "840" : "116");
  qr += tlv("54", formatKhqrAmount(input.amount));
  qr += tlv("58", "KH");
  qr += tlv("59", merchantName);
  qr += tlv("60", merchantCity);
  if (input.billNumber) qr += tlv("62", tlv("01", input.billNumber.slice(0, 25)));
  qr += tlv("99", tlv("00", String(input.createdAt)) + tlv("01", String(input.expiresAt)));
  qr += "6304";
  return qr + crc16(qr);
}
