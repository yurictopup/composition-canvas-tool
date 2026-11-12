export type GuestOrderView = {
  id: string;
  gameId: string;
  gameName: string;
  packageAmt: string;
  price: number;
  playerId: string;
  playerZone: string | null;
  status: string;
  paid: boolean;
  createdAt: string;
};
