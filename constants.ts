import { Commodity } from './types';

// Updated Initial Capacity
export const INITIAL_CARGO_CAPACITY = 500;
export const CARGO_UPGRADE_AMOUNT = 50;
export const CARGO_UPGRADE_COST = 1000;

export const TONS_UNIT = 'T';
export const CURRENCY_UNIT = '$B';
export const FUEL_NAME = 'Space Fuel';
export const NUTRI_PASTE_NAME = 'Nutri-Paste';
export const H2O_NAME = 'H2O';
export const POWER_CELL_NAME = 'Power Cell';

// Goals Phases
export const GOAL_PHASE_1_DAYS = 10;
export const GOAL_PHASE_1_AMOUNT = 1000000;

export const GOAL_PHASE_2_DAYS = 30;
export const GOAL_PHASE_2_AMOUNT = 1000000000;

export const GOAL_PHASE_3_DAYS = 50;
export const GOAL_OVERTIME_DAYS = 55;

export const REPAIR_INCREMENT = 5;
export const REPAIR_COST = 1000;
export const MAX_REPAIR_HEALTH = 150;
export const MAX_LOAN_AMOUNT = 200000; // Adjusted for new economy
export const LOAN_REPAYMENT_DAYS = 5;

export const LOAN_FIRMS = [
  { name: "Starfleet Credit Union", baseRate: 5 },
  { name: "Tyrell Corporation Finance", baseRate: 8 },
  { name: "Weyland-Yutani Trust", baseRate: 10 },
  { name: "The Great Barter Bank", baseRate: 12 },
  { name: "The Hutt Cartel Lending", baseRate: 15 },
];

export const COMMODITIES: Commodity[] = [
  { name: "Titanium Ore", icon: "metal-lump", unitWeight: 5.0, minPrice: 50, maxPrice: 250, rarity: 0.8 },
  { name: "PC Chips", icon: "💾", unitWeight: 0.01, minPrice: 20, maxPrice: 2000, rarity: 0.65 },
  { name: POWER_CELL_NAME, icon: "🔋", unitWeight: 0.1, minPrice: 50, maxPrice: 250, rarity: 0.5 },
  { name: FUEL_NAME, icon: "⛽", unitWeight: 0.20, minPrice: 10, maxPrice: 150, rarity: 0.2 },
  { name: "Synthetic Cloth", icon: "🧵", unitWeight: 0.25, minPrice: 100, maxPrice: 1000, rarity: 0.6 },
  { name: NUTRI_PASTE_NAME, icon: "🍲", unitWeight: 0.5, minPrice: 10, maxPrice: 100, rarity: 0.1 },
  { name: H2O_NAME, icon: "💧", unitWeight: 1.0, minPrice: 5, maxPrice: 50, rarity: 0.1 },
  { name: "Cybernetics", icon: "🤖", unitWeight: 1.0, minPrice: 250, maxPrice: 2500, rarity: 0.9 },
  { name: "Medical Kits", icon: "🩹", unitWeight: 0.01, minPrice: 400, maxPrice: 4000, rarity: 0.7 },
  { name: "Stim-Packs", icon: "💉", unitWeight: 0.25, minPrice: 500, maxPrice: 5000, rarity: 0.85 },
  { name: "Antimatter Rod", icon: "✨", unitWeight: 0.5, minPrice: 2500, maxPrice: 15000, rarity: 0.95 },
  { name: "Dark Matter", icon: "🌌", unitWeight: 0.75, minPrice: 5000, maxPrice: 50000, rarity: 0.98 },
];

export const VENUES = [
  "Deep Space Nine", "Trantor Prime", "Serenity Valley", "Corellia (Shipyards)", 
  "High Charity", "Giedi Prime", "New Babylon", "Acheron LV-426", "Cantina Mos Eisley", "Centauri Prime"
];

export const BASE_DISTANCE_MATRIX = [
  [0, 5, 12, 1, 8, 4, 10, 3, 7, 9],
  [5, 0, 6, 8, 3, 11, 2, 9, 1, 7],
  [12, 6, 0, 10, 7, 3, 9, 1, 5, 4],
  [1, 8, 10, 0, 9, 6, 1, 11, 4, 3],
  [8, 3, 7, 9, 0, 5, 4, 2, 12, 1],
  [4, 11, 3, 6, 5, 0, 8, 7, 2, 10],
  [10, 2, 9, 1, 4, 8, 0, 6, 3, 5],
  [3, 9, 1, 11, 2, 7, 6, 0, 10, 8],
  [7, 1, 5, 4, 12, 2, 3, 10, 0, 6],
  [9, 7, 4, 3, 1, 10, 5, 8, 6, 0],
];