export type CommodityId = string;

export interface Commodity {
  name: string;
  icon: string;
  unitWeight: number;
  minPrice: number;
  maxPrice: number;
  rarity: number;
}

export interface MarketItem {
  price: number;
  quantity: number;
  standardQuantity: number; // Used for price calculation
}

export type Market = Record<string, MarketItem>;

export interface LoanOffer {
  firmName: string;
  amount: number;
  interestRate: number;
}

export interface ActiveLoan {
  id: number;
  firmName: string;
  principal: number;
  currentDebt: number;
  interestRate: number;
  daysRemaining: number;
  originalDay: number;
}

export interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'buy' | 'sell' | 'danger' | 'jump' | 'repair';
}

export interface DailyReport {
  events: string[];
  totalHullDamage: number;
  totalLaserDamage: number;
  fuelUsed: number;
  lostItems: Record<string, number>;
  gainedItems: Record<string, number>;
  insuranceBought: boolean;
}

export interface Stats {
  largestSingleWin: number;
  largestSingleLoss: number;
}

export interface HighScore {
  name: string;
  score: number;
  date: string;
}

export interface GameState {
  day: number;
  cash: number;
  currentVenueIndex: number;
  cargo: Record<string, number>;
  cargoWeight: number;
  cargoCapacity: number; // Dynamic
  markets: Market[];
  shipHealth: number;
  laserHealth: number;
  activeLoans: ActiveLoan[];
  loanOffers: LoanOffer[];
  loanTakenToday: boolean;
  messages: LogEntry[];
  stats: Stats;
  gameOver: boolean;
  gamePhase: 1 | 2 | 3 | 4; // 1: <10 days, 2: <30 days, 3: <50 days, 4: Overtime
  highScores: HighScore[];
}