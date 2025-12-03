
import React, { useState, useEffect, useRef } from 'react';
import { 
  COMMODITIES, VENUES, BASE_DISTANCE_MATRIX, LOAN_FIRMS, SHOP_ITEMS, CONTRACT_FIRMS,
  INITIAL_CARGO_CAPACITY, BASE_MAX_CARGO_CAPACITY, CARGO_UPGRADE_AMOUNT, CARGO_UPGRADE_COST,
  TONS_UNIT, CURRENCY_UNIT, COIN_MARKER, FUEL_NAME, NUTRI_PASTE_NAME, H2O_NAME, POWER_CELL_NAME, MESH_NAME,
  GOAL_PHASE_1_DAYS, GOAL_PHASE_1_AMOUNT, GOAL_PHASE_2_DAYS, GOAL_PHASE_2_AMOUNT,
  CONTRACT_LIMIT_P1, CONTRACT_LIMIT_P2, CONTRACT_LIMIT_P3, TRADE_BAN_DURATION,
  REPAIR_COST, REPAIR_INCREMENT, MAX_REPAIR_HEALTH, LOAN_REPAYMENT_DAYS, LASER_REPAIR_COST, QUIRKY_MESSAGES_DB, TUTORIAL_QUOTES
} from './constants';
import { GameState, Market, LoanOffer, LogEntry, DailyReport, Commodity, HighScore, CargoItem, EquipmentItem, Encounter, ActiveLoan, Contract, WarehouseItem } from './types';
import { Building2, Rocket, XCircle, Trophy, Zap, Truck, Shield, Wrench, Fuel, Crosshair, Heart, Swords, Skull, Box, AlertTriangle, Radar, ClipboardList, Radio, HelpCircle, Warehouse as WarehouseIcon, RefreshCw, Factory, Map as MapIcon, BarChart3, PowerOff, Droplets, Pill } from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

let db: any = null;
try {
  if (firebaseConfig.projectId !== "PROJECT_ID") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (e) {
  console.log("Firebase fallback.");
}

// --- Utils ---

const formatCurrencyLog = (amount: number) => {
  return `${COIN_MARKER} ${formatCompactNumber(amount)}`;
};

const formatCompactNumber = (num: number, useMForMillions: boolean = false) => {
    if (Math.abs(num) >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + (useMForMillions ? 'M' : 'M');
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
};

const getFuelCost = (from: number, to: number) => {
  return BASE_DISTANCE_MATRIX[from][to] * 2;
};

const getCargoValue = (cargo: Record<string, CargoItem>) => {
  return Object.values(cargo).reduce((sum, item) => sum + item.quantity * item.averageCost, 0);
};

const getLogColorClass = (type: LogEntry['type']) => {
    switch (type) {
        case 'critical':
        case 'breach':
        case 'debt':
        case 'danger': return 'text-red-400';
        case 'mining': return 'text-cyan-400';
        case 'investment':
        case 'profit': return 'text-green-400';
        case 'maintenance': return 'text-orange-400';
        case 'contract':
        case 'buy': return 'text-blue-400';
        case 'phase': return 'text-purple-400';
        case 'jump': return 'text-yellow-400';
        case 'repair': return 'text-lime-400';
        case 'sell': return 'text-green-400';
        default: return 'text-gray-400';
    }
};

const getReportEventColorClass = (e: string) => {
    if (e.includes('WARNING') || e.includes('CRITICAL') || e.includes('DEFAULT') || e.includes('BREACH') || e.includes('LOSS') || e.includes('TRAP')) return 'text-red-400 font-bold';
    if (e.includes('MINING') || e.includes('FABRICATION')) return 'text-cyan-400';
    if (e.includes('INVESTMENT') || e.includes('PROFIT') || e.includes('SALVAGE')) return 'text-green-400';
    if (e.includes('CONTRACT')) return 'text-blue-400';
    if (e.includes('PHASE')) return 'text-purple-400 font-bold';
    if (e.includes('MAINTENANCE')) return 'text-orange-400';
    return 'text-gray-300';
};

// --- Components ---

const StarCoin = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mb-0.5 mx-0.5">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
    <text x="12" y="17.5" fontSize="13" fontWeight="900" textAnchor="middle" fill="#000" fontFamily="sans-serif">B</text>
  </svg>
);

const PriceDisplay = ({ value, colored = false, size, compact = false }: { value: number, colored?: boolean, size?: string, compact?: boolean }) => (
  <span className={`font-mono font-bold whitespace-nowrap inline-flex items-center ${size || ''} ${colored ? (value >= 0 ? 'text-green-400' : 'text-red-400') : ''}`}>
    <StarCoin size={size && size.includes('text-xs') ? 14 : (size && size.includes('text-sm') ? 16 : 20)} /> {compact ? formatCompactNumber(Math.round(Math.abs(value))) : Math.round(Math.abs(value)).toLocaleString()} {value < 0 ? '(DR)' : ''}
  </span>
);

const renderLogMessage = (msg: string) => {
    const parts = msg.split(COIN_MARKER);
    if (parts.length === 1) return msg;
    return (
        <span>
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && <StarCoin size={14} />}
                </React.Fragment>
            ))}
        </span>
    );
};

