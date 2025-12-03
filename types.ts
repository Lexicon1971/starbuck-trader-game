
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
  standardQuantity: number;
  depletionDays: number; // Track how long it has been empty
}

export type Market = Record<string, MarketItem>;

export interface CargoItem {
  quantity: number;
  averageCost: number;
}

export interface WarehouseItem {
  quantity: number;
  originalAvgCost: number;
  arrivalDay: number; // When does it arrive?
}

// Map of VenueIndex -> CommodityName -> Item
export type Warehouse = Record<number, Record<string, WarehouseItem>>;

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

export interface BankInvestment {
  id: number;
  amount: number;
  interestRate: number;
  daysRemaining: number; // 1 to 3
  maturityValue: number;
}

export interface Contract {
  id: number;
  firm: string;
  commodity: string;
  quantity: number;
  destinationIndex: number;
  reward: number;
  daysRemaining: number;
  penalty: number;
}

export interface LogEntry {
  id: number;
  message: string; // May contain (C) marker for coin
  type: 'info' | 'buy' | 'sell' | 'danger' | 'jump' | 'repair' | 'contract' | 'mining' | 'investment' | 'profit' | 'maintenance' | 'phase' | 'critical' | 'breach' | 'debt';
}

export interface DailyReport {
  events: string[];
  quirkyMessage?: { text: string, theme: string }; 
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

export interface EquipmentItem {
  id: string;
  name: string;
  type: 'laser' | 'defense' | 'utility' | 'scanner';
  level: number; // 1, 2, 3
  cost: number;
  description: string;
  owned: boolean;
  canBeDamaged?: boolean;
}

export interface GameState {
  day: number;
  cash: number;
  currentVenueIndex: number;
  cargo: Record<string, CargoItem>;
  warehouse: Warehouse;
  cargoWeight: number;
  cargoCapacity: number;
  markets: Market[];
  shipHealth: number;
  laserHealth: number;
  
  // Equipment
  equipment: Record<string, boolean>; // map of EquipmentID -> owned
  
  activeLoans: ActiveLoan[];
  investments: BankInvestment[];
  loanOffers: LoanOffer[];
  activeContracts: Contract[];
  availableContracts: Contract[];
  loanTakenToday: boolean;
  
  venueTradeBans: Record<number, number>; // VenueIndex -> DaysRemaining banned

  messages: LogEntry[];
  stats: Stats;
  gameOver: boolean;
  gamePhase: 1 | 2 | 3 | 4;
  highScores: HighScore[];
  
  tutorialActive: boolean;
  tutorialFlags: Record<string, boolean>; // Tracks which features have been explained
  
  dailyTransactions: Record<string, number>; // Key: VenueIdx_CommodityName -> Count
  
  fomoDailyUse: { mesh: boolean, stims: boolean }; // Track daily fabrication
}

export interface Encounter {
  type: 'pirate' | 'accident' | 'derelict' | 'fuel_leak' | 'police' | 'mutiny' | 'tax' | 'structural';
  title: string;
  description: string;
  riskDamage: number;
  demandAmount?: number; // For pirates/police
  itemLoss?: string; // For accidents/confiscations
  capacityLoss?: number; // For structural
}