const StatusDial = ({ value, max, icon: Icon, color, label, isPercent }: { value: number, max: number, icon: any, color: string, label: string, isPercent?: boolean }) => {
  const size = 80; 
  const center = size / 2;
  const radius = 32; 
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(value, max) / max) * circumference;
  const strokeColor = color.includes('red') ? '#ef4444' : color.includes('green') ? '#10b981' : '#3b82f6';

  return (
    <div className="flex flex-col items-center mx-3 relative">
      <div className="relative w-20 h-20 flex items-center justify-center">
         <svg className="w-full h-full transform -rotate-90">
            <circle cx={center} cy={center} r={radius} stroke="#374151" strokeWidth="1" fill="none" />
            <circle cx={center} cy={center} r={normalizedRadius - stroke} stroke="#374151" strokeWidth="1" fill="none" />
            <circle cx={center} cy={center} r={normalizedRadius} stroke="#1f2937" strokeWidth={stroke} fill="none" />
            <circle 
              cx={center} cy={center} r={normalizedRadius} 
              stroke={strokeColor} strokeWidth={stroke} 
              fill="none" 
              strokeDasharray={circumference + ' ' + circumference} 
              style={{ strokeDashoffset }} 
              strokeLinecap="round" 
            />
         </svg>
         <Icon size={20} className={`absolute ${color}`} />
      </div>
      <div className={`text-base font-bold mt-1 ${color}`}>{value}{isPercent?'%':''}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label !== '%' ? label : ''}</div>
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, string>>({});
  const [sellQuantities, setSellQuantities] = useState<Record<string, string>>({});
  const [shippingQuantities, setShippingQuantities] = useState<Record<string, string>>({});
  const [shippingDestinations, setShippingDestinations] = useState<Record<string, string>>({}); 
  const [shippingSource, setShippingSource] = useState<Record<string, { type: 'cargo' | 'warehouse', venueIdx: number }>>({}); // Updated source tracking
  const [logisticsTab, setLogisticsTab] = useState<'shipping' | 'contracts' | 'warehouse'>('contracts');
  const [modal, setModal] = useState<{ type: string, data: any }>({ type: 'none', data: null });
  const [highScoreName, setHighScoreName] = useState('');
  const [highlightShippingItem, setHighlightShippingItem] = useState<string | null>(null);
  const [shippingSuccessMessage, setShippingSuccessMessage] = useState<string | null>(null);
  const commsContainerRef = useRef<HTMLDivElement>(null);
  const [cargoUpgradeQty, setCargoUpgradeQty] = useState<string>('1');
  const [fomoQty, setFomoQty] = useState<string>('1');
  const [fomoStimQty, setFomoStimQty] = useState<string>('1');
  const [claimQuantities, setClaimQuantities] = useState<Record<string, string>>({});

  // --- High Score Logic ---
  const loadHighScores = async () => {
    let scores: HighScore[] = [];
    if (db) {
      try {
        const q = query(collection(db, "highscores"), orderBy("score", "desc"), limit(10));
        const s = await getDocs(q);
        s.forEach((doc) => scores.push(doc.data() as HighScore));
      } catch (e) {}
    }
    if (scores.length === 0) {
      const local = localStorage.getItem('sbe_highscores');
      if (local) scores = JSON.parse(local);
    }
    // Default Arcade List if empty
    return scores.length ? scores : [
      { name: "Han S.", score: 5000000000, date: "20XX" },
      { name: "Jean-Luc", score: 2500000000, date: "2364" },
      { name: "Ellen Ripley", score: 1000000000, date: "2122" },
      { name: "Starbuck", score: 500000000, date: "2003" },
      { name: "Mal Reynolds", score: 250000000, date: "2517" },
      { name: "Korben Dallas", score: 100000000, date: "2263" },
      { name: "Dave Bowman", score: 50000000, date: "2001" },
      { name: "Sarah Connor", score: 10000000, date: "1984" },
      { name: "Rick Deckard", score: 5000000, date: "2019" },
      { name: "Arthur Dent", score: 42000, date: "1979" }
    ];
  };

  const saveHighScore = async (name: string, score: number) => {
    const newScore = { name, score, date: new Date().toLocaleDateString() };
    const current = await loadHighScores();
    const updated = [...current, newScore].sort((a,b) => b.score - a.score).slice(0, 10);
    localStorage.setItem('sbe_highscores', JSON.stringify(updated));
    if (db) await addDoc(collection(db, "highscores"), newScore);
    return updated;
  };

  const getMaxCargo = (phase: number) => {
      if (phase === 1) return BASE_MAX_CARGO_CAPACITY; // 5000
      if (phase === 2) return BASE_MAX_CARGO_CAPACITY * 10; // 50,000
      return BASE_MAX_CARGO_CAPACITY * 50; // 250,000
  };
  
  const attemptVoluntaryRestart = async () => {
      if (!state) return;
      const scores = await loadHighScores();
      const currentNetWorth = getNetWorth(state);
      const threshold = scores.length < 10 ? 0 : scores[scores.length-1].score;
      
      const isHighScore = currentNetWorth > threshold;
      
      if (isHighScore) {
          setModal({ type: 'endgame', data: { reason: "Legendary Status Achieved (Voluntary Retirement)", netWorth: currentNetWorth, stats: state.stats, isHighScore: true } });
      } else {
          // If not high score, just confirm
          if(confirm("Restart Game? (Score too low for Hall of Fame)")) {
             initGame(false);
          }
      }
  };

  const initGame = async (voluntaryRestart: boolean = false) => {
    // If voluntary restart is called here, it means we just want to reset (handled by attemptVoluntaryRestart mostly)
    
    const markets: Market[] = VENUES.map((_, idx) => generateMarket(true, idx === 0));
    const startIdx = Math.floor(Math.random() * VENUES.length);
    markets[startIdx] = generateMarket(true, true);
    
    const initialCargo: Record<string, CargoItem> = {};
    let cargoWeight = 0;
    const starters: Record<string, number> = { [NUTRI_PASTE_NAME]: 10, [H2O_NAME]: 20, [POWER_CELL_NAME]: 25, [FUEL_NAME]: 100 };
    Object.entries(starters).forEach(([name, qty]) => {
      const c = COMMODITIES.find(com => com.name === name);
      if (c) {
        cargoWeight += qty * c.unitWeight;
        initialCargo[name] = { quantity: qty, averageCost: c.minPrice };
      }
    });

    const startingCash = 20000;
    const initialLoan = { id: Date.now(), firmName: "Starfleet Credit Union", principal: 5000, currentDebt: 5000, interestRate: 5.0, daysRemaining: LOAN_REPAYMENT_DAYS, originalDay: 1 };
    
    const initialState: GameState = {
      day: 1,
      cash: startingCash,
      currentVenueIndex: startIdx,
      cargo: initialCargo,
      warehouse: {},
      cargoWeight,
      cargoCapacity: INITIAL_CARGO_CAPACITY,
      markets,
      shipHealth: 100,
      laserHealth: 100,
      equipment: {}, 
      activeLoans: [initialLoan],
      investments: [],
      loanOffers: [],
      activeContracts: [],
      availableContracts: [],
      loanTakenToday: false,
      venueTradeBans: {},
      messages: [
        { id: 1, message: `System Init v9.9.1... Welcome aboard, Captain.`, type: 'info' },
        { id: 2, message: `Widow's Gift Sent: ${formatCurrencyLog(5000)}. Loan secured.`, type: 'debt' },
        { id: 3, message: `ALERT: Mining Laser Offline.`, type: 'critical' }
      ],
      gameOver: false,
      gamePhase: 1,
      stats: { largestSingleWin: 0, largestSingleLoss: 0 },
      highScores: [], // Will load async
      tutorialActive: false,
      tutorialFlags: {},
      dailyTransactions: {},
      fomoDailyUse: { mesh: false, stims: false }
    };

    initialState.loanOffers = generateLoanOffers(initialState.gamePhase);
    initialState.availableContracts = generateContracts(initialState.currentVenueIndex, initialState.day, initialState.gamePhase, {}, [], []);
    
    setState(initialState);
    loadHighScores().then(s => setState(prev => prev ? {...prev, highScores: s} : null));
    setModal({ type: 'welcome', data: null });
  };

  useEffect(() => { initGame(); }, []);
  useEffect(() => { runTutorialCheck(); }, [state?.day, modal.type]);

  // --- Logic Helpers ---

  const runTutorialCheck = () => {
     if (!state) return;
     
     // 1. Offer Tutorial on Day 1 (if not asked yet)
     if (state.day === 1 && modal.type === 'none' && !state.tutorialFlags['asked_intro']) {
         setState(prev => prev ? ({...prev, tutorialFlags: {...prev.tutorialFlags, asked_intro: true}}) : null);
         setTimeout(() => setModal({ type: 'tutorial_intro', data: null }), 500);
         return;
     }

     if (!state.tutorialActive) return;

     // 2. Day 2 Reminder
     if (state.day === 2 && !state.tutorialFlags['day2_mining'] && modal.type === 'none') {
         setTimeout(() => {
             setState(prev => prev ? ({...prev, tutorialFlags: {...prev.tutorialFlags, day2_mining: true}}) : null);
             setModal({type:'message', data: "Reminder: Free resources are floating in space! Buy a Mining Laser (Upgrades Deck) and enable 'Mining Run' in C.A.T. Station. Mine, mine, mine!"});
         }, 1000);
     }
  };

  const handleFeatureClick = (feature: string, callback: () => void) => {
      if (state && state.tutorialActive && !state.tutorialFlags[feature]) {
          let title = "", text = "";
          if (feature === 'shop') { title = "Fixathing'u'ma Jig Deck"; text = "Upgrade your Ship Hull, Repair Damage, and Install Equipment here. Essential for survival and growth."; }
          if (feature === 'banking') { title = "I.B.A.N.K. Hub"; text = "Manage Debt here. Avoid defaults! You can also invest idle cash in Term Deposits for safe returns."; }
          if (feature === 'travel') { title = "C.A.T. Station"; text = "Chart and Travel. Check 'Risk' levels. High risk = Pirates/Hazards. Ensure you have Fuel."; }
          if (feature === 'shipping') { title = "Void-Ex Logistics"; text = "Fulfil Corporate Contracts here for high rewards. Use 'Private Shipping' to move goods to a warehouse without flying there yourself."; }
          if (feature === 'comms') { title = "G.I.G.O. Panel"; text = "Review daily logs, market intel, and previous event reports. Garbage In, Garbage Out... usually."; }
          if (feature === 'fomo') { title = "F.O.M.O. Engineering Deck"; text = "Fabricate Output Management Operations. Craft valuable Z@onflex Weave Mesh from basic resources. A great way to add value."; }
          
          setModal({ type: 'tutorial_popup', data: { title, text, feature, callback } });
      } else {
          callback();
      }
  };

  const log = (msg: string, type: LogEntry['type']) => {
    // Truncate logs to keep only last 5 days
    setState(prev => {
        if (!prev) return null;
        const entry: LogEntry = { id: Date.now() + Math.random(), message: `[D${prev.day}] ${msg}`, type };
        
        const currentDay = prev.day;
        const cutoffDay = Math.max(1, currentDay - 5);
        
        const filtered = prev.messages.filter(m => {
            const match = m.message.match(/\[D(\d+)\]/);
            if (match) {
                const d = parseInt(match[1]);
                return d >= cutoffDay;
            }
            return true; // Keep system messages if no day tag
        });

        return { ...prev, messages: [...filtered, entry] };
    });
  };

  const generateMarket = (isInitial: boolean, isLocal: boolean): Market => {
    const market: Market = {};
    COMMODITIES.forEach(c => {
      const rarity = 1 - c.rarity;
      const base = Math.floor(100 + 1000 * rarity);
      let qty = isLocal ? Math.floor(base * (1 + (Math.random()*0.4 - 0.1))) : Math.floor(base * (1 + (Math.random()-0.5)));
      qty = Math.max(1, qty);
      const ratio = qty / base;
      const mid = (c.minPrice + c.maxPrice) / 2;
      let price = mid / Math.sqrt(ratio);
      price = Math.round(Math.min(c.maxPrice, Math.max(c.minPrice, price)));
      market[c.name] = { price, quantity: qty, standardQuantity: base, depletionDays: 0 };
    });
    return market;
  };

  const evolveMarkets = (s: GameState): Market[] => {
    const phaseMult = 1 + ((s.gamePhase - 1) * 0.25); 
    // Reduced multipliers: Phase 2 = 3x, Phase 3 = 9x
    const stockMult = s.gamePhase === 3 ? 9 : (s.gamePhase === 2 ? 3 : 1);
    
    // Glut Factor: Stock grows faster than demand to lower prices at phase start
    const glutFactor = 2.0;

    const globalIncreasePct = 0.10 + Math.random() * 0.15;

    const h2oPasteMinMult = Math.pow(1.05, s.day);
    const h2oPasteMaxMult = Math.pow(1.10, s.day);

    return s.markets.map(m => {
      const newM: Market = {};
      Object.keys(m).forEach(key => {
        const item = m[key];
        const c = COMMODITIES.find(x => x.name === key)!;
        const adjustedStdQty = item.standardQuantity * stockMult; // Standard Demand
        
        let newQty = Math.floor(item.quantity * (1 + (Math.random()-0.5))); 
        
        if (Math.random() < 0.2) {
             const boost = Math.ceil(adjustedStdQty * globalIncreasePct);
             newQty += boost;
        }

        let dDays = item.quantity <= 0 ? item.depletionDays + 1 : 0;
        if (dDays > 2) {
           newQty = Math.floor(adjustedStdQty * 0.5); 
           dDays = 0;
        }
        newQty = Math.max(0, newQty);

        const effectiveRatio = (newQty+1) / adjustedStdQty; 
        
        let rangeMin = c.minPrice * phaseMult;
        let rangeMax = c.maxPrice * phaseMult;

        if (key === H2O_NAME || key === NUTRI_PASTE_NAME) {
            rangeMin = c.minPrice * h2oPasteMinMult;
            rangeMax = c.maxPrice * h2oPasteMaxMult;
        }
        
        if (key === FUEL_NAME) {
            const fluct = 1 + (Math.random() * 0.3 - 0.15);
            rangeMax *= fluct;
        }

        let price = 0;
        if (key === 'Spacetime Tea') {
             const logMin = Math.log(rangeMin);
             const logMax = Math.log(rangeMax);
             const scale = logMin + (logMax - logMin) * Math.random();
             price = Math.round(Math.exp(scale));
        } else {
             const mid = (rangeMin + rangeMax) / 2;
             price = mid / Math.sqrt(effectiveRatio);
             price = Math.round(Math.min(rangeMax, Math.max(rangeMin, price)));
        }

        newM[key] = { price, quantity: newQty, standardQuantity: item.standardQuantity, depletionDays: dDays };
      });
      return newM;
    });
  };

  const generateContracts = (currentVenue: number, day: number, phase: number, bans: Record<number, number>, existingAvailable: Contract[], active: Contract[]): Contract[] => {
    const kept = existingAvailable.filter(c => c.daysRemaining > 0);
    kept.forEach(c => c.daysRemaining--); 
    const keptActive = kept.filter(c => c.daysRemaining > 0);
    
    const contracts: Contract[] = [...keptActive];
    const limit = phase === 1 ? CONTRACT_LIMIT_P1 : (phase === 2 ? CONTRACT_LIMIT_P2 : CONTRACT_LIMIT_P3);
    const phaseMult = 1 + ((phase - 1) * 0.5); 

    if (contracts.length < limit) { 
        for (let i = 0; i < 3; i++) {
            const dest = Math.floor(Math.random() * VENUES.length);
            if (dest === currentVenue || (bans[dest] && bans[dest] > 0)) continue; 
            
            const firm = CONTRACT_FIRMS[Math.floor(Math.random() * CONTRACT_FIRMS.length)];
            const commod = COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)];
            
            const alreadyExists = [...active, ...contracts].some(c => c.commodity === commod.name);
            if (alreadyExists) continue;

            const baseQty = Math.floor(Math.random() * 50) + 10;
            const qty = Math.floor(baseQty * (phase === 1 ? 1 : (phase === 2 ? 5 : 20))); 
            
            const reward = Math.round(commod.maxPrice * qty * (1.5 + Math.random() * 0.5) * phaseMult);
            const penalty = Math.round(reward * 0.5);
            const time = Math.floor(Math.random() * 3) + 1; 

            contracts.push({
                id: Date.now() + Math.random(), firm, commodity: commod.name, quantity: qty, destinationIndex: dest, reward, daysRemaining: time, penalty
            });
        }
    }
    return contracts;
  };

  const generateLoanOffers = (phase: number): LoanOffer[] => {
    const goal = phase === 1 ? GOAL_PHASE_1_AMOUNT : (phase === 2 ? GOAL_PHASE_2_AMOUNT : GOAL_PHASE_2_AMOUNT * 2);
    const maxLoan = goal * 0.25; 
    const offers = [];
    for(let i=0; i<5; i++) {
        const firm = LOAN_FIRMS[i % LOAN_FIRMS.length];
        const minAmt = Math.max(5000, maxLoan * 0.05); 
        offers.push({
            firmName: firm.name,
            amount: Math.ceil((Math.random() * (maxLoan - minAmt) + minAmt) / 1000) * 1000,
            interestRate: Math.max(1, Math.min(15, firm.baseRate + Math.random() * 5))
        });
    }
    return offers;
  };

  const getNetWorth = (s: GameState) => {
    const debt = s.activeLoans.reduce((a,b) => a + b.currentDebt, 0);
    const cargoVal = Object.entries(s.cargo).reduce((sum, [name, item]) => sum + (item.quantity * (s.markets[s.currentVenueIndex][name]?.price || 0)), 0);
    const invVal = s.investments.reduce((a,b) => a + b.amount, 0);
    return s.cash + cargoVal + invVal - debt;
  };

  const getMarketTips = (s: GameState) => {
    if (!s) return [];
    const tips: any[] = [];
    const currentMarket = s.markets[s.currentVenueIndex];
    COMMODITIES.forEach(c => {
      const cp = currentMarket[c.name].price;
      let minP = Infinity, maxP = 0, maxV = '';
      s.markets.forEach((m, i) => {
        const p = m[c.name].price;
        if (p < minP) minP = p;
        if (p > maxP) { maxP = p; maxV = VENUES[i]; }
      });
      if (cp <= minP * 1.1) tips.push({ type: 'buy', text: `BUY ${c.name}: Low (${formatCurrencyLog(cp)}). Sell at ${maxV} (~${formatCurrencyLog(maxP)}).`, score: maxP/cp });
      if (cp >= maxP * 0.9) tips.push({ type: 'sell', text: `SELL ${c.name}: High (${formatCurrencyLog(cp)}).`, score: cp });
    });
    return tips.sort((a,b) => b.score - a.score).slice(0, 3);
  };

  const hasLaser = (s: GameState) => s.equipment['laser_mk1'] || s.equipment['laser_mk2'] || s.equipment['laser_mk3'];
  
  const isContractCovered = (s: GameState, c: Contract) => {
      const wh = s.warehouse[c.destinationIndex];
      if (wh && wh[c.commodity] && wh[c.commodity].quantity >= c.quantity) return true;
      return false;
  };

  // --- Actions ---

  const handleTrade = (action: 'buy' | 'sell', c: Commodity, mItem: any, owned: any) => {
    if (!state) return;
    const rawQ = action === 'buy' ? buyQuantities[c.name] : sellQuantities[c.name];
    let qty = parseInt(rawQ || '0');
    if (qty <= 0) return;
    
    // Check frequent trading tax
    const txKey = `${state.currentVenueIndex}_${c.name}`;
    const txCount = state.dailyTransactions[txKey] || 0;
    let tax = 0;
    let taxMsg = '';

    if (action === 'buy') {
      let cost = qty * mItem.price;
      const weight = qty * c.unitWeight;
      
      if (txCount > 0) {
          tax = Math.floor(cost * 0.05);
          cost += tax;
          taxMsg = ` (incl. 5% Freq. Trade Tax: ${formatCurrencyLog(tax)})`;
      }

      if (state.cash < cost) return setModal({type:'message', data:`Insufficient funds${taxMsg}.`});
      if (state.cargoWeight + weight > state.cargoCapacity) return setModal({type:'message', data:`Cargo Full.`});
      
      const newM = [...state.markets];
      newM[state.currentVenueIndex][c.name].quantity = Math.max(0, newM[state.currentVenueIndex][c.name].quantity - qty); // Prevent negative stock
      const cur = state.cargo[c.name] || { quantity: 0, averageCost: 0 };
      const newTotal = cur.quantity + qty;
      const newAvg = ((cur.quantity * cur.averageCost) + (qty * mItem.price)) / newTotal; // Avg cost uses base price, tax is expense
      
      setState(prev => prev ? ({ 
          ...prev, 
          cash: prev.cash - cost, 
          cargoWeight: prev.cargoWeight + weight, 
          markets: newM, 
          cargo: { ...prev.cargo, [c.name]: { quantity: newTotal, averageCost: newAvg } },
          dailyTransactions: { ...prev.dailyTransactions, [txKey]: txCount + 1 }
      }) : null);
      if (tax > 0) log(`TAX: Paid ${formatCurrencyLog(tax)} for frequent trading.`, 'danger');
      setBuyQuantities(prev => ({...prev, [c.name]: ''}));

    } else {
      let rev = qty * mItem.price;
      const weight = qty * c.unitWeight;
      
      if (txCount > 0) {
          tax = Math.floor(rev * 0.05);
          rev -= tax;
          taxMsg = ` (minus 5% Freq. Trade Tax: ${formatCurrencyLog(tax)})`;
      }

      if (owned.quantity < qty) return;
      const newM = [...state.markets];
      newM[state.currentVenueIndex][c.name].quantity += qty;
      const newC = { ...state.cargo };
      newC[c.name].quantity = Math.max(0, newC[c.name].quantity - qty);
      if (newC[c.name].quantity <= 0) delete newC[c.name];
      
      const profit = rev - (qty * owned.averageCost);
      const isProfitable = profit > 0;

      setState(prev => prev ? ({ 
          ...prev, 
          cash: prev.cash + rev, 
          cargoWeight: prev.cargoWeight - weight, 
          markets: newM, 
          cargo: newC, 
          stats: { ...prev.stats, largestSingleWin: Math.max(prev.stats.largestSingleWin, rev) },
          dailyTransactions: { ...prev.dailyTransactions, [txKey]: txCount + 1 }
      }) : null);
      if (tax > 0) log(`TAX: Paid ${formatCurrencyLog(tax)} for frequent trading.`, 'danger');
      log(isProfitable ? `PROFIT: Made ${formatCurrencyLog(profit)} selling ${c.name}` : `LOSS: Lost ${formatCurrencyLog(Math.abs(profit))} selling ${c.name}`, isProfitable ? 'profit' : 'danger');
      setSellQuantities(prev => ({...prev, [c.name]: ''}));
    }
  };

  const setMaxBuy = (c: Commodity, mItem: any) => {
    if (!state) return;
    const cashMax = Math.floor(state.cash / mItem.price);
    const weightAvailable = state.cargoCapacity - state.cargoWeight;
    const weightMax = Math.floor(weightAvailable / c.unitWeight);
    const val = Math.max(0, Math.min(cashMax, weightMax, mItem.quantity));
    setBuyQuantities(prev => ({...prev, [c.name]: val.toString()}));
  };

  const buyEquipment = (item: EquipmentItem) => {
     if (!state) return;
     if (state.cash < item.cost) return setModal({type:'message', data:"Insufficient Funds."});
     let newCap = state.cargoCapacity;
     let newLaserHealth = state.laserHealth;
     if (item.type === 'laser') newLaserHealth = 100;
     setState(prev => prev ? ({ ...prev, cash: prev.cash - item.cost, cargoCapacity: newCap, laserHealth: newLaserHealth, equipment: { ...prev.equipment, [item.id]: true } }) : null);
     log(`UPGRADES: Purchased ${item.name}`, 'buy');
  };
  
  const performRepair = (type: 'hull' | 'laser' | 'full_hull' | 'full_laser') => {
      if (!state) return;
      
      const MAX_LASER_HEALTH = 100;

      if (type === 'full_hull') {
          if (state.shipHealth >= MAX_REPAIR_HEALTH) return setModal({type:'message', data:"Hull integrity at maximum."});
          const needed = Math.ceil((MAX_REPAIR_HEALTH - state.shipHealth) / REPAIR_INCREMENT);
          const cost = needed * REPAIR_COST;
          if (state.cash < cost) return setModal({type:'message', data:`Insufficient funds. Need ${formatCurrencyLog(cost)}.`});
          setState(prev => prev ? ({...prev, cash: prev.cash - cost, shipHealth: MAX_REPAIR_HEALTH}) : null);
          log(`REPAIR: Hull fully restored.`, 'repair');
          return;
      }
      if (type === 'full_laser') {
          if (!hasLaser(state)) return;
          if (state.laserHealth >= MAX_LASER_HEALTH) return setModal({type:'message', data:"Laser operational."});
          const needed = Math.ceil((MAX_LASER_HEALTH - state.laserHealth) / REPAIR_INCREMENT);
          const cost = needed * LASER_REPAIR_COST;
          if (state.cash < cost) return setModal({type:'message', data:`Insufficient funds. Need ${formatCurrencyLog(cost)}.`});
          setState(prev => prev ? ({...prev, cash: prev.cash - cost, laserHealth: MAX_LASER_HEALTH}) : null);
          log(`REPAIR: Laser fully realigned.`, 'repair');
          return;
      }
  };

  const calculateFullRepairCost = () => {
    if (!state) return 0;
    if (state.shipHealth >= MAX_REPAIR_HEALTH) return 0;
    const needed = Math.ceil((MAX_REPAIR_HEALTH - state.shipHealth) / REPAIR_INCREMENT);
    return needed * REPAIR_COST;
  };

  const acceptContract = (c: Contract) => {
    if (!state) return;
    const limit = state.gamePhase === 1 ? CONTRACT_LIMIT_P1 : (state.gamePhase === 2 ? CONTRACT_LIMIT_P2 : CONTRACT_LIMIT_P3);
    if (state.activeContracts.length >= limit) return setModal({type:'message', data: `Contract limit reached (${limit}).`});
    
    const newAvail = state.availableContracts.filter(con => con.id !== c.id);
    const newActive = [...state.activeContracts, c];
    
    setState(prev => prev ? ({ ...prev, availableContracts: newAvail, activeContracts: newActive }) : null);
    log(`CONTRACT: Accepted ${c.firm} contract.`, 'contract');
  };
  
  const fabricateItem = (qty: number) => {
      if (!state) return;
      if (state.fomoDailyUse.mesh) return setModal({type:'message', data: "Daily Limit Reached for Mesh Fabrication."});
      
      const COST_PER = 2500;
      const ore = state.cargo['Titanium Ore']?.quantity || 0;
      const cloth = state.cargo['Synthetic Cloth']?.quantity || 0;
      
      if (ore < qty || cloth < qty) return setModal({type:'message', data: "Insufficient Materials (Need 1 Ore + 1 Cloth per unit)."});
      if (state.cash < qty * COST_PER) return setModal({type:'message', data: "Insufficient Funds."});

      const newC = { ...state.cargo };
      newC['Titanium Ore'].quantity = Math.max(0, newC['Titanium Ore'].quantity - qty);
      if (newC['Titanium Ore'].quantity <= 0) delete newC['Titanium Ore'];
      newC['Synthetic Cloth'].quantity = Math.max(0, newC['Synthetic Cloth'].quantity - qty);
      if (newC['Synthetic Cloth'].quantity <= 0) delete newC['Synthetic Cloth'];
      
      const mesh = newC[MESH_NAME] || { quantity: 0, averageCost: 0 };
      const costBasis = (qty * state.cargo['Titanium Ore'].averageCost) + (qty * state.cargo['Synthetic Cloth'].averageCost) + (qty * COST_PER);
      const newMeshAvg = ((mesh.quantity * mesh.averageCost) + costBasis) / (mesh.quantity + qty);
      
      newC[MESH_NAME] = { quantity: mesh.quantity + qty, averageCost: newMeshAvg };
      
      const weightDelta = (qty * 2.5) - (qty * 5.0) - (qty * 0.25);
      
      setState(prev => prev ? ({
          ...prev,
          cash: prev.cash - (qty * COST_PER),
          cargo: newC,
          cargoWeight: prev.cargoWeight + weightDelta,
          fomoDailyUse: { ...prev.fomoDailyUse, mesh: true }
      }) : null);
      
      log(`FABRICATION: Created ${qty} ${MESH_NAME}. Daily limit reached.`, 'buy');
      setFomoQty('1');
  };

  const fabricateStimPacks = (qty: number) => {
      if (!state) return;
      if (state.fomoDailyUse.stims) return setModal({type:'message', data: "Daily Limit Reached for Stim-Pack Fabrication."});

      const COST_PER = 250;
      const h2o = state.cargo[H2O_NAME]?.quantity || 0;
      const paste = state.cargo[NUTRI_PASTE_NAME]?.quantity || 0;
      
      if (h2o < qty * 2 || paste < qty) return setModal({type:'message', data: "Insufficient Materials (Need 2 H2O + 1 Nutri-Paste per unit)."});
      if (state.cash < qty * COST_PER) return setModal({type:'message', data: "Insufficient Funds."});

      const newC = { ...state.cargo };
      newC[H2O_NAME].quantity = Math.max(0, newC[H2O_NAME].quantity - (qty * 2));
      if (newC[H2O_NAME].quantity <= 0) delete newC[H2O_NAME];
      newC[NUTRI_PASTE_NAME].quantity = Math.max(0, newC[NUTRI_PASTE_NAME].quantity - qty);
      if (newC[NUTRI_PASTE_NAME].quantity <= 0) delete newC[NUTRI_PASTE_NAME];
      
      const stims = newC['Stim-Packs'] || { quantity: 0, averageCost: 0 };
      const h2oCost = state.cargo[H2O_NAME].averageCost;
      const pasteCost = state.cargo[NUTRI_PASTE_NAME].averageCost;
      
      const costBasis = (qty * 2 * h2oCost) + (qty * pasteCost) + (qty * COST_PER);
      const newStimAvg = ((stims.quantity * stims.averageCost) + costBasis) / (stims.quantity + qty);
      
      newC['Stim-Packs'] = { quantity: stims.quantity + qty, averageCost: newStimAvg };
      
      // H2O(1.0)*2 + Paste(0.5)*1 = 2.5T input. Stim(0.25) output. Delta = -2.25 per unit.
      const weightDelta = (qty * 0.25) - (qty * 2.5);
      
      setState(prev => prev ? ({
          ...prev,
          cash: prev.cash - (qty * COST_PER),
          cargo: newC,
          cargoWeight: prev.cargoWeight + weightDelta,
          fomoDailyUse: { ...prev.fomoDailyUse, stims: true }
      }) : null);
      
      log(`FABRICATION: Created ${qty} Stim-Packs. Daily limit reached.`, 'buy');
      setFomoStimQty('1');
  };

  const claimWarehouseItem = (venueIdx: number, commodity: string, qty: number) => {
      if (!state) return;
      if (state.currentVenueIndex !== venueIdx) return setModal({type:'message', data: "Cannot claim: You are not at this venue."});

      const item = state.warehouse[venueIdx][commodity];
      if (!item || qty > item.quantity) return;

      const c = COMMODITIES.find(x => x.name === commodity)!;
      const weight = qty * c.unitWeight;
      
      if (state.cargoWeight + weight > state.cargoCapacity) return setModal({type:'message', data: "Insufficient Cargo Space."});

      const newCargo = { ...state.cargo };
      const cur = newCargo[commodity] || { quantity: 0, averageCost: 0 };
      const newTotal = cur.quantity + qty;
      const newAvg = ((cur.quantity * cur.averageCost) + (qty * item.originalAvgCost)) / newTotal;
      
      newCargo[commodity] = { quantity: newTotal, averageCost: newAvg };
      
      const newW = { ...state.warehouse };
      newW[venueIdx][commodity].quantity -= qty;
      if (newW[venueIdx][commodity].quantity <= 0) delete newW[venueIdx][commodity];
      if (Object.keys(newW[venueIdx]).length === 0) delete newW[venueIdx];

      setState(prev => prev ? ({ ...prev, cargo: newCargo, warehouse: newW, cargoWeight: prev.cargoWeight + weight }) : null);
      log(`LOGISTICS: Claimed ${qty} ${commodity} from warehouse.`, 'info');
      setClaimQuantities({...claimQuantities, [commodity]: ''});
  };

  const forwardWarehouseItem = (venueIdx: number, commodity: string) => {
      if (!state) return;
      setLogisticsTab('shipping');
      // Set specific source venue
      setShippingSource({ [commodity]: { type: 'warehouse', venueIdx } });
      setShippingQuantities({ [commodity]: state.warehouse[venueIdx][commodity].quantity.toString() });
      setHighlightShippingItem(commodity);
  };

  const processDay = (s: GameState, report: DailyReport) => {
    // Reset Daily Limits
    s.dailyTransactions = {};
    s.fomoDailyUse = { mesh: false, stims: false };

    if (s.day > 1) {
        const themes = Object.keys(QUIRKY_MESSAGES_DB);
        const theme = themes[Math.floor(Math.random() * themes.length)];
        const msgs = QUIRKY_MESSAGES_DB[theme as keyof typeof QUIRKY_MESSAGES_DB];
        report.quirkyMessage = { text: msgs[Math.floor(Math.random() * msgs.length)], theme };
    }

    if (s.cash < 0) {
       const interest = Math.abs(s.cash) * 0.15;
       s.cash -= interest;
       report.events.push(`OVERDRAFT: Charged ${formatCurrencyLog(interest)} interest.`);
    }

    const girlMatter = s.cargo['G.I.R.L (Lite) Matter'];
    if (girlMatter && Math.random() < 0.33) {
        const pct = 0.05 + Math.random() * 0.10; 
        const loss = Math.ceil(girlMatter.quantity * pct);
        s.cargo['G.I.R.L (Lite) Matter'].quantity = Math.max(0, s.cargo['G.I.R.L (Lite) Matter'].quantity - loss);
        if (s.cargo['G.I.R.L (Lite) Matter'].quantity <= 0) delete s.cargo['G.I.R.L (Lite) Matter'];
        s.cargoWeight -= loss * COMMODITIES.find(c => c.name === 'G.I.R.L (Lite) Matter')!.unitWeight;
        report.events.push(`WARNING: G.I.R.L Matter instability detected! ${loss} units evaporated/exploded.`);
    }

    const powerCells = s.cargo[POWER_CELL_NAME];
    if (powerCells && Math.random() < 0.25) {
        const loss = Math.ceil(powerCells.quantity * 0.02);
        s.cargo[POWER_CELL_NAME].quantity = Math.max(0, s.cargo[POWER_CELL_NAME].quantity - loss);
        if (s.cargo[POWER_CELL_NAME].quantity <= 0) delete s.cargo[POWER_CELL_NAME];
        s.cargoWeight -= loss * COMMODITIES.find(c => c.name === POWER_CELL_NAME)!.unitWeight;
        report.events.push(`MAINTENANCE: ${loss} Power Cells found dead and were discarded.`);
    }

    let keepLoans: any[] = [];
    s.activeLoans.forEach(l => {
       l.daysRemaining--;
       l.currentDebt += Math.round(l.currentDebt * (l.interestRate/100));
       if (l.daysRemaining <= 0) {
          const fine = l.principal * 0.1;
          s.cash -= fine;
          report.events.push(`DEFAULT: ${l.firmName} penalty ${formatCurrencyLog(fine)}.`);
       }
       keepLoans.push(l);
    });
    s.activeLoans = keepLoans;

    let keepInv: any[] = [];
    s.investments.forEach(i => {
       i.daysRemaining--;
       if (i.daysRemaining <= 0) {
          s.cash += i.maturityValue;
          report.events.push(`INVESTMENT MATURED: Received ${formatCurrencyLog(i.maturityValue)}.`);
       } else {
          keepInv.push(i);
       }
    });
    s.investments = keepInv;
    
    // Warehouse Expiry & Transit Delays
    Object.keys(s.warehouse).forEach(vIdx => {
        const idx = parseInt(vIdx);
        const venueItems = s.warehouse[idx];
        const keptItems: Record<string, WarehouseItem> = {};
        
        Object.entries(venueItems).forEach(([name, item]) => {
             // Delay Chance for in-transit items
             if (item.arrivalDay > s.day) {
                 if (Math.random() < 0.1) {
                     item.arrivalDay++;
                     report.events.push(`DELAY: Shipment of ${name} to ${VENUES[idx]} delayed 1 day due to logistics hiccups.`);
                 }
                 keptItems[name] = item;
                 return;
             }
             
             // Expiry Check (Arrived)
             if (s.day > item.arrivalDay + 3) {
                 report.events.push(`SEIZURE: ${item.quantity} ${name} at ${VENUES[idx]} sold to defray storage costs.`);
             } else {
                 keptItems[name] = item;
             }
        });
        
        s.warehouse[idx] = keptItems;
        if (Object.keys(s.warehouse[idx]).length === 0) delete s.warehouse[idx];
    });

    Object.keys(s.venueTradeBans).forEach(idx => {
        const i = parseInt(idx);
        if (s.venueTradeBans[i] > 0) s.venueTradeBans[i]--;
        if (s.venueTradeBans[i] <= 0) delete s.venueTradeBans[i];
    });

    let keepContracts: Contract[] = [];
    const contractsToCheck = [...s.activeContracts];
    contractsToCheck.forEach(c => {
        const wh = s.warehouse[c.destinationIndex];
        // Only fulfill if item has arrived (arrivalDay <= s.day)
        if (wh && wh[c.commodity] && wh[c.commodity].quantity >= c.quantity && wh[c.commodity].arrivalDay <= s.day) {
             wh[c.commodity].quantity -= c.quantity;
             if (wh[c.commodity].quantity <= 0) delete wh[c.commodity];
             if (Object.keys(wh).length === 0) delete s.warehouse[c.destinationIndex];
             
             s.cash += c.reward;
             s.stats.largestSingleWin = Math.max(s.stats.largestSingleWin, c.reward);
             report.events.push(`CONTRACT FULFILLED: ${c.firm} received shipment at ${VENUES[c.destinationIndex]}. Reward: ${formatCurrencyLog(c.reward)}`);
        } else {
             c.daysRemaining--;
             if (c.daysRemaining <= 0) {
                s.cash -= c.penalty;
                s.venueTradeBans[c.destinationIndex] = TRADE_BAN_DURATION;
                report.events.push(`BREACH OF CONTRACT: ${c.firm} order failed. Penalty: ${formatCurrencyLog(c.penalty)} & Trade License Suspended for 3 days.`);
             } else {
                if (c.daysRemaining === 1) report.events.push(`WARNING: Contract for ${c.firm} due TOMORROW.`);
                keepContracts.push(c);
             }
        }
    });
    s.activeContracts = keepContracts;

    s.markets = evolveMarkets(s);
    s.loanOffers = generateLoanOffers(s.gamePhase);
    s.availableContracts = generateContracts(s.currentVenueIndex, s.day, s.gamePhase, s.venueTradeBans, s.availableContracts, s.activeContracts);
    s.loanTakenToday = false;
  };

  const handleTravel = (destIdx: number, fuelCost: number, ins: boolean, mine: boolean, overload: boolean, invest95: boolean) => {
     if (!state) return;
     if (state.cargoWeight > state.cargoCapacity) return setModal({type:'message', data:"Above cargo hold capacity: sell or ship excess."});

     const s = { ...state };
     const report: DailyReport = { events: [], totalHullDamage: 0, totalLaserDamage: 0, fuelUsed: fuelCost, lostItems: {}, gainedItems: {}, insuranceBought: ins };

     if (destIdx === s.currentVenueIndex) {
         s.day++;
         // Removed claimWarehouse(); Manual only.
         processDay(s, report);
         
         if (!s.gameOver) {
            setModal({ type: 'report', data: { events: report.events, day: s.day, tips: getMarketTips(s), quirky: report.quirkyMessage } });
            setState(s);
         }
         return;
     }

     if (invest95 && s.activeLoans.length === 0) {
         const investAmt = Math.floor(s.cash * 0.95);
         if (investAmt > 0) {
             s.cash -= investAmt;
             s.investments.push({
                 id: Date.now(),
                 amount: investAmt,
                 daysRemaining: 1,
                 maturityValue: Math.floor(investAmt * 1.05),
                 interestRate: 0.05
             });
             report.events.push(`PROTECTION: Invested ${formatCurrencyLog(investAmt)} (95%) in 1-Day CD.`);
         }
     }

     if (ins) s.cash -= Math.round(getCargoValue(s.cargo) * 0.05);
     
     const f = COMMODITIES.find(c=>c.name===FUEL_NAME)!;
     s.cargo[FUEL_NAME].quantity -= fuelCost;
     s.cargoWeight -= fuelCost * f.unitWeight;
     if (s.cargo[FUEL_NAME].quantity <= 0) delete s.cargo[FUEL_NAME];

     // Increased event chance to 60%
     if (Math.random() < 0.6) {
        const types: Encounter['type'][] = ['pirate', 'accident', 'derelict', 'fuel_leak', 'police', 'mutiny', 'tax', 'structural'];
        const type = types[Math.floor(Math.random()*types.length)];
        let encounter: Encounter = { type, title: '', description: '', riskDamage: 0 };
        
        // No Insurance Penalty Logic - Guarantee Bad Outcome logic handled in finalize or inside event
        let riskMult = ins ? 1 : 2; // Punish harder
        
        if (type === 'pirate') { 
            encounter.title = 'Pirate Interdiction'; 
            encounter.description = 'Crimson Fleet demands tribute.'; 
            encounter.demandAmount = Math.floor(s.cash * 0.2) + 500; 
            encounter.riskDamage = 25 * riskMult; 
        } else if (type === 'accident') { 
            encounter.title = 'Navigational Hazard'; 
            encounter.description = ins ? 'Debris field detected.' : 'Debris field detected! HULL BREACH IMMINENT (No Insurance - Guaranteed Loss).'; 
            encounter.riskDamage = 15 * riskMult;
            
            // Guaranteed loss if no insurance
            if (!ins || Math.random() < 0.5) {
                const items = Object.keys(s.cargo);
                if (items.length > 0) {
                    const lostItem = items[Math.floor(Math.random() * items.length)];
                    const q = Math.ceil(s.cargo[lostItem].quantity * (ins ? 0.2 : 0.5));
                    encounter.itemLoss = `${q} ${lostItem}`;
                    s.cargo[lostItem].quantity = Math.max(0, s.cargo[lostItem].quantity - q);
                    if (s.cargo[lostItem].quantity<=0) delete s.cargo[lostItem];
                    s.cargoWeight -= q * COMMODITIES.find(c=>c.name===lostItem)!.unitWeight;
                    report.lostItems[lostItem] = (report.lostItems[lostItem]||0) + q;
                }
            }
        } else if (type === 'derelict') { 
            encounter.title = 'Derelict Signal'; 
            encounter.description = 'Found an abandoned freighter.'; 
        } else if (type === 'fuel_leak') { 
            encounter.title = 'Fuel Tank Breach'; 
            encounter.description = 'Leaking fuel reserves.'; 
            encounter.riskDamage = 5 * riskMult; 
        } else if (type === 'police') {
            encounter.title = 'Customs Inspection';
            encounter.description = ins ? 'Routine patrol scan.' : 'Aggressive scan detected. Bribe required or goods confiscated.';
            encounter.demandAmount = Math.floor(s.cash * 0.1) + 1000;
            if (!ins) {
                const items = Object.keys(s.cargo);
                if(items.length > 0) {
                    const lostItem = items[Math.floor(Math.random() * items.length)];
                    encounter.itemLoss = `Confiscation target: ${lostItem}`;
                }
            }
        } else if (type === 'mutiny') {
            encounter.title = 'Crew Mutiny';
            encounter.description = 'Morale is low. They want a bonus.';
            encounter.demandAmount = Math.floor(s.cash * 0.15) + 500;
        } else if (type === 'tax') {
            encounter.title = 'Sector Cargo Tax';
            encounter.description = 'Surprise checkpoint tax.';
            encounter.demandAmount = Math.ceil(s.cargoWeight * 10);
        } else if (type === 'structural') {
            encounter.title = 'Cargo Bay Structural Failure';
            encounter.description = 'Support beams buckling.';
            encounter.capacityLoss = 100;
        }
        
        setModal({ type: 'event_encounter', data: { state: s, report, encounter, destIdx, mine, overload } });
        return; 
     }
     finalizeJump(s, report, destIdx, mine, overload);
  };

  const finalizeJump = (s: GameState, report: DailyReport, destIdx: number, mine: boolean, overload: boolean) => {
     if (s.equipment['plasma_cannon'] && Math.random() < 0.1) {
         delete s.equipment['plasma_cannon'];
         report.events.push("CRITICAL: Plasma Cannons burned out during transit.");
     }
     if (s.equipment['shield_gen'] && Math.random() < 0.1) {
         delete s.equipment['shield_gen'];
         report.events.push("CRITICAL: Shield Generator overload. Unit destroyed.");
     }

     if (mine && hasLaser(s)) {
        const pc = s.cargo[POWER_CELL_NAME];
        if (pc && pc.quantity > 0) {
            const cellsToUse = Math.min(pc.quantity, Math.floor(Math.random() * 2) + 1);
            s.cargo[POWER_CELL_NAME].quantity = Math.max(0, s.cargo[POWER_CELL_NAME].quantity - cellsToUse);
            s.cargoWeight -= cellsToUse * COMMODITIES.find(c=>c.name===POWER_CELL_NAME)!.unitWeight;
            if (s.cargo[POWER_CELL_NAME].quantity <= 0) delete s.cargo[POWER_CELL_NAME];

            const yieldMult = (s.equipment['laser_mk3'] ? 5 : (s.equipment['laser_mk2'] ? 2 : 1)) * (overload ? 2 : 1);
            const baseYield = Math.floor(Math.random() * 10) + 5; 
            const amt = baseYield * yieldMult; 
            
            const minedItems: {name: string, amt: number}[] = [];
            if (s.equipment['laser_mk1'] || s.equipment['laser_mk2'] || s.equipment['laser_mk3']) {
                minedItems.push({name: 'Titanium Ore', amt: amt});
            }
            if ((s.equipment['laser_mk2'] || s.equipment['laser_mk3']) && Math.random() > 0.5) {
                minedItems.push({name: 'Antimatter Rod', amt: Math.ceil(amt * 0.2)});
            }
            if (s.equipment['laser_mk3'] && Math.random() > 0.8) {
                minedItems.push({name: 'Dark Matter', amt: Math.ceil(amt * 0.05)});
            }

            if (overload && Math.random() < 0.3) {
                const selfDmg = 20;
                s.shipHealth -= selfDmg;
                report.totalHullDamage += selfDmg;
                report.events.push(`LASER OVERLOAD: System overheat! Sustained -${selfDmg}% Hull Damage.`);
            }

            minedItems.forEach(item => {
                const cData = COMMODITIES.find(c=>c.name===item.name)!;
                if (s.cargoWeight + item.amt*cData.unitWeight <= s.cargoCapacity) {
                   const cur = s.cargo[item.name] || { quantity: 0, averageCost: 0 };
                   const newTotal = cur.quantity + item.amt;
                   const newAvg = ((cur.quantity * cur.averageCost) + (item.amt * 0)) / newTotal;

                   s.cargo[item.name] = { quantity: newTotal, averageCost: newAvg }; 
                   s.cargoWeight += item.amt*cData.unitWeight;
                   report.gainedItems[item.name] = (report.gainedItems[item.name]||0) + item.amt;
                }
            });
            report.events.push(`MINING: Extraction complete using ${cellsToUse} Power Cells. Yield: ${minedItems.map(i=>`${i.amt} ${i.name}`).join(', ')}`);
        } else {
             report.events.push(`MINING FAILED: No Power Cells available.`);
        }
     }

     s.day++;
     s.currentVenueIndex = destIdx;
     // Removed claimWarehouse(); Manual only.
     processDay(s, report);
     
     const nw = getNetWorth(s);
     const curGoal = s.gamePhase === 1 ? GOAL_PHASE_1_AMOUNT : (s.gamePhase === 2 ? GOAL_PHASE_2_AMOUNT : Infinity);
     if (nw >= curGoal && s.gamePhase < 3) {
         setModal({ type: 'goal_achieved', data: { phase: s.gamePhase, nextPhase: s.gamePhase + 1, state: s, report } });
         return; 
     }

     const deadline = s.gamePhase === 1 ? GOAL_PHASE_1_DAYS : GOAL_PHASE_2_DAYS;
     if (s.gamePhase < 3 && s.day > deadline && nw < curGoal) s.gameOver = true;
     
     if (!s.gameOver) {
        setModal({ type: 'report', data: { events: report.events, day: s.day, tips: getMarketTips(s), quirky: report.quirkyMessage } });
        setState(s);
     } else {
        setModal({ type: 'endgame', data: { reason: "Deadline Missed.", netWorth: nw, stats: s.stats } });
     }
  };

  const advancePhase = (s: GameState, nextPhase: 1|2|3|4, report: DailyReport) => {
      s.gamePhase = nextPhase;
      // Reduced Scaling: Phase 2 = 3x, Phase 3 = 9x
      const multiplier = nextPhase === 3 ? 9 : (nextPhase === 2 ? 3 : 1); 
      const glutFactor = 2.0; 

      s.markets = s.markets.map(m => {
        const newM: Market = {};
        Object.entries(m).forEach(([k, v]) => {
            newM[k] = { 
                ...v, 
                quantity: Math.floor(v.quantity * multiplier * glutFactor), 
                standardQuantity: v.standardQuantity * multiplier 
            };
        });
        return newM;
      });

      setModal({ type: 'report', data: { events: [...report.events, `PHASE ${nextPhase} STARTED. Markets expanded. Stock Levels Multiplied by ${multiplier}x. Supply Glut detected!`], day: s.day, tips: getMarketTips(s) } });
      setState(s);
  };

  const acknowledgeReport = () => {
    if (state && modal.type === 'report') {
       const tips = modal.data.tips;
       if (tips && tips.length > 0) {
          const newMsgs = tips.map((t:any) => ({ id: Math.random(), message: `[INTEL] ${t.text}`, type: t.type === 'buy' ? 'buy' : 'sell' }));
          const evts = modal.data.events.map((e:string) => ({id:Math.random(), message:e, type: 'info'})); // Default type, colors handled by renderLogMessage if needed or specific parsing?
          // To ensure color in GIGO panel, we need to map event strings to log types
          // Re-map events to types for the GIGO panel log
          const typedEvents = modal.data.events.map((e:string) => {
              let type: LogEntry['type'] = 'info';
              if (e.includes('WARNING') || e.includes('LOSS') || e.includes('TRAP')) type = 'danger';
              else if (e.includes('CRITICAL')) type = 'critical';
              else if (e.includes('DEFAULT')) type = 'debt';
              else if (e.includes('BREACH')) type = 'breach';
              else if (e.includes('MINING') || e.includes('FABRICATION')) type = 'mining';
              else if (e.includes('INVESTMENT') || e.includes('PROFIT') || e.includes('SALVAGE')) type = 'profit';
              else if (e.includes('CONTRACT')) type = 'contract';
              else if (e.includes('PHASE')) type = 'phase';
              else if (e.includes('MAINTENANCE')) type = 'maintenance';
              return { id: Math.random(), message: e, type };
          });

          setState(prev => {
              if(!prev) return null;
              const merged = [...prev.messages, ...typedEvents, ...newMsgs];
              if (merged.length > 50) merged.splice(0, merged.length - 50); 
              return { ...prev, messages: merged };
          });
       }
    }
    setModal({ type: 'none', data: null });
  };

  // --- Render ---

  if (!state) return <div className="text-center text-white p-10 font-scifi">Loading v9.9.1...</div>;

  const currentMarket = state.markets[state.currentVenueIndex];
  const netWorth = getNetWorth(state);
  const goal = state.gamePhase===1 ? GOAL_PHASE_1_AMOUNT : (state.gamePhase===2 ? GOAL_PHASE_2_AMOUNT : 1000000000); 
  const deadline = state.gamePhase===1 ? GOAL_PHASE_1_DAYS : GOAL_PHASE_2_DAYS;
  const totalDebt = state.activeLoans.reduce((a,b)=>a+b.currentDebt,0);
  const totalInv = state.investments.reduce((a,b)=>a+b.amount,0);

  const getShopIcon = (id: string) => { if (id.includes('laser')) return Zap; if (id.includes('shield')) return Shield; if (id.includes('cannon')) return Swords; if (id.includes('capacity')) return Box; if (id.includes('scanner')) return Radar; return AlertTriangle; };
  const phaseMult = 1 + ((state.gamePhase - 1) * 0.25);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
       
       <header className="flex flex-wrap justify-between items-center px-4 py-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-baseline space-x-2">
             <h1 className="font-scifi text-4xl font-bold text-yellow-500">$TAR BUCKS</h1>
             <span className="text-sm text-gray-500 font-mono">v9.9.1</span>
          </div>

          <div className="flex items-center space-x-4 text-cyan-300 font-mono text-xl font-bold">
             <span>Day {state.day}/{deadline}</span>
             <span className="text-gray-600">|</span>
             <span>Phase {state.gamePhase}</span>
             <span className="text-gray-600">|</span>
             <span className="flex items-center">Goal: <PriceDisplay value={goal} size="text-xl ml-1" compact={state.gamePhase===3} /></span>
             
             <button onClick={()=>setModal({type:'highscores', data:null})} className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded border border-gray-600 text-yellow-400 font-scifi text-sm ml-4 flex items-center"><Trophy className="mr-1" size={16}/> Legends</button>
          </div>

          <div className="text-right">
             <div className="text-3xl font-scifi text-yellow-400 flex items-center justify-end"><PriceDisplay value={netWorth} size="text-3xl" compact={state.gamePhase===3} /></div>
             <div className="text-xs text-gray-500">NET WORTH</div>
          </div>
       </header>

       <div className="flex flex-col md:flex-row gap-4 items-stretch py-2">
          <div className="flex items-center justify-start space-x-2 bg-slate-900/40 p-2 rounded-xl border border-gray-800 min-w-max">
             <StatusDial value={Math.round(state.shipHealth)} max={150} icon={Heart} color="text-green-500" label="Hull" isPercent />
             <StatusDial value={(state.cargo[FUEL_NAME]?.quantity||0)} max={200} icon={Fuel} color="text-blue-500" label="Fuel" />
             <StatusDial value={hasLaser(state) ? Math.round(state.laserHealth || 0) : 0} max={100} icon={Crosshair} color={hasLaser(state)?'text-red-500':'text-gray-600'} label={hasLaser(state)?'Online':'Offline'} isPercent />
          </div>

          <div className="flex-grow grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
             <button onClick={()=>handleFeatureClick('shop', ()=>setModal({type:'shop', data:null}))} className="bg-purple-900/40 hover:bg-purple-800 border border-purple-600 text-purple-300 p-2 rounded flex flex-col items-center justify-center font-scifi text-sm shadow-[0_0_10px_rgba(147,51,234,0.3)]"><Zap className="mb-1" size={18}/> Upgrades Deck</button>
             <button onClick={()=>handleFeatureClick('banking', ()=>setModal({type:'banking', data:null}))} className="bg-yellow-900/40 hover:bg-yellow-800 border border-yellow-600 text-yellow-500 p-2 rounded flex flex-col items-center justify-center font-scifi text-sm shadow-[0_0_10px_rgba(202,138,4,0.3)]"><Building2 className="mb-1" size={18}/> I.B.A.N.K. Hub 
                <span className={`text-xs flex items-center mt-1 font-bold ${totalDebt > 0 ? 'text-red-500' : (totalInv > 0 ? 'text-green-500' : 'text-yellow-600')}`}>
                   {totalDebt > 0 ? <PriceDisplay value={totalDebt} size="text-xs" compact /> : (totalInv > 0 ? <PriceDisplay value={totalInv} size="text-xs" compact /> : '')}
                </span>
             </button>
             <button onClick={()=>handleFeatureClick('fomo', ()=>setModal({type:'fomo', data:null}))} className="bg-orange-900/40 hover:bg-orange-800 border border-orange-600 text-orange-300 p-2 rounded flex flex-col items-center justify-center font-scifi text-sm shadow-[0_0_10px_rgba(234,88,12,0.3)]"><Factory className="mb-1" size={18}/> F.O.M.O. Deck</button>
             <button onClick={()=>handleFeatureClick('travel', ()=>setModal({type:'travel', data:null}))} className="bg-emerald-900/40 hover:bg-emerald-800 border border-emerald-600 text-emerald-300 p-2 rounded flex flex-col items-center justify-center font-scifi text-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]"><Rocket className="mb-1" size={18}/> C.A.T. Deck</button>
             <button onClick={()=>handleFeatureClick('shipping', ()=>setModal({type:'shipping', data:null}))} className="bg-blue-900/40 hover:bg-blue-800 border border-blue-600 text-blue-300 p-2 rounded flex flex-col items-center justify-center font-scifi text-sm shadow-[0_0_10px_rgba(37,99,235,0.3)]"><Truck className="mb-1" size={18}/> Void-Ex Logistics</button>
             <button onClick={()=>handleFeatureClick('comms', ()=>setModal({type:'comms', data:null}))} className="bg-cyan-900/40 hover:bg-cyan-800 border border-cyan-500 text-cyan-300 p-2 rounded flex flex-col items-center justify-center font-scifi text-sm shadow-[0_0_10px_rgba(6,182,212,0.3)]"><Radio className="mb-1" size={18}/> G.I.G.O. Panel</button>
          </div>
       </div>

       {/* MARKET WINDOW */}
       <div className="card rounded-xl p-0 h-[58vh] flex flex-col bg-gray-900">
          <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-900 sticky top-0 z-20">
             <h2 className="font-scifi text-blue-500 text-2xl w-1/3 text-left">{VENUES[state.currentVenueIndex]} Market</h2>
             <div className={`text-2xl font-scifi font-bold w-1/3 text-center flex justify-center items-center ${state.cash >= 0 ? 'text-green-500' : 'text-red-500'}`}>Capital: <PriceDisplay value={state.cash} size="text-2xl ml-2" /></div>
             <span className="text-yellow-400 text-xl font-bold font-mono w-1/3 text-right">Cargo Hold Capacity: {Math.round(state.cargoWeight)}/{state.cargoCapacity} T</span>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-grow p-2">
             <table className="w-full border-collapse">
                <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10 text-base">
                   <tr>
                      <th className="p-2 text-left w-[20%]">Commodity</th>
                      <th className="p-2 text-left hidden md:table-cell w-[20%]">Intel (Contract/Price)</th>
                      <th className="p-2 text-right w-[10%]">Price</th>
                      <th className="p-2 text-center w-[10%]">Stock</th>
                      <th className="p-2 text-center w-[10%]">Owned</th>
                      <th className="p-2 text-center w-[30%]">Action (Buy / Sell)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                   {COMMODITIES.map(c => {
                      const mItem = currentMarket[c.name];
                      const owned = state.cargo[c.name] || {quantity:0, averageCost:0};
                      
                      const activeContract = state.activeContracts.find(con => con.commodity === c.name);
                      const isCovered = activeContract ? isContractCovered(state, activeContract) : false;
                      const availableContract = !activeContract ? state.availableContracts.find(con => con.commodity === c.name) : null;

                      let minP=Infinity, maxP=0, minV='', maxV='';
                      state.markets.forEach((m,i) => {
                         if(m[c.name].price < minP) { minP=m[c.name].price; minV=VENUES[i]; }
                         if(m[c.name].price > maxP) { maxP=m[c.name].price; maxV=VENUES[i]; }
                      });
                      const buyQ = buyQuantities[c.name] || '';
                      const sellQ = sellQuantities[c.name] || '';
                      
                      const h2oPasteMinMult = Math.pow(1.05, state.day);
                      const h2oPasteMaxMult = Math.pow(1.10, state.day);
                      
                      let dMin = Math.round(c.minPrice * phaseMult);
                      let dMax = Math.round(c.maxPrice * phaseMult);
                      
                      if (c.name === H2O_NAME || c.name === NUTRI_PASTE_NAME) {
                          dMin = Math.round(c.minPrice * h2oPasteMinMult);
                          dMax = Math.round(c.maxPrice * h2oPasteMaxMult);
                      }
                      
                      const priceRange = dMax - dMin;
                      const relativePrice = (mItem.price - dMin) / priceRange;
                      let priceColorClass = 'text-yellow-400';
                      if (relativePrice <= 0.33) priceColorClass = 'text-green-400';
                      if (relativePrice >= 0.66) priceColorClass = 'text-red-400';

                      return (
                         <tr key={c.name} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-2">
                               <div className="font-bold text-gray-200 flex items-center text-lg"><span className="mr-2 text-2xl">{c.icon === 'metal-lump' ? '🌑' : c.icon}</span> {c.name}</div>
                               <div className="text-sm text-gray-500 mt-1 flex items-center">{c.unitWeight} T | Range: <PriceDisplay value={dMin} size="text-sm ml-1" compact /> - <PriceDisplay value={dMax} size="text-sm" compact /></div>
                            </td>
                            <td className="p-2 text-sm text-gray-500 hidden md:table-cell align-top pt-3 text-left">
                               {activeContract && !isCovered ? (
                                   <div className="text-yellow-400 font-bold">
                                       ACTIVE CONTRACT: Ship {activeContract.quantity} to {VENUES[activeContract.destinationIndex]}
                                   </div>
                               ) : (
                                   availableContract ? (
                                       <div className="text-blue-400 font-bold">
                                           CONTRACT AVAIL: {availableContract.quantity} → {VENUES[availableContract.destinationIndex]} (<PriceDisplay value={availableContract.reward} size="text-sm" compact/>)
                                       </div>
                                   ) : (
                                       <>
                                           <div className="text-green-400 flex items-center">Low: <PriceDisplay value={minP} size="text-sm mx-1" compact /> @ {minV}</div>
                                           <div className="text-red-400 flex items-center">High: <PriceDisplay value={maxP} size="text-sm mx-1" compact /> @ {maxV}</div>
                                       </>
                                   )
                               )}
                            </td>
                            <td className={`p-2 text-right align-middle`}>
                                <div className={`flex justify-end font-bold text-xl ${priceColorClass}`}>{Math.round(mItem.price).toLocaleString()} <StarCoin size={20} /></div>
                            </td>
                            <td className="p-2 text-center text-gray-400 text-lg align-middle">{mItem.quantity}</td>
                            <td className="p-2 text-center align-middle">
                               {owned.quantity > 0 ? (
                                  <div className="leading-tight flex flex-col items-center">
                                      <div className="text-white font-bold text-lg">{owned.quantity}</div>
                                      <PriceDisplay value={(mItem.price-owned.averageCost)*owned.quantity} colored={true} size="text-sm" compact />
                                  </div>
                               ) : <span className="text-gray-700">-</span>}
                            </td>
                            <td className="p-2 align-middle">
                               <div className="flex flex-col space-y-2">
                                  <div className="flex space-x-1 items-center bg-gray-900/50 p-1 rounded">
                                     <input type="number" min="0" placeholder="Qty" className="w-20 bg-gray-800 text-white text-center rounded border border-gray-600 text-sm p-1.5" value={buyQ} onChange={e=>setBuyQuantities({...buyQuantities, [c.name]: e.target.value})} />
                                     <button onClick={()=>setMaxBuy(c, mItem)} className="w-auto px-4 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded py-1">MAX</button>
                                     <button onClick={()=>handleTrade('buy', c, mItem, owned)} className="w-auto px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded font-bold py-1">BUY</button>
                                  </div>
                                  <div className="flex space-x-1 items-center bg-gray-900/50 p-1 rounded">
                                     <input type="number" min="0" placeholder="Qty" className="w-20 bg-gray-800 text-white text-center rounded border border-gray-600 text-sm p-1.5" value={sellQ} onChange={e=>setSellQuantities({...sellQuantities, [c.name]: e.target.value})} />
                                     <button onClick={()=>setSellQuantities({...sellQuantities, [c.name]: owned.quantity.toString()})} disabled={owned.quantity===0} className="w-auto px-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-sm text-white rounded py-1">ALL</button>
                                     <button onClick={()=>handleTrade('sell', c, mItem, owned)} disabled={owned.quantity===0} className="w-auto px-4 bg-green-700 hover:bg-green-600 disabled:opacity-30 text-white text-sm rounded font-bold py-1">SELL</button>
                                  </div>
                               </div>
                            </td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
       </div>
       
       {/* MODALS */}
       
       {modal.type === 'shop' && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
             <div className="bg-slate-900 border border-purple-500 p-6 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-2xl font-scifi text-purple-400">Fixathing'u'ma Jig Deck</h2>
                   <button onClick={()=>setModal({type:'none', data:null})} className="text-red-500 font-bold hover:text-red-400"><XCircle /></button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                   <div className="bg-slate-800 p-3 rounded border border-lime-700/50 mb-2">
                      <h3 className="text-lime-400 font-bold mb-2 flex items-center"><Wrench size={16} className="mr-2"/> Dockyard Repairs</h3>
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-gray-300 text-sm">Hull Integrity ({state.shipHealth}%)</span>
                         <div className="w-32">
                             <button onClick={()=>performRepair('full_hull')} className="w-full bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-white text-xs">Repair MAX (<PriceDisplay value={calculateFullRepairCost()} size="text-xs ml-1" />)</button>
                         </div>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-gray-300 text-sm">Laser Status ({state.laserHealth}%)</span>
                         <div className="w-32">
                            <button onClick={()=>performRepair('full_laser')} disabled={!hasLaser(state)} className="w-full bg-lime-700 hover:bg-lime-600 disabled:opacity-50 px-3 py-1 rounded text-white text-xs flex items-center justify-center">Repair MAX (<PriceDisplay value={LASER_REPAIR_COST} size="text-xs ml-1" />)</button>
                         </div>
                      </div>
                   </div>

                   <div className="bg-slate-800 p-3 rounded flex justify-between items-center border border-slate-700">
                      <div>
                          <div className="text-white font-bold flex items-center"><Box size={16} className="mr-2 text-blue-400"/>Cargo Bay Expansion</div>
                          <div className="text-xs text-gray-400">Cost per 100T: <PriceDisplay value={CARGO_UPGRADE_COST} size="text-xs"/> + 1 {MESH_NAME}</div>
                          <div className="text-xs mt-1 text-gray-300">Current: {state.cargoCapacity} T. Max: {getMaxCargo(state.gamePhase)} T.</div>
                      </div>
                      <div className="flex gap-2 items-center">
                          <input type="number" min="1" className="w-16 bg-gray-900 text-white text-center rounded text-sm p-1" value={cargoUpgradeQty} onChange={e=>setCargoUpgradeQty(e.target.value)} />
                          <button onClick={() => {
                              const mesh = state.cargo[MESH_NAME]?.quantity || 0;
                              const cashMax = Math.floor(state.cash / CARGO_UPGRADE_COST);
                              const capMax = (getMaxCargo(state.gamePhase) - state.cargoCapacity) / 100;
                              const maxPossible = Math.floor(Math.min(mesh, cashMax, capMax));
                              setCargoUpgradeQty(maxPossible.toString());
                          }} className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white text-xs">MAX</button>
                          
                          <button onClick={() => {
                              const qty = parseInt(cargoUpgradeQty);
                              if (isNaN(qty) || qty <= 0) return;
                              const cost = qty * CARGO_UPGRADE_COST;
                              const meshReq = qty;
                              const newCap = state.cargoCapacity + (qty * 100);
                              
                              if (newCap > getMaxCargo(state.gamePhase)) return setModal({type:'message', data: "Exceeds Max Capacity."});
                              if (state.cash < cost) return setModal({type:'message', data: "Insufficient Cash."});
                              if ((state.cargo[MESH_NAME]?.quantity||0) < meshReq) return setModal({type:'message', data: `Insufficient ${MESH_NAME}.`});

                              const newC = {...state.cargo};
                              newC[MESH_NAME].quantity = Math.max(0, newC[MESH_NAME].quantity - meshReq);
                              if (newC[MESH_NAME].quantity <= 0) delete newC[MESH_NAME];
                              
                              setState(prev => prev ? ({...prev, cash: prev.cash - cost, cargo: newC, cargoCapacity: newCap, cargoWeight: prev.cargoWeight - (meshReq * 2.5)}) : null);
                              setCargoUpgradeQty('1');
                              log(`UPGRADES: Expanded Cargo Bay by ${qty*100}T.`, 'buy');
                          }} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-white text-xs flex items-center">Expand</button>
                      </div>
                   </div>
                   
                   {SHOP_ITEMS.map(item => {
                      const Icon = getShopIcon(item.id);
                      let locked = false;
                      if(item.id === 'laser_mk2' && !state.equipment['laser_mk1']) locked = true;
                      if(item.id === 'laser_mk3' && !state.equipment['laser_mk2']) locked = true;
                      const canAfford = state.cash >= item.cost;
                      return (
                        <div key={item.id} className={`bg-slate-800 p-3 rounded flex justify-between items-center border border-slate-700 ${locked ? 'opacity-50 grayscale' : (!canAfford ? 'opacity-60' : '')}`}>
                             <div>
                                <div className="text-white font-bold flex items-center"><Icon size={16} className="mr-2 text-purple-400"/> {item.name}</div>
                                <div className="text-xs text-gray-400">{item.description}</div>
                             </div>
                             {locked ? <span className="text-gray-500 text-xs italic">LOCKED (Req. Previous Mk)</span> : 
                               (state.equipment[item.id] ? <span className="text-green-500 text-xs font-bold">OWNED</span> : (
                               <button onClick={()=>buyEquipment(item)} disabled={!canAfford} className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 px-3 py-1 rounded text-white text-xs flex items-center">Buy (<PriceDisplay value={item.cost} size="text-xs ml-1"/>)</button>
                             ))}
                        </div>
                      );
                   })}
                </div>
             </div>
          </div>
       )}

       {modal.type === 'fomo' && (
           <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-orange-500 p-6 rounded-xl max-w-lg w-full">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-scifi text-orange-400">Fabricate Output Management Operations (F.O.M.O.) Engineering Deck</h2>
                      <button onClick={()=>setModal({type:'none', data:null})} className="text-red-500 font-bold hover:text-red-400"><XCircle /></button>
                  </div>
                  
                  {/* MESH Fabrication */}
                  <div className={`bg-slate-800 p-4 rounded border border-orange-900/50 mb-4 ${state.fomoDailyUse.mesh ? 'opacity-50 grayscale' : ''}`}>
                      <h3 className="text-white font-bold mb-2 flex items-center"><Factory className="mr-2 text-orange-400"/>Fabricate: {MESH_NAME}</h3>
                      <p className="text-xs text-gray-400 mb-4">Combine raw materials to create high-value mesh. <br/>Recipe: 1 Titanium Ore + 1 Synthetic Cloth + <PriceDisplay value={2500} size="text-xs"/>.</p>
                      
                      <div className="flex justify-between bg-black/30 p-2 rounded mb-4 text-xs">
                          <span>Ore: {state.cargo['Titanium Ore']?.quantity || 0}</span>
                          <span>Cloth: {state.cargo['Synthetic Cloth']?.quantity || 0}</span>
                          <span>Mesh: {state.cargo[MESH_NAME]?.quantity || 0}</span>
                      </div>

                      <div className="flex gap-2 items-center">
                          <input type="number" min="1" className="flex-1 bg-gray-900 text-white text-center rounded p-2 border border-gray-600" value={fomoQty} onChange={e=>setFomoQty(e.target.value)} disabled={state.fomoDailyUse.mesh}/>
                          <button onClick={() => {
                              const ore = state.cargo['Titanium Ore']?.quantity || 0;
                              const cloth = state.cargo['Synthetic Cloth']?.quantity || 0;
                              const cashMax = Math.floor(state.cash / 2500);
                              setFomoQty(Math.floor(Math.min(ore, cloth, cashMax)).toString());
                          }} disabled={state.fomoDailyUse.mesh} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold">MAX</button>
                      </div>
                      
                      <button onClick={() => {
                          const qty = parseInt(fomoQty);
                          if (!isNaN(qty) && qty > 0) fabricateItem(qty);
                      }} disabled={state.fomoDailyUse.mesh} className="w-full mt-4 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 py-3 rounded text-white font-bold">{state.fomoDailyUse.mesh ? 'Daily Limit Reached' : 'FABRICATE'}</button>
                  </div>

                  {/* STIM-PACKS Fabrication */}
                  <div className={`bg-slate-800 p-4 rounded border border-blue-900/50 ${state.fomoDailyUse.stims ? 'opacity-50 grayscale' : ''}`}>
                      <h3 className="text-white font-bold mb-2 flex items-center"><Pill className="mr-2 text-blue-400"/>Fabricate: Stim-Packs</h3>
                      <p className="text-xs text-gray-400 mb-4">Synthesize medical supplies from survival rations. <br/>Recipe: 2 H2O + 1 Nutri-Paste + <PriceDisplay value={250} size="text-xs"/>.</p>
                      
                      <div className="flex justify-between bg-black/30 p-2 rounded mb-4 text-xs">
                          <span>H2O: {state.cargo[H2O_NAME]?.quantity || 0}</span>
                          <span>Paste: {state.cargo[NUTRI_PASTE_NAME]?.quantity || 0}</span>
                          <span>Stims: {state.cargo['Stim-Packs']?.quantity || 0}</span>
                      </div>

                      <div className="flex gap-2 items-center">
                          <input type="number" min="1" className="flex-1 bg-gray-900 text-white text-center rounded p-2 border border-gray-600" value={fomoStimQty} onChange={e=>setFomoStimQty(e.target.value)} disabled={state.fomoDailyUse.stims}/>
                          <button onClick={() => {
                              const h2o = state.cargo[H2O_NAME]?.quantity || 0;
                              const paste = state.cargo[NUTRI_PASTE_NAME]?.quantity || 0;
                              const cashMax = Math.floor(state.cash / 250);
                              const maxH2O = Math.floor(h2o / 2);
                              setFomoStimQty(Math.floor(Math.min(maxH2O, paste, cashMax)).toString());
                          }} disabled={state.fomoDailyUse.stims} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold">MAX</button>
                      </div>
                      
                      <button onClick={() => {
                          const qty = parseInt(fomoStimQty);
                          if (!isNaN(qty) && qty > 0) fabricateStimPacks(qty);
                      }} disabled={state.fomoDailyUse.stims} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 py-3 rounded text-white font-bold">{state.fomoDailyUse.stims ? 'Daily Limit Reached' : 'FABRICATE'}</button>
                  </div>
              </div>
           </div>
       )}

       {modal.type === 'travel' && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
             <div className="bg-slate-900 border border-emerald-500 p-6 rounded-xl max-w-3xl w-full h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                   <h2 className="text-2xl font-scifi text-emerald-400">Chart and Travel (C.A.T.) Station</h2>
                   <button onClick={()=>setModal({type:'none', data:null})} className="text-red-500 font-bold hover:text-red-400"><XCircle /></button>
                </div>
                <div className="overflow-y-auto space-y-2 flex-grow">
                   {VENUES.map((v, i) => {
                      if (i===state.currentVenueIndex) return (
                         <div key={v} className="bg-emerald-900/30 border border-emerald-500 p-3 rounded flex justify-between items-center">
                            <span className="text-emerald-400 font-bold">{v} (Current)</span>
                            <button onClick={()=>{
                                const s = {...state};
                                s.day++;
                                // claimWarehouse(); REMOVED manual only
                                const report: DailyReport = { events: [], totalHullDamage: 0, totalLaserDamage: 0, fuelUsed: 0, lostItems: {}, gainedItems: {}, insuranceBought: false };
                                processDay(s, report);
                                setState(s);
                                setModal({ type: 'report', data: { events: report.events, day: s.day, tips: getMarketTips(s), quirky: report.quirkyMessage } });
                            }} className="bg-emerald-600 text-white px-4 py-2 rounded text-xs font-bold">STAY (Next Day)</button>
                         </div>
                      );
                      const cost = getFuelCost(state.currentVenueIndex, i);
                      const can = (state.cargo[FUEL_NAME]?.quantity||0)>=cost;
                      const isBanned = state.venueTradeBans[i] && state.venueTradeBans[i] > 0;
                      const riskLevel = cost > 12 ? 'High' : (cost > 6 ? 'Medium' : 'Low');
                      const riskColor = cost > 12 ? 'text-red-500' : (cost > 6 ? 'text-yellow-500' : 'text-green-500');

                      return (
                         <div key={v} className={`bg-slate-800 p-3 rounded flex justify-between items-center hover:bg-slate-700 ${isBanned?'opacity-50 border border-red-500':''}`}>
                            <div>
                                <div className="text-white font-bold">{v} {isBanned && <span className="text-red-500 ml-2">(BANNED: {state.venueTradeBans[i]}d)</span>}</div>
                                <div className="text-xs text-gray-500">Distance: {cost} Fuel | Risk: <span className={riskColor}>{riskLevel}</span></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setModal({type: 'view_intel', data: { idx: i, name: v }})} className="bg-purple-600 hover:bg-purple-500 border border-purple-400 px-3 py-1 rounded text-xs font-bold text-white">Spill the Tea on Market</button>
                                <button disabled={!can} onClick={()=>setModal({type:'travel_confirm', data: {destIndex:i, baseFuelCost:cost, venueName:v, insuranceCost: Math.round(getCargoValue(state.cargo) * 0.05)}})} 
                                className={`px-3 py-1 rounded text-xs font-bold ${can?'bg-blue-600 text-white':'bg-gray-700 text-gray-500'}`}>PLOT JUMP</button>
                            </div>
                         </div>
                      )
                   })}
                </div>
             </div>
          </div>
       )}

       {modal.type === 'view_intel' && (
           <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4">
               <div className="bg-slate-900 border border-blue-400 p-6 rounded-xl max-w-lg w-full h-[60vh] flex flex-col">
                   <h3 className="text-xl font-scifi text-blue-400 mb-4">Market Intel: {modal.data.name}</h3>
                   <div className="overflow-y-auto flex-grow custom-scrollbar">
                       <table className="w-full text-xs text-left">
                           <thead><tr className="text-gray-500 border-b border-gray-700"><th>Item</th><th className="text-right">Price</th><th className="text-right">Stock</th></tr></thead>
                           <tbody>
                               {Object.entries(state.markets[modal.data.idx]).map(([name, item]: [string, any]) => {
                                   const c = COMMODITIES.find(x => x.name === name)!;
                                   const h2oPasteMinMult = Math.pow(1.05, state.day);
                                   const h2oPasteMaxMult = Math.pow(1.10, state.day);
                                   let dMin = Math.round(c.minPrice * phaseMult);
                                   let dMax = Math.round(c.maxPrice * phaseMult);
                                   if (c.name === H2O_NAME || c.name === NUTRI_PASTE_NAME) {
                                       dMin = Math.round(c.minPrice * h2oPasteMinMult);
                                       dMax = Math.round(c.maxPrice * h2oPasteMaxMult);
                                   }
                                   const priceRange = dMax - dMin;
                                   const relativePrice = (item.price - dMin) / priceRange;
                                   let priceColor = 'text-yellow-400';
                                   if (relativePrice <= 0.33) priceColor = 'text-green-400';
                                   if (relativePrice >= 0.66) priceColor = 'text-red-400';
                                   
                                   return (
                                   <tr key={name} className="border-b border-gray-800">
                                       <td className="p-2 text-white">{name}</td>
                                       <td className={`p-2 text-right font-mono font-bold ${priceColor}`}>{Math.round(item.price).toLocaleString()}</td>
                                       <td className="p-2 text-right text-gray-400">{item.quantity}</td>
                                   </tr>
                               )})}
                           </tbody>
                       </table>
                   </div>
                   <button onClick={()=>setModal({type:'travel', data:null})} className="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded text-white font-bold">RETURN TO C.A.T. STATION</button>
               </div>
           </div>
       )}
       
       {modal.type === 'banking' && (
           <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
               <div className="bg-slate-900 border border-yellow-600 p-6 rounded-xl max-w-3xl w-full h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                       <h2 className="text-2xl font-scifi text-yellow-500">Intergalactic Banking And Network Knowledge (I.B.A.N.K.). Hub</h2>
                       <button onClick={()=>setModal({type:'none', data:null})} className="text-red-500 font-bold hover:text-red-400"><XCircle /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-grow overflow-y-auto">
                   <div>
                      <h3 className="text-white font-bold mb-2">Borrowing (Limit: 3 Active)</h3>
                      {state.activeLoans.map((l, i) => (
                         <div key={l.id} className="bg-red-900/30 p-2 rounded mb-2 border border-red-800">
                            <div className="flex justify-between text-red-300 font-bold"><span>{l.firmName}</span><span><PriceDisplay value={l.currentDebt} size="text-sm" /></span></div>
                            <div className="text-xs text-gray-400">Due: {l.daysRemaining} days</div>
                            <button onClick={()=>{
                               if(state.cash<l.currentDebt) return;
                               const newL=[...state.activeLoans]; newL.splice(i,1);
                               setState(prev=>prev?({...prev, cash:prev.cash-l.currentDebt, activeLoans:newL}):null);
                            }} className="w-full bg-red-700 hover:bg-red-600 text-white text-xs py-1 rounded mt-1">Repay</button>
                         </div>
                      ))}
                      <div className="mt-4 border-t border-gray-700 pt-2">
                         <h4 className="text-blue-400 font-bold text-sm">New Loan Offers (Phase {state.gamePhase})</h4>
                         {state.activeLoans.length >= 3 ? (
                             <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm italic text-center mt-2">
                                 Maximum credit utilization reached. Please settle current debt.
                             </div>
                         ) : (
                             state.loanOffers.map((o,i)=>{
                                const alreadyOwe = state.activeLoans.some(l=>l.firmName===o.firmName);
                                const dailyLimitHit = state.loanTakenToday;
                                return (
                                  <div key={i} className={`bg-slate-800 p-2 rounded mb-1 text-sm flex justify-between items-center ${(alreadyOwe || dailyLimitHit) ? 'opacity-40 grayscale' : ''}`}>
                                     <div><div className="text-white font-bold">{o.firmName}</div><div className="text-gray-500 flex items-center"><PriceDisplay value={o.amount} size="text-xs mr-1"/> @ {o.interestRate.toFixed(1)}% (5 Days)</div></div>
                                     <button onClick={()=>{
                                        if(state.activeLoans.length>=3) return;
                                        if(alreadyOwe) return; 
                                        if(state.loanTakenToday) return setModal({type:'message', data:"Loan limit daily reached."});
                                        const loan = {id:Date.now(), firmName:o.firmName, principal:o.amount, currentDebt:o.amount, interestRate:o.interestRate, daysRemaining:5, originalDay:state.day};
                                        setState(prev=>prev?({...prev, cash:prev.cash+o.amount, activeLoans:[...prev.activeLoans, loan], loanTakenToday:true}):null);
                                     }} disabled={alreadyOwe || dailyLimitHit} className="bg-blue-600 disabled:bg-gray-600 text-white px-2 py-1 rounded">Accept</button>
                                  </div>
                                );
                             })
                         )}
                      </div>
                   </div>
                   <div>
                      <h3 className="text-white font-bold mb-2">Investing</h3>
                       {state.investments.length > 0 && (
                           <div className="mb-4 space-y-2">
                               {state.investments.map(inv => (
                                   <div key={inv.id} className="bg-green-900/30 border border-green-600 p-2 rounded flex justify-between items-center text-xs">
                                       <span className="text-green-300">CD Matures in {inv.daysRemaining} days</span>
                                       <span className="font-bold text-white"><PriceDisplay value={inv.maturityValue} size="text-xs"/></span>
                                   </div>
                               ))}
                           </div>
                       )}
                       <div className="bg-slate-800 p-3 rounded border border-slate-700">
                            <h4 className="text-green-400 font-bold mb-2">Term Deposit (CD)</h4>
                            <div className="flex space-x-2 mb-2">
                               <input type="number" id="invest-amount" min="1" placeholder="Amount" className="w-1/2 bg-gray-900 text-white p-1 rounded" />
                               <select id="invest-term" className="w-1/2 bg-gray-900 text-white p-1 rounded">
                                  <option value="1">1 Day (5%)</option>
                                  <option value="2">2 Days (20%)</option>
                                  <option value="3">3 Days (50%)</option>
                               </select>
                            </div>
                            <button onClick={()=>{
                               if(state.activeLoans.length > 0) return setModal({type:'message', data:"Cannot invest while in debt."});
                               const amt = parseInt((document.getElementById('invest-amount') as HTMLInputElement).value);
                               const term = parseInt((document.getElementById('invest-term') as HTMLSelectElement).value);
                               if(isNaN(amt) || amt<=0 || state.cash<amt) return;
                               const rates: any = {1:0.05, 2:0.20, 3:0.50};
                               const rate = rates[term];
                               const mat = Math.floor(amt * (1 + rate));
                               const inv = {id:Date.now(), amount:amt, daysRemaining:term, maturityValue:mat, interestRate:rate};
                               setState(prev=>prev?({...prev, cash:prev.cash-amt, investments:[...prev.investments, inv]}):null);
                            }} className="w-full bg-green-600 hover:bg-green-500 text-white py-1 rounded font-bold">DEPOSIT FUNDS</button>
                       </div>
                   </div>
                </div>
               </div>
           </div>
       )}

       {modal.type === 'comms' && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
             <div className="bg-slate-900 border border-cyan-500 p-6 rounded-xl max-w-2xl w-full h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-2xl font-scifi text-cyan-300">Gigantic Information Generated Output (G.I.G.O.) Panel</h2>
                   <button onClick={()=>setModal({type:'none', data:null})} className="text-red-500 font-bold hover:text-red-400"><XCircle /></button>
                </div>
                <div ref={commsContainerRef} className="overflow-y-auto custom-scrollbar text-xs font-mono space-y-2 flex-grow bg-black p-4 rounded border border-cyan-900">
                   {state.messages.slice().reverse().map(log => (
                      <div key={log.id} className={`border-b border-gray-800 pb-1 ${getLogColorClass(log.type)}`}>{renderLogMessage(log.message)}</div>
                   ))}
                </div>
             </div>
          </div>
       )}

       {modal.type === 'event_encounter' && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
             <div className="bg-red-900/20 border-2 border-red-500 p-6 rounded-xl max-w-md w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]">
                <h2 className="text-3xl font-scifi text-red-500 mb-2">{modal.data.encounter.title}</h2>
                <p className="text-white mb-6 text-lg">{modal.data.encounter.description}</p>
                <div className="space-y-3">
                   {modal.data.encounter.type === 'pirate' && (
                      <button onClick={() => {
                         if (state.equipment['plasma_cannon']) {
                            const rep = modal.data.report; 
                            if(Math.random() < 0.2) {
                                delete state.equipment['plasma_cannon'];
                                rep.events.push("COMBAT: Pirates repelled, but Plasma Cannons destroyed!");
                            } else {
                                rep.events.push("COMBAT: Pirates repelled by Plasma Cannons.");
                            }
                            finalizeJump(modal.data.state, rep, modal.data.destIdx, modal.data.mine, modal.data.overload);
                         } else { setModal({type:'message', data:"Weapons Systems not installed!"}); }
                      }} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded text-white font-bold border border-red-400">ATTACK (Requires Plasma Cannons)</button>
                   )}
                   {(modal.data.encounter.type === 'accident' || modal.data.encounter.type === 'fuel_leak') && (
                      <button onClick={() => {
                         if (state.equipment['shield_gen']) {
                            const rep = modal.data.report; 
                            if(Math.random() < 0.2) {
                                delete state.equipment['shield_gen'];
                                rep.events.push("DEFENSE: Shields absorbed impact, but Generator burned out!");
                            } else {
                                rep.events.push("DEFENSE: Shields absorbed impact.");
                            }
                            finalizeJump(modal.data.state, rep, modal.data.destIdx, modal.data.mine, modal.data.overload);
                         } else { setModal({type:'message', data:"Shield Generator not installed!"}); }
                      }} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded text-white font-bold border border-blue-400">ENGAGE SHIELDS (Requires Generator)</button>
                   )}
                   {modal.data.encounter.type === 'derelict' && (
                       <>
                           <button onClick={() => {
                               const outcome = Math.random();
                               const rep = modal.data.report;
                               if(outcome < 0.5) {
                                   const reward = Math.floor(Math.random() * 5000) + 1000;
                                   modal.data.state.cash += reward;
                                   rep.events.push(`SALVAGE: Found ${formatCurrencyLog(reward)} in crew quarters.`);
                               } else {
                                   const dmg = 15;
                                   modal.data.state.shipHealth -= dmg;
                                   rep.totalHullDamage += dmg;
                                   rep.events.push(`TRAP: Derelict was booby-trapped! -${dmg}% Hull.`);
                               }
                               finalizeJump(modal.data.state, rep, modal.data.destIdx, modal.data.mine, modal.data.overload);
                           }} className="w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded text-white font-bold border border-yellow-400">SEARCH SHIP (Risk/Reward)</button>
                           <button onClick={() => {
                               const rep = modal.data.report; rep.events.push("IGNORE: Derelict left undisturbed.");
                               finalizeJump(modal.data.state, rep, modal.data.destIdx, modal.data.mine, modal.data.overload);
                           }} className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded text-white">LEAVE IT ALONE</button>
                       </>
                   )}
                   {modal.data.encounter.demandAmount && (
                      <button onClick={() => {
                         modal.data.state.cash -= modal.data.encounter.demandAmount;
                         const rep = modal.data.report; rep.events.push(`SURRENDER: Paid ${formatCurrencyLog(modal.data.encounter.demandAmount)} demand.`);
                         finalizeJump(modal.data.state, rep, modal.data.destIdx, modal.data.mine, modal.data.overload);
                      }} className="w-full bg-yellow-700 hover:bg-yellow-600 py-3 rounded text-white font-bold flex justify-center items-center">PAY DEMAND (<PriceDisplay value={modal.data.encounter.demandAmount} size="text-lg ml-2" />)</button>
                   )}
                   {modal.data.encounter.type !== 'derelict' && (
                        <button onClick={() => {
                          const dmg = Math.random() * modal.data.encounter.riskDamage;
                          modal.data.state.shipHealth -= dmg;
                          const rep = modal.data.report;
                          rep.totalHullDamage += dmg;
                          rep.events.push(`EVASION: Sustained -${dmg.toFixed(1)}% Hull Damage while fleeing.`);
                          
                          if(modal.data.encounter.itemLoss) {
                              rep.events.push(`LOSS: ${modal.data.encounter.itemLoss} lost in chaos.`);
                          }
                          if(modal.data.encounter.capacityLoss) {
                              modal.data.state.cargoCapacity = Math.max(INITIAL_CARGO_CAPACITY, modal.data.state.cargoCapacity - modal.data.encounter.capacityLoss);
                              rep.events.push(`STRUCTURAL FAILURE: Cargo Bay Capacity reduced by ${modal.data.encounter.capacityLoss}T.`);
                              // Force jettison handled in handleTravel check or processDay? Actually better here.
                              if(modal.data.state.cargoWeight > modal.data.state.cargoCapacity) {
                                  const excess = modal.data.state.cargoWeight - modal.data.state.cargoCapacity;
                                  rep.events.push(`JETTISON: Forced to dump cargo due to capacity loss.`);
                                  // Simple logic: remove from first item
                                  const keys = Object.keys(modal.data.state.cargo);
                                  if(keys.length > 0) {
                                      const key = keys[0];
                                      modal.data.state.cargo[key].quantity = Math.max(0, modal.data.state.cargo[key].quantity - Math.ceil(excess / COMMODITIES.find(c=>c.name===key)!.unitWeight));
                                      if(modal.data.state.cargo[key].quantity <= 0) delete modal.data.state.cargo[key];
                                  }
                              }
                          }

                          finalizeJump(modal.data.state, rep, modal.data.destIdx, modal.data.mine, modal.data.overload);
                       }} className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded text-white">EMERGENCY ACTION (Risk Damage)</button>
                   )}
                </div>
             </div>
          </div>
       )}

       {modal.type === 'travel_confirm' && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
             <div className="bg-slate-900 border border-blue-400 p-6 rounded-xl max-w-sm w-full">
                <h3 className="text-xl text-blue-400 font-scifi mb-4">Jump Protocol: {modal.data.venueName}</h3>
                
                <div className="space-y-4 mb-6 text-sm text-gray-300">
                   <div className="flex justify-between"><span>Fuel Required:</span><span className="text-white font-bold">{modal.data.baseFuelCost}</span></div>
                   <label className="flex items-center space-x-2 bg-slate-800 p-2 rounded cursor-pointer"><input type="checkbox" id="chk-ins" className="form-checkbox text-yellow-500 rounded" /><span className="flex-grow">Purchase Cargo Insurance</span><span className="text-yellow-500 flex items-center"><PriceDisplay value={modal.data.insuranceCost} size="text-sm" /></span></label>
                   
                   {state.activeLoans.length === 0 && (
                       <label className="flex items-center space-x-2 bg-green-900/20 border border-green-600/50 p-2 rounded cursor-pointer">
                           <input type="checkbox" id="chk-invest" className="form-checkbox text-green-500 rounded" />
                           <span className="flex-grow text-green-300">Invest 95% Capital (1 Day CD)</span>
                           <span className="text-xs text-gray-400">Protect Cash</span>
                       </label>
                   )}

                   {state.equipment['scanner'] && <div className="bg-blue-900/30 p-2 rounded text-xs border border-blue-800 text-center"><span className="text-blue-300 font-bold">SCANNER ANALYSIS</span><br/>Density: Medium | Composition: Mixed</div>}
                   {hasLaser(state) && (
                       <div className="space-y-2">
                           <label className="flex items-center space-x-2 bg-slate-800 p-2 rounded cursor-pointer"><input type="checkbox" id="chk-mine" className="form-checkbox text-red-500 rounded" /><span className="flex-grow">Mining Run (+1 Fuel)</span><Zap size={14} className="text-red-500"/></label>
                           <label className="flex items-center space-x-2 bg-red-900/20 p-2 rounded cursor-pointer border border-red-900/50"><input type="checkbox" id="chk-overload" className="form-checkbox text-red-600 rounded" /><span className="flex-grow text-red-300">Overcharge Laser (2x Yield / Risk)</span><AlertTriangle size={14} className="text-red-500"/></label>
                       </div>
                   )}
                </div>

                <button onClick={() => {
                   const ins = (document.getElementById('chk-ins') as HTMLInputElement).checked;
                   const mine = hasLaser(state) ? (document.getElementById('chk-mine') as HTMLInputElement).checked : false;
                   const overload = hasLaser(state) ? (document.getElementById('chk-overload') as HTMLInputElement).checked : false;
                   const invest95 = state.activeLoans.length === 0 ? (document.getElementById('chk-invest') as HTMLInputElement)?.checked : false;
                   
                   const totalFuel = modal.data.baseFuelCost + (mine ? 1 : 0);
                   
                   if (ins && state.cash < modal.data.insuranceCost) return setModal({type:'message', data:'Insufficient funds for insurance.'});
                   if ((state.cargo[FUEL_NAME]?.quantity||0) < totalFuel) return setModal({type:'message', data:'Insufficient fuel.'});
                   
                   handleTravel(modal.data.destIndex, totalFuel, ins, mine, overload, invest95);
                }} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded text-white font-bold text-lg mb-2">INITIATE JUMP</button>
                <button onClick={()=>setModal({type:'travel', data:null})} className="w-full text-red-500 font-bold hover:text-red-400">ABORT</button>
             </div>
          </div>
       )}

       {modal.type === 'shipping' && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
             <div className="bg-slate-900 border border-blue-400 p-6 rounded-xl max-w-2xl w-full flex flex-col h-[80vh]">
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-4">
                       <h2 className="text-2xl font-scifi text-blue-400"><Truck className="inline mr-2"/>Void-Ex Logistics</h2>
                       <div className="flex space-x-2">
                           <button onClick={()=>setLogisticsTab('contracts')} className={`px-3 py-1 rounded text-sm ${logisticsTab==='contracts'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Contracts</button>
                           <button onClick={()=>setLogisticsTab('shipping')} className={`px-3 py-1 rounded text-sm ${logisticsTab==='shipping'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Private Shipping</button>
                           <button onClick={()=>setLogisticsTab('warehouse')} className={`px-3 py-1 rounded text-sm ${logisticsTab==='warehouse'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Warehouse</button>
                       </div>
                   </div>
                   <button onClick={()=>setModal({type:'none', data:null})} className="text-red-500 font-bold hover:text-red-400"><XCircle /></button>
                </div>

                {shippingSuccessMessage && (
                    <div className="bg-green-900/50 border border-green-500 p-2 text-green-300 text-sm mb-4 rounded flex justify-between items-center">
                        <span>{shippingSuccessMessage}</span>
                        <button onClick={()=>setShippingSuccessMessage(null)} className="text-green-300 hover:text-white"><XCircle size={16}/></button>
                    </div>
                )}
                
                <div className="overflow-y-auto flex-grow custom-scrollbar">
                    {logisticsTab === 'contracts' && (
                       <div className="space-y-4">
                           {state.availableContracts.map(c => (
                               <div key={c.id} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center mb-2">
                                   <div>
                                       <div className="text-white font-bold">{c.firm}</div>
                                       <div className="text-xs text-gray-400">Req: {c.quantity} {c.commodity} -> {VENUES[c.destinationIndex]}</div>
                                   </div>
                                   <div className="text-right">
                                       <div className="text-green-400 font-bold mb-1"><PriceDisplay value={c.reward} size="text-sm"/></div>
                                       <button onClick={()=>acceptContract(c)} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-white text-xs">ACCEPT</button>
                                   </div>
                               </div>
                           ))}
                           {state.activeContracts.map(c => {
                               const isCovered = isContractCovered(state, c);
                               return (
                               <div key={c.id} className={`bg-gray-900 p-2 rounded mb-2 border border-yellow-800 text-sm ${isCovered ? 'opacity-75 grayscale-0' : ''}`}>
                                   <div className="flex justify-between text-yellow-500 font-bold">
                                       <span>{c.firm}</span>
                                       <span>Dest: {VENUES[c.destinationIndex]}</span>
                                   </div>
                                   <div className="text-gray-400">Deliver: {c.quantity} {c.commodity} | Due: {c.daysRemaining} days</div>
                                   <div className="flex justify-between items-center mt-1">
                                        <div className="text-green-400 text-right">Reward: <PriceDisplay value={c.reward} size="text-sm"/></div>
                                        <button onClick={() => {
                                            if(isCovered) return;
                                            setLogisticsTab('shipping');
                                            // Pre-fill for shipping logic
                                            setShippingSource({[c.commodity]: { type: 'cargo', venueIdx: state.currentVenueIndex }}); // Default to local cargo for fulfillment
                                            setHighlightShippingItem(c.commodity);
                                            setShippingQuantities({ [c.commodity]: c.quantity.toString() });
                                            setTimeout(() => {
                                                const el = document.getElementById(`ship-dest-${c.commodity}`) as HTMLSelectElement;
                                                if(el) {
                                                    el.value = c.destinationIndex.toString();
                                                    setShippingDestinations(prev => ({...prev, [c.commodity]: c.destinationIndex.toString()}));
                                                }
                                            }, 100);
                                        }} disabled={isCovered} className={`${isCovered ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'} px-3 py-1 rounded text-xs`}>
                                            {isCovered ? "FULFILLED PENDING RESOLUTION" : "FULFILL"}
                                        </button>
                                   </div>
                               </div>
                           )})}
                       </div>
                    )}

                   {logisticsTab === 'shipping' && (
                       <div>
                           <h4 className="text-white mb-2 text-sm uppercase tracking-wide">Ship Cargo</h4>
                           <table className="w-full text-xs text-gray-300">
                              <thead><tr className="text-left text-gray-500"><th className="p-2">Item</th><th className="p-2">Stock (Source)</th><th className="p-2">Qty</th><th className="p-2">Dest/Tier</th><th className="p-2">Action</th></tr></thead>
                              <tbody>
                                 {COMMODITIES.map(c => {
                                    // Determine effective stock based on source
                                    // Default source is current local cargo if not specified
                                    const srcInfo = shippingSource[c.name] || { type: 'cargo', venueIdx: state.currentVenueIndex };
                                    
                                    let stock = 0;
                                    let avgCost = 0;
                                    
                                    if (srcInfo.type === 'warehouse') {
                                         const whItem = state.warehouse[srcInfo.venueIdx]?.[c.name];
                                         if (whItem) { stock = whItem.quantity; avgCost = whItem.originalAvgCost; }
                                    } else {
                                         const cargoItem = state.cargo[c.name];
                                         if (cargoItem) { stock = cargoItem.quantity; avgCost = cargoItem.averageCost; }
                                    }

                                    if(stock === 0) return null; 

                                    const shipQ = shippingQuantities[c.name] || '';
                                    const isHighlighted = highlightShippingItem === c.name;
                                    const destStr = shippingDestinations[c.name] || '';
                                    
                                    const qty = parseInt(shipQ || '0');
                                    let costDisplay = 0;
                                    let currentTier = 1;

                                    if (destStr && !isNaN(qty) && qty > 0) {
                                        const dest = parseInt(destStr);
                                        const dist = getFuelCost(srcInfo.venueIdx, dest) / 2; // Distance from SOURCE venue
                                        const baseFee = qty * avgCost * 0.05;
                                        const distFee = dist * 100;
                                        const baseTotal = baseFee + distFee;
                                        
                                        const tierEl = document.getElementById(`ship-tier-${c.name}`) as HTMLSelectElement;
                                        currentTier = tierEl ? parseInt(tierEl.value) : 1;
                                        
                                        const tierMult = currentTier === 1 ? 2 : (currentTier === 3 ? 0.5 : 1);
                                        costDisplay = Math.ceil(baseTotal * tierMult);
                                    }

                                    return (
                                    <tr key={c.name} className={`border-b border-gray-800 ${isHighlighted ? 'bg-purple-600/50' : ''}`}>
                                       <td className="p-2 font-bold">{c.name} <br/><span className="text-[10px] text-gray-500">{srcInfo.type==='warehouse' ? `(Warehouse: ${VENUES[srcInfo.venueIdx]})` : '(Cargo Hold)'}</span></td>
                                       <td className="p-2">{stock}</td>
                                       <td className="p-2">
                                           <div className="flex space-x-1">
                                               <input type="number" min="0" className="w-16 bg-gray-800 p-1 rounded text-center" value={shipQ} onChange={e=>setShippingQuantities({...shippingQuantities, [c.name]:e.target.value})} />
                                               <button onClick={()=>setShippingQuantities({...shippingQuantities, [c.name]:stock.toString()})} className="px-2 bg-gray-700 hover:bg-gray-600 rounded">MAX</button>
                                           </div>
                                       </td>
                                       <td className="p-2 space-y-1">
                                          <select id={`ship-dest-${c.name}`} className="bg-slate-800 text-white p-1 rounded w-full" onChange={(e) => {
                                              setShippingDestinations(prev => ({...prev, [c.name]: e.target.value}));
                                              setShippingQuantities({...shippingQuantities}); 
                                          }} value={shippingDestinations[c.name] || ''}>
                                             <option value="">Select Destination</option>
                                             {/* Filter out SOURCE venue, not current venue, to allow shipping TO current location from remote */}
                                             {VENUES.map((v,i) => i !== srcInfo.venueIdx && !(state.venueTradeBans[i]>0) && <option key={v} value={i}>{v}</option>)}
                                          </select>
                                          
                                          <select id={`ship-tier-${c.name}`} className="bg-slate-800 text-white p-1 rounded w-full" onChange={() => setShippingQuantities({...shippingQuantities})}>
                                              <option value="1">Priority (1 Day)</option>
                                              <option value="2">Standard (2 Days)</option>
                                              <option value="3">Bulk (3 Days)</option>
                                          </select>

                                          {costDisplay > 0 && (
                                              <div className="mt-1 text-xs font-bold text-yellow-400 bg-black/40 p-1 rounded text-center">
                                                  Cost: <PriceDisplay value={costDisplay} size="text-xs"/>
                                              </div>
                                          )}
                                       </td>
                                       <td className="p-2">
                                          <button onClick={() => {
                                             const qty = parseInt(shippingQuantities[c.name] || '0');
                                             if(isNaN(qty) || qty <= 0 || qty > stock) return setModal({type:'message', data:"Invalid Quantity."});

                                             const destEl = document.getElementById(`ship-dest-${c.name}`) as HTMLSelectElement;
                                             if(!destEl || !destEl.value) return setModal({type:'message', data:"Destination invalid or banned."});
                                             const dest = parseInt(destEl.value);
                                             const tier = parseInt((document.getElementById(`ship-tier-${c.name}`) as HTMLSelectElement).value);
                                             
                                             const dist = getFuelCost(srcInfo.venueIdx, dest) / 2; // Distance from SOURCE
                                             const fuelCost = Math.ceil(dist * (qty/50)); 
                                             
                                             // Fuel is paid from player ship reserves (assumed networked logistics charge)
                                             if((state.cargo[FUEL_NAME]?.quantity||0) < fuelCost) return setModal({type:'message', data:`Not enough fuel in ship reserves to pay fee (${fuelCost}).`});

                                             const baseFee = qty * avgCost * 0.05; 
                                             const distFee = dist * 100; 
                                             const tierMult = tier === 1 ? 2 : (tier === 3 ? 0.5 : 1);
                                             const totalCashCost = Math.ceil((baseFee + distFee) * tierMult);

                                             if (state.cash < totalCashCost) return setModal({type:'message', data:`Cannot afford fee (${formatCurrencyLog(totalCashCost)}).`});
                                             
                                             const newW = { ...state.warehouse };
                                             if (!newW[dest]) newW[dest] = {};
                                             const existing = newW[dest][c.name] || { quantity:0, originalAvgCost:0, arrivalDay:0 };
                                             const totalQ = existing.quantity + qty;
                                             const avg = ((existing.quantity*existing.originalAvgCost) + (qty*avgCost))/totalQ;
                                             const arrivalDay = state.day + tier;
                                             newW[dest][c.name] = { quantity: totalQ, originalAvgCost: avg, arrivalDay };
                                             
                                             let newC = { ...state.cargo };
                                             let newCargoWeight = state.cargoWeight;

                                             if (srcInfo.type === 'cargo') {
                                                 newC[c.name].quantity -= qty;
                                                 if(newC[c.name].quantity <= 0) delete newC[c.name];
                                                 newCargoWeight -= (qty*c.unitWeight);
                                             } else {
                                                 // Source is Warehouse
                                                 if (newW[srcInfo.venueIdx] && newW[srcInfo.venueIdx][c.name]) {
                                                     newW[srcInfo.venueIdx][c.name].quantity -= qty;
                                                     if (newW[srcInfo.venueIdx][c.name].quantity <= 0) delete newW[srcInfo.venueIdx][c.name];
                                                     if (Object.keys(newW[srcInfo.venueIdx]).length === 0) delete newW[srcInfo.venueIdx];
                                                 }
                                             }
                                             
                                             newC[FUEL_NAME].quantity -= fuelCost;
                                             if(newC[FUEL_NAME].quantity<=0) delete newC[FUEL_NAME];
                                             newCargoWeight -= (fuelCost*COMMODITIES.find(z=>z.name===FUEL_NAME)!.unitWeight);
                                             
                                             setState(prev => prev ? ({ ...prev, cash: prev.cash - totalCashCost, cargo: newC, warehouse: newW, cargoWeight: newCargoWeight }) : null);
                                             setShippingQuantities({...shippingQuantities, [c.name]: ''});
                                             setShippingDestinations(prev => { const n = {...prev}; delete n[c.name]; return n; });
                                             setHighlightShippingItem(null); 
                                             setShippingSource(prev => { const n = {...prev}; delete n[c.name]; return n; });
                                             setLogisticsTab('contracts'); 
                                             setShippingSuccessMessage(`Shipment dispatched to ${VENUES[dest]}. Arrival: Day ${arrivalDay}.`);
                                             setTimeout(() => setShippingSuccessMessage(null), 5000); 
                                          }} className="bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-white text-xs w-full">SHIP</button>
                                       </td>
                                    </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                       </div>
                   )}
                   {logisticsTab === 'warehouse' && (
                       <div className="space-y-4">
                           {Object.entries(state.warehouse).map(([venueIdx, items]) => {
                               const idx = parseInt(venueIdx);
                               const isLocal = idx === state.currentVenueIndex;
                               
                               return (
                                   <div key={idx} className="bg-gray-800 p-3 rounded border border-gray-700">
                                       <h4 className="text-white font-bold mb-2 border-b border-gray-600 pb-1 flex justify-between">
                                           <span>{VENUES[idx]} Storage {isLocal ? '(Current Location)' : ''}</span>
                                       </h4>
                                       {Object.entries(items).map(([name, item]) => {
                                           const i = item as WarehouseItem;
                                           const isArrived = i.arrivalDay <= state.day;
                                           const c = COMMODITIES.find(x => x.name === name)!;
                                           const weight = i.quantity * c.unitWeight;
                                           const canClaim = state.cargoWeight + weight <= state.cargoCapacity;
                                           const claimQ = claimQuantities[name] || '';

                                           return (
                                               <div key={name} className="flex justify-between items-center text-xs text-gray-300 mb-2 p-2 bg-black/20 rounded">
                                                   <div>
                                                       <div className="font-bold text-white">{name}</div>
                                                       <div>Qty: {i.quantity} | Avg Cost: <PriceDisplay value={i.originalAvgCost} size="text-xs" compact/></div>
                                                       <div>{isArrived ? <span className="text-red-400">Arrived (Sold to defray storage costs Day {i.arrivalDay+3})</span> : <span className="text-yellow-500">In Transit (Arrives Day {i.arrivalDay})</span>}</div>
                                                   </div>
                                                   <div className="flex gap-2 items-center">
                                                       {isArrived && isLocal && (
                                                           <div className="flex space-x-1">
                                                               <input type="number" min="0" className="w-16 bg-gray-700 text-white text-center rounded p-1" value={claimQ} onChange={e=>setClaimQuantities({...claimQuantities, [name]:e.target.value})} placeholder="Qty"/>
                                                               <button onClick={()=>{
                                                                   const maxByCap = Math.floor((state.cargoCapacity - state.cargoWeight) / c.unitWeight);
                                                                   const max = Math.min(i.quantity, maxByCap);
                                                                   setClaimQuantities({...claimQuantities, [name]:max.toString()});
                                                               }} className="bg-gray-600 px-2 rounded hover:bg-gray-500 text-white">MAX</button>
                                                               <button onClick={() => {
                                                                   const q = parseInt(claimQuantities[name]||'0');
                                                                   if(q>0) claimWarehouseItem(idx, name, q);
                                                               }} className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white font-bold">CLAIM</button>
                                                           </div>
                                                       )}
                                                       {isArrived && (
                                                           <button onClick={()=>forwardWarehouseItem(idx, name)} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-white font-bold">
                                                               FORWARD
                                                           </button>
                                                       )}
                                                   </div>
                                               </div>
                                           );
                                       })}
                                   </div>
                               );
                           })}
                           {Object.keys(state.warehouse).length === 0 && <div className="text-gray-500 italic text-center">No items in remote storage.</div>}
                       </div>
                   )}
                </div>
             </div>
          </div>
       )}
       
       {modal.type === 'report' && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
             <div className="bg-slate-900 border border-emerald-500 p-6 rounded-xl max-w-md w-full">
                <h2 className="text-2xl font-scifi text-emerald-500 mb-4">Daily Report (Day {modal.data.day})</h2>
                {modal.data.quirky && (
                    <div className={`p-2 rounded mb-3 text-sm italic border-l-4 ${['bureaucracy','glitch','chemistry'].includes(modal.data.quirky.theme) ? 'bg-blue-900/30 border-blue-500 text-blue-200' : 'bg-yellow-900/30 border-yellow-500 text-yellow-200'}`}>
                        "{modal.data.quirky.text}"
                    </div>
                )}
                <div className="max-h-60 overflow-y-auto mb-4 space-y-1">
                   {modal.data.events.map((e:string,i:number)=><div key={i} className={`text-base border-b border-gray-800 pb-1 ${getReportEventColorClass(e)}`}>{renderLogMessage(e)}</div>)}
                </div>
                <button onClick={acknowledgeReport} className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-white font-bold">ACKNOWLEDGE</button>
             </div>
          </div>
       )}

       {/* Include goal_achieved and endgame modal logic (similar to prev version but using updated components/styles) */}
       {modal.type === 'goal_achieved' && (
           <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
               <div className="bg-slate-900 border border-yellow-400 p-8 rounded-xl text-center max-w-md w-full">
                   <Trophy size={64} className="mx-auto text-yellow-400 mb-4"/>
                   <h2 className="text-3xl font-scifi text-yellow-400 mb-2">PHASE {modal.data.phase} COMPLETE</h2>
                   <p className="text-gray-300 mb-6">Net Worth Goal Achieved! Expanding market parameters...</p>
                   <button onClick={() => advancePhase(modal.data.state, modal.data.nextPhase, modal.data.report)} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded w-full">PROCEED TO PHASE {modal.data.nextPhase}</button>
               </div>
           </div>
       )}
       
       {modal.type === 'highscores' && (
           <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
               <div className="bg-slate-900 border border-yellow-600 p-6 rounded-xl max-w-md w-full">
                    <h2 className="text-2xl font-scifi text-yellow-500 mb-4 flex items-center"><Trophy className="mr-2"/> GALACTIC LEGENDS</h2>
                    <div className="space-y-2 mb-4">
                        {state.highScores.map((s,i)=>(
                            <div key={i} className="flex justify-between border-b border-gray-800 pb-1 text-sm">
                                <span className="text-white">{i+1}. {s.name}</span>
                                <span className="text-yellow-400 font-mono"><PriceDisplay value={s.score} size="text-sm" compact /></span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={attemptVoluntaryRestart} className="flex-1 bg-red-800 hover:bg-red-700 py-2 rounded text-white font-bold text-xs">RESTART GAME</button>
                        <button onClick={() => {
                             if(confirm("Are you sure? This will end the current simulation.")) {
                                 setState(null); // Effectively clears the game
                                 setTimeout(() => window.location.reload(), 1000); // Simple reload to clear
                             }
                        }} className="flex-1 bg-black border border-red-900 hover:bg-gray-900 py-2 rounded text-red-500 font-bold text-xs flex items-center justify-center"> End life as we know it</button>
                        <button onClick={()=>setModal({type:'none', data:null})} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-white font-bold text-xs">CLOSE</button>
                    </div>
               </div>
           </div>
       )}

       {/* TUTORIAL MODALS */}
       {modal.type === 'tutorial_intro' && (
           <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4">
               <div className="bg-slate-900 border border-cyan-500 p-6 rounded-xl max-w-sm w-full text-center">
                   <HelpCircle size={48} className="mx-auto text-cyan-500 mb-4"/>
                   <h2 className="text-xl font-scifi text-cyan-400 mb-2">Neural Link Detected</h2>
                   <p className="text-gray-300 mb-6 text-sm">Welcome, Captain. Would you like to enable the tactical tutorial overlay?</p>
                   <div className="flex gap-4">
                       <button onClick={() => {
                           setState(prev => prev ? ({...prev, tutorialActive: true}) : null);
                           setModal({type:'none', data:null});
                       }} className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-2 rounded text-white font-bold">ENABLE LINK</button>
                       <button onClick={() => setModal({type:'none', data:null})} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-white">DISABLE</button>
                   </div>
               </div>
           </div>
       )}
       
       {modal.type === 'tutorial_popup' && (
           <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
               <div className="bg-slate-800 border-2 border-cyan-500 p-6 rounded-xl max-w-md w-full relative">
                   <h2 className="text-xl font-scifi text-cyan-400 mb-2">{modal.data.title}</h2>
                   <p className="text-gray-300 mb-4 text-sm">{modal.data.text}</p>
                   {TUTORIAL_QUOTES[modal.data.feature] && (
                       <div className={`p-2 rounded bg-black/30 text-xs italic mb-4 ${TUTORIAL_QUOTES[modal.data.feature].color}`}>
                           "{TUTORIAL_QUOTES[modal.data.feature].text}" <br/> 
                           <span className="opacity-75 block text-right mt-1">- {TUTORIAL_QUOTES[modal.data.feature].author}</span>
                       </div>
                   )}
                   <button onClick={() => {
                       const feat = modal.data.feature;
                       const cb = modal.data.callback;
                       setState(prev => prev ? ({...prev, tutorialFlags: {...prev.tutorialFlags, [feat]: true}}) : null);
                       cb();
                   }} className="w-full bg-cyan-600 hover:bg-cyan-500 py-2 rounded text-white font-bold">PROCEED</button>
               </div>
           </div>
       )}

       {/* End Game Modal */}
       {modal.type === 'endgame' && (
           <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
               <div className="bg-slate-900 border border-red-500 p-8 rounded-xl text-center max-w-md w-full">
                   <Skull size={64} className="mx-auto text-red-500 mb-4"/>
                   <h2 className="text-3xl font-scifi text-red-500 mb-2">GAME OVER</h2>
                   <p className="text-white text-lg mb-2">{modal.data.reason}</p>
                   <p className="text-gray-400 mb-6">Final Net Worth: <PriceDisplay value={modal.data.netWorth} size="text-lg"/></p>
                   
                   {modal.data.isHighScore && (
                       <div className="mb-4">
                           <p className="text-yellow-400 font-bold mb-2">New High Score! Enter Name:</p>
                           <input type="text" className="w-full bg-black border border-yellow-500 text-white p-2 rounded text-center" value={highScoreName} onChange={e=>setHighScoreName(e.target.value)} placeholder="Captain Name" />
                       </div>
                   )}

                   <div className="grid grid-cols-2 gap-4 text-xs text-left bg-black/30 p-4 rounded mb-6">
                       <div>Biggest Win: <PriceDisplay value={modal.data.stats.largestSingleWin} size="text-xs" compact/></div>
                       <div>Biggest Loss: <PriceDisplay value={modal.data.stats.largestSingleLoss} size="text-xs" compact/></div>
                   </div>
                   
                   <button onClick={() => {
                       if (modal.data.isHighScore) {
                            if (highScoreName) saveHighScore(highScoreName, modal.data.netWorth).then(() => initGame(false));
                            else alert("Please enter a name!");
                       } else {
                           initGame(false);
                       }
                   }} className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded w-full">RESTART SIMULATION</button>
               </div>
           </div>
       )}

       {modal.type === 'message' && (
           <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
               <div className="bg-slate-800 border border-gray-500 p-6 rounded-xl max-w-sm w-full text-center">
                   <p className="text-white mb-4">{modal.data}</p>
                   <button onClick={()=>setModal({type:'none', data:null})} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white">OK</button>
               </div>
           </div>
       )}
       
       {modal.type === 'welcome' && (
           <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
               <div className="bg-slate-900 border border-yellow-500 p-8 rounded-xl max-w-md w-full text-center">
                   <h2 className="text-3xl font-scifi text-yellow-500 mb-4">$TAR BUCKS</h2>
                   <p className="text-gray-300 mb-4 text-sm">Welcome, Captain. <br/><br/>
                   Your former business partner has passed, leaving his debts... and his dreams... to you. 
                   We have secured a 5,000 $B loan to cover his final expenses (Widow's Gift). 
                   Your ship is basic. Your laser is offline. The galaxy awaits.</p>
                   <p className="text-blue-400 font-bold mb-6 text-sm">First Priority: Visit the Upgrades Deck to buy a Mining Laser.</p>
                   <button onClick={()=>setModal({type:'none', data:null})} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded w-full">BEGIN JOURNEY</button>
               </div>
           </div>
       )}

    </div>
  );
}
