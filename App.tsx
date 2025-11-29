import React, { useState, useEffect, useRef } from 'react';
import { 
  COMMODITIES, VENUES, BASE_DISTANCE_MATRIX, LOAN_FIRMS,
  INITIAL_CARGO_CAPACITY, CARGO_UPGRADE_AMOUNT, CARGO_UPGRADE_COST,
  TONS_UNIT, CURRENCY_UNIT, FUEL_NAME, NUTRI_PASTE_NAME, H2O_NAME, POWER_CELL_NAME,
  GOAL_PHASE_1_DAYS, GOAL_PHASE_1_AMOUNT, GOAL_PHASE_2_DAYS, GOAL_PHASE_2_AMOUNT, GOAL_PHASE_3_DAYS, GOAL_OVERTIME_DAYS,
  REPAIR_COST, REPAIR_INCREMENT, MAX_REPAIR_HEALTH, MAX_LOAN_AMOUNT, LOAN_REPAYMENT_DAYS
} from './constants';
import { GameState, Market, LoanOffer, LogEntry, DailyReport, Commodity, HighScore } from './types';

// --- FIREBASE MOCK / SETUP ---
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
  console.log("Firebase not configured, using local storage fallback.");
}

// --- Utils ---

const formatCurrency = (amount: number) => {
  return `${Math.round(amount).toLocaleString('en-US', { minimumFractionDigits: 0 })} ${CURRENCY_UNIT}`;
};

const getFuelCost = (from: number, to: number) => {
  return BASE_DISTANCE_MATRIX[from][to] * 2;
};

// --- App ---

export default function App() {
  // --- State ---
  const [state, setState] = useState<GameState | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<string>('1');
  const [modal, setModal] = useState<{ 
    type: 'none' | 'message' | 'report' | 'travel' | 'endgame' | 'highscores' | 'banking' | 'goal_achieved', 
    data: any 
  }>({ type: 'none', data: null });
  const [highScoreName, setHighScoreName] = useState('');
  
  const commsContainerRef = useRef<HTMLDivElement>(null);

  // --- High Score Logic ---

  const loadHighScores = async () => {
    let scores: HighScore[] = [];
    if (db) {
      try {
        const q = query(collection(db, "highscores"), orderBy("score", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          scores.push(doc.data() as HighScore);
        });
      } catch (e) {
        console.error("Error loading from Firebase", e);
      }
    }
    
    if (scores.length === 0) {
      const local = localStorage.getItem('sbe_highscores');
      if (local) scores = JSON.parse(local);
    }
    
    if (scores.length === 0) {
      scores = [
        { name: "Han S.", score: 5000000000, date: new Date().toLocaleDateString() },
        { name: "Jean-Luc", score: 1000000000, date: new Date().toLocaleDateString() },
        { name: "Ellen R.", score: 500000, date: new Date().toLocaleDateString() }
      ];
    }
    return scores;
  };

  const saveHighScore = async (name: string, score: number) => {
    const newScore: HighScore = { name, score, date: new Date().toLocaleDateString() };
    const currentScores = await loadHighScores();
    const updatedScores = [...currentScores, newScore].sort((a,b) => b.score - a.score).slice(0, 10);
    localStorage.setItem('sbe_highscores', JSON.stringify(updatedScores));

    if (db) {
      try {
        await addDoc(collection(db, "highscores"), newScore);
      } catch (e) {
        console.error("Error saving to Firebase", e);
      }
    }
    return updatedScores;
  };

  // --- Initialization ---

  const initGame = async () => {
    const markets: Market[] = VENUES.map((_, idx) => generateMarket(true, idx === 0));
    
    const initialCargo: Record<string, number> = {
      [NUTRI_PASTE_NAME]: 10,
      [H2O_NAME]: 20,
      [POWER_CELL_NAME]: 25,
      [FUEL_NAME]: 500,
    };
    
    let cargoWeight = 0;
    Object.entries(initialCargo).forEach(([name, qty]) => {
      const c = COMMODITIES.find(com => com.name === name);
      if (c) cargoWeight += qty * c.unitWeight;
    });

    const scores = await loadHighScores();
    const startIdx = Math.floor(Math.random() * VENUES.length);
    markets[startIdx] = generateMarket(true, true);

    const initialState: GameState = {
      day: 1,
      cash: 10000,
      currentVenueIndex: startIdx,
      cargo: initialCargo,
      cargoWeight,
      cargoCapacity: INITIAL_CARGO_CAPACITY,
      markets,
      shipHealth: 100,
      laserHealth: 100,
      activeLoans: [],
      loanOffers: [],
      loanTakenToday: false,
      messages: [],
      gameOver: false,
      gamePhase: 1,
      stats: { largestSingleWin: 0, largestSingleLoss: 0 },
      highScores: scores
    };

    const initialLogs: LogEntry[] = [
      { id: 1, message: `[00:00:00 D1] System Initializing v6.4...`, type: 'info' },
      { id: 2, message: `[00:00:01 D1] Goal Phase 1: Reach ${formatCurrency(GOAL_PHASE_1_AMOUNT)} by Day ${GOAL_PHASE_1_DAYS}.`, type: 'info' }
    ];

    initialState.messages = initialLogs;
    initialState.loanOffers = generateLoanOffers();
    
    setState(initialState);
    
    const tips = getMarketTips(initialState);
    setModal({ type: 'report', data: { 
      events: ["Welcome Commander. Engine systems nominal.", "Market analysis complete. Good luck."],
      day: 1,
      tips: tips
    }});
  };

  useEffect(() => {
    initGame();
  }, []);

  // Fix screen jumping: Only scroll the comms container, not the window
  useEffect(() => {
    if (commsContainerRef.current) {
      commsContainerRef.current.scrollTop = commsContainerRef.current.scrollHeight;
    }
  }, [state?.messages]);

  // --- Logic Helpers ---

  const log = (msg: string, type: LogEntry['type']) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      message: `[${timeStr} D${state?.day}] ${msg}`,
      type
    };
    setState(prev => prev ? ({ ...prev, messages: [...prev.messages, entry] }) : null);
  };

  const generateMarket = (isInitial: boolean, isCurrentLocForDay1: boolean = false): Market => {
    const market: Market = {};
    COMMODITIES.forEach(c => {
      const rarityFactor = 1 - c.rarity;
      const baseStandard = Math.floor(100 + 1000 * rarityFactor);
      
      let quantity = baseStandard;
      if (isCurrentLocForDay1) {
        quantity = Math.floor(baseStandard * (1 + (Math.random() * 0.4 - 0.1)));
      } else {
        const fluctuation = (Math.random() * 1.0) - 0.5;
        quantity = Math.floor(baseStandard * (1 + fluctuation));
      }
      quantity = Math.max(1, quantity);

      const ratio = quantity / baseStandard;
      const midPrice = (c.minPrice + c.maxPrice) / 2;
      let price = midPrice / Math.sqrt(ratio);
      price = price * (0.9 + Math.random() * 0.2); 
      price = Math.round(Math.min(c.maxPrice, Math.max(c.minPrice, price)));

      market[c.name] = { price, quantity, standardQuantity: baseStandard };
    });
    return market;
  };

  const evolveMarkets = (currentMarkets: Market[]): Market[] => {
    return currentMarkets.map(m => {
      const newMarket: Market = {};
      Object.keys(m).forEach(key => {
        const item = m[key];
        const c = COMMODITIES.find(x => x.name === key)!;
        
        const change = (Math.random() * 1.0) - 0.5; 
        let newQty = Math.floor(item.quantity * (1 + change));
        newQty = Math.max(1, newQty);
        
        const ratio = newQty / item.standardQuantity;
        const midPrice = (c.minPrice + c.maxPrice) / 2;
        let price = midPrice / Math.sqrt(ratio);
        price = price * (0.95 + Math.random() * 0.1);
        price = Math.round(Math.min(c.maxPrice, Math.max(c.minPrice, price)));

        newMarket[key] = { price, quantity: newQty, standardQuantity: item.standardQuantity };
      });
      return newMarket;
    });
  };

  const generateLoanOffers = (): LoanOffer[] => {
    return LOAN_FIRMS.map(firm => {
      let amount = Math.floor(Math.random() * (MAX_LOAN_AMOUNT - 5000 + 1) + 5000);
      amount = Math.ceil(amount / 1000) * 1000;
      return {
        firmName: firm.name,
        amount,
        interestRate: firm.baseRate + Math.random() * 5
      };
    });
  };

  const calculateNetWorth = (s: GameState) => {
    const debt = s.activeLoans.reduce((a,b) => a + b.currentDebt, 0);
    const cargoVal = calculateCargoValue(s);
    return s.cash + cargoVal - debt;
  };

  const calculateCargoValue = (s: GameState) => {
    let total = 0;
    const market = s.markets[s.currentVenueIndex];
    Object.entries(s.cargo).forEach(([name, qty]) => {
      total += qty * (market[name]?.price || 0);
    });
    return total;
  };

  // --- Actions ---

  const buy = (commodity: Commodity, marketQty: number, price: number) => {
    if (!state) return;
    
    let qty = 0;
    if (tradeQuantity === 'MAX_BUY') {
      const maxCash = Math.floor(state.cash / price);
      const maxWeight = Math.floor((state.cargoCapacity - state.cargoWeight) / commodity.unitWeight);
      qty = Math.max(0, Math.min(maxCash, maxWeight, marketQty));
    } else if (tradeQuantity === 'MAX_SELL') {
      qty = 0;
    } else {
      qty = parseInt(tradeQuantity);
    }

    if (qty <= 0) return;

    const totalCost = qty * price;
    const totalWeight = qty * commodity.unitWeight;

    if (state.cash < totalCost) {
      setModal({ type: 'message', data: `Insufficient funds (${formatCurrency(totalCost)}) to buy ${qty} units.` });
      return;
    }
    if (marketQty < qty) {
      setModal({ type: 'message', data: `Market only has ${marketQty} units.` });
      return;
    }
    if (state.cargoWeight + totalWeight > state.cargoCapacity) {
      setModal({ type: 'message', data: `Cargo hold full! Capacity: ${state.cargoCapacity}.` });
      return;
    }

    const newMarkets = [...state.markets];
    newMarkets[state.currentVenueIndex][commodity.name].quantity -= qty;

    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        cash: prev.cash - totalCost,
        cargo: { ...prev.cargo, [commodity.name]: (prev.cargo[commodity.name] || 0) + qty },
        cargoWeight: prev.cargoWeight + totalWeight,
        markets: newMarkets,
      };
    });
    log(`BOUGHT ${qty.toLocaleString()} units of ${commodity.name} for ${formatCurrency(totalCost)}.`, 'buy');
  };

  const sell = (commodity: Commodity, ownedQty: number, price: number) => {
    if (!state) return;

    let qty = 0;
    if (tradeQuantity === 'MAX_SELL') {
      qty = ownedQty;
    } else if (tradeQuantity === 'MAX_BUY') {
      qty = 0;
    } else {
      qty = parseInt(tradeQuantity);
    }
    
    qty = Math.min(qty, ownedQty);
    if (qty <= 0) return;

    const totalRevenue = qty * price;
    const totalWeight = qty * commodity.unitWeight;

    const newMarkets = [...state.markets];
    newMarkets[state.currentVenueIndex][commodity.name].quantity += qty;

    setState(prev => {
      if (!prev) return null;
      const newCargo = { ...prev.cargo };
      newCargo[commodity.name] -= qty;
      if (newCargo[commodity.name] <= 0) delete newCargo[commodity.name];

      const newStats = { ...prev.stats };
      if (totalRevenue > newStats.largestSingleWin) newStats.largestSingleWin = totalRevenue;

      return {
        ...prev,
        cash: prev.cash + totalRevenue,
        cargo: newCargo,
        cargoWeight: prev.cargoWeight - totalWeight,
        markets: newMarkets,
        stats: newStats
      };
    });
    log(`SOLD ${qty.toLocaleString()} units of ${commodity.name} for ${formatCurrency(totalRevenue)}.`, 'sell');
  };

  const repair = (type: 'hull' | 'laser') => {
    if (!state) return;
    if (state.cash < REPAIR_COST) {
      setModal({ type: 'message', data: `Insufficient funds to repair.` });
      return;
    }
    
    // Laser cap is 100%, Hull is MAX_REPAIR_HEALTH (150%)
    const maxHealth = type === 'hull' ? MAX_REPAIR_HEALTH : 100;
    const currentHealth = type === 'hull' ? state.shipHealth : state.laserHealth;
    
    if (currentHealth >= maxHealth) {
      setModal({ type: 'message', data: `System at max efficiency (${maxHealth}%).` });
      return;
    }
    
    setState(prev => prev ? ({
      ...prev,
      cash: prev.cash - REPAIR_COST,
      shipHealth: type === 'hull' ? Math.min(MAX_REPAIR_HEALTH, prev.shipHealth + REPAIR_INCREMENT) : prev.shipHealth,
      laserHealth: type === 'laser' ? Math.min(100, prev.laserHealth + REPAIR_INCREMENT) : prev.laserHealth,
    }) : null);
    log(`${type === 'hull' ? 'Hull' : 'Laser'} repaired.`, 'repair');
  };

  const upgradeCargo = () => {
    if (!state) return;
    if (state.cash < CARGO_UPGRADE_COST) {
      setModal({ type: 'message', data: `Need ${formatCurrency(CARGO_UPGRADE_COST)} for upgrade.` });
      return;
    }
    setState(prev => prev ? ({
      ...prev,
      cash: prev.cash - CARGO_UPGRADE_COST,
      cargoCapacity: prev.cargoCapacity + CARGO_UPGRADE_AMOUNT
    }) : null);
    log(`SHIP UPGRADE: Cargo hold expanded to ${state.cargoCapacity + CARGO_UPGRADE_AMOUNT}${TONS_UNIT}.`, 'buy');
  };

  const takeLoan = (offerIndex: number) => {
    if (!state) return;
    const offer = state.loanOffers[offerIndex];
    
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        activeLoans: [...prev.activeLoans, {
          id: Date.now(),
          firmName: offer.firmName,
          principal: offer.amount,
          currentDebt: offer.amount,
          interestRate: offer.interestRate,
          daysRemaining: LOAN_REPAYMENT_DAYS,
          originalDay: prev.day
        }],
        cash: prev.cash + offer.amount,
        loanTakenToday: true
      };
    });
    log(`LOAN TAKEN: ${formatCurrency(offer.amount)} from ${offer.firmName}.`, 'danger');
  };

  const repayLoan = (index: number) => {
    if (!state) return;
    const loan = state.activeLoans[index];
    if (state.cash < loan.currentDebt) {
      setModal({ type: 'message', data: `Insufficient funds.` });
      return;
    }
    setState(prev => {
      if (!prev) return null;
      const newLoans = [...prev.activeLoans];
      newLoans.splice(index, 1);
      return { ...prev, cash: prev.cash - loan.currentDebt, activeLoans: newLoans };
    });
    log(`LOAN REPAID: ${formatCurrency(loan.currentDebt)}.`, 'buy');
  };

  // --- Turn Processing ---

  const processDayStart = (newState: GameState, report: DailyReport) => {
    let cash = newState.cash;
    const loansToKeep = [];

    newState.activeLoans.forEach(loan => {
      loan.daysRemaining--;
      const dailyInterest = Math.round(loan.currentDebt * (loan.interestRate / 100) / 100);
      loan.currentDebt += dailyInterest;

      if (loan.daysRemaining <= 0) {
        const fine = loan.principal * 0.1;
        cash -= fine;
        report.events.push(`DEFAULT: ${loan.firmName} penalty ${formatCurrency(fine)}.`);
        log(`DEBT PENALTY: ${formatCurrency(fine)}.`, 'danger');
      }
      loansToKeep.push(loan);
    });

    newState.activeLoans = loansToKeep;
    newState.cash = cash;

    newState.markets = evolveMarkets(newState.markets);
    newState.loanOffers = generateLoanOffers();
    newState.loanTakenToday = false;
  };

  const handleStay = () => {
    if (!state) return;
    const food = state.cargo[NUTRI_PASTE_NAME] || 0;
    const water = state.cargo[H2O_NAME] || 0;

    if (food < 1 || water < 2) {
      setModal({ type: 'message', data: `Missing supplies: 1 ${NUTRI_PASTE_NAME} & 2 ${H2O_NAME}.` });
      return;
    }

    const nextState = { ...state };
    const report: DailyReport = { events: [], totalHullDamage: 0, totalLaserDamage: 0, fuelUsed: 0, lostItems: {}, gainedItems: {}, insuranceBought: false };

    nextState.cargo[NUTRI_PASTE_NAME] -= 1;
    nextState.cargo[H2O_NAME] -= 2;
    if (nextState.cargo[NUTRI_PASTE_NAME] <= 0) delete nextState.cargo[NUTRI_PASTE_NAME];
    if (nextState.cargo[H2O_NAME] <= 0) delete nextState.cargo[H2O_NAME];
    
    const foodW = COMMODITIES.find(c => c.name === NUTRI_PASTE_NAME)?.unitWeight || 0;
    const waterW = COMMODITIES.find(c => c.name === H2O_NAME)?.unitWeight || 0;
    nextState.cargoWeight -= (foodW + 2 * waterW);

    nextState.day += 1;
    processDayStart(nextState, report);

    log(`DAY ${nextState.day}: Docked at ${VENUES[nextState.currentVenueIndex]}.`, 'jump');
    if (report.events.length === 0) report.events.push("Systems nominal.");

    const tips = getMarketTips(nextState);
    tips.forEach(t => log(`INTEL: ${t.text}`, t.type === 'buy' ? 'info' : 'buy'));

    checkGoalsAndGameEnd(nextState);
    
    if (!nextState.gameOver) {
       // Only show daily report if we didn't just trigger a goal achievement popup
       if (modal.type !== 'goal_achieved') {
          setModal({ type: 'report', data: { events: report.events, day: nextState.day, tips } });
       }
       setState(nextState);
    } else {
       setState(nextState);
    }
  };

  const performJump = (destIndex: number, finalFuelCost: number, buyInsurance: boolean, attemptMining: boolean, insuranceCost: number) => {
    if (!state) return;
    const nextState = { ...state };
    const report: DailyReport = { events: [], totalHullDamage: 0, totalLaserDamage: 0, fuelUsed: finalFuelCost, lostItems: {}, gainedItems: {}, insuranceBought: buyInsurance };
    
    if (buyInsurance) {
      nextState.cash -= insuranceCost;
      report.events.push(`INSURANCE: ${formatCurrency(insuranceCost)} paid.`);
    }

    const fuelData = COMMODITIES.find(c => c.name === FUEL_NAME)!;
    nextState.cargo[FUEL_NAME] -= finalFuelCost;
    nextState.cargoWeight -= finalFuelCost * fuelData.unitWeight;
    if (nextState.cargo[FUEL_NAME] <= 0) delete nextState.cargo[FUEL_NAME];
    
    log(`JUMP: ${finalFuelCost} Fuel to ${VENUES[destIndex]}.`, 'info');

    if (attemptMining) {
      log("MINING: Scanning asteroid belt...", 'danger');
      let powerCells = nextState.cargo[POWER_CELL_NAME] || 0;
      const numFields = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < numFields; i++) {
        if (powerCells <= 0 || nextState.laserHealth <= 0) break;
        const roll = Math.floor(Math.random() * 5) + 1; 
        
        if (roll === 1) { 
           const dmg = Math.random() * 5;
           nextState.shipHealth = Math.max(0, nextState.shipHealth - dmg);
           report.totalHullDamage += dmg;
           log(`HIT: Hull -${dmg.toFixed(1)}%.`, 'danger');
           if (!buyInsurance && Math.random() > 0.5) { 
             const valuables = COMMODITIES.filter(c => nextState.cargo[c.name]);
             if (valuables.length > 0) {
               const victim = valuables[Math.floor(Math.random() * valuables.length)];
               const lost = Math.ceil(nextState.cargo[victim.name] * 0.1); 
               nextState.cargo[victim.name] -= lost;
               nextState.cargoWeight -= lost * victim.unitWeight;
               if (nextState.cargo[victim.name] <= 0) delete nextState.cargo[victim.name];
               report.lostItems[victim.name] = (report.lostItems[victim.name] || 0) + lost;
             }
           }
        } else if (roll !== 5) { 
           const mineType = roll === 2 ? "Titanium Ore" : (roll === 3 ? "Antimatter Rod" : "Dark Matter");
           nextState.cargo[POWER_CELL_NAME] -= 1;
           nextState.cargoWeight -= COMMODITIES.find(c=>c.name===POWER_CELL_NAME)!.unitWeight;
           if (nextState.cargo[POWER_CELL_NAME] <= 0) delete nextState.cargo[POWER_CELL_NAME];
           powerCells--;

           let units = roll === 2 ? 25 : (roll === 3 ? 10 : 5);
           units = Math.floor(units * (0.8 + Math.random() * 0.4)); 
           
           const item = COMMODITIES.find(c => c.name === mineType)!;
           const maxAdd = Math.floor((nextState.cargoCapacity - nextState.cargoWeight) / item.unitWeight);
           const actualAdd = Math.min(units, maxAdd);
           
           if (actualAdd > 0) {
             nextState.cargo[mineType] = (nextState.cargo[mineType] || 0) + actualAdd;
             nextState.cargoWeight += actualAdd * item.unitWeight;
             report.gainedItems[mineType] = (report.gainedItems[mineType] || 0) + actualAdd;
             log(`MINED: ${actualAdd} ${mineType}.`, 'buy');
           }
        }
      }
    }

    nextState.day += 1;
    nextState.currentVenueIndex = destIndex;
    
    processDayStart(nextState, report);

    if (report.totalHullDamage > 0) report.events.push(`DAMAGE: Hull -${report.totalHullDamage.toFixed(1)}%.`);
    Object.keys(report.gainedItems).forEach(k => report.events.push(`OBTAINED: ${report.gainedItems[k]} ${k}.`));

    const tips = getMarketTips(nextState);
    tips.forEach(t => log(`INTEL: ${t.text}`, t.type === 'buy' ? 'info' : 'buy'));

    checkGoalsAndGameEnd(nextState);

    if (!nextState.gameOver) {
      if (modal.type !== 'goal_achieved') {
        setModal({ type: 'report', data: { events: report.events, day: nextState.day, tips } });
      }
      setState(nextState);
    } else {
      setState(nextState);
    }
  };

  const checkGoalsAndGameEnd = (s: GameState) => {
    const netWorth = calculateNetWorth(s);

    if (s.gamePhase === 1) {
      if (s.day > GOAL_PHASE_1_DAYS) {
        if (netWorth >= GOAL_PHASE_1_AMOUNT) {
          s.gamePhase = 2;
          s.messages.push({id:Date.now(), type:'buy', message: `PHASE 1 COMPLETE. New Goal: ${formatCurrency(GOAL_PHASE_2_AMOUNT)}`});
          setModal({ type: 'goal_achieved', data: { title: "PHASE 1 COMPLETE", message: `You have successfully amassed ${formatCurrency(GOAL_PHASE_1_AMOUNT)}. Next Target: ${formatCurrency(GOAL_PHASE_2_AMOUNT)} by Day ${GOAL_PHASE_2_DAYS}.` }});
        } else {
          endGame(s, "Failed to reach Phase 1 goal.");
          return;
        }
      } else if (netWorth >= GOAL_PHASE_1_AMOUNT) {
         s.gamePhase = 2;
         s.messages.push({id:Date.now(), type:'buy', message: `PHASE 1 COMPLETE (EARLY).`});
         setModal({ type: 'goal_achieved', data: { title: "PHASE 1 COMPLETE", message: `Target Achieved Early! Next Target: ${formatCurrency(GOAL_PHASE_2_AMOUNT)} by Day ${GOAL_PHASE_2_DAYS}.` }});
      }
    }

    if (s.gamePhase === 2) {
      if (s.day > GOAL_PHASE_2_DAYS) {
        if (netWorth >= GOAL_PHASE_2_AMOUNT) {
          s.gamePhase = 3;
          s.messages.push({id:Date.now(), type:'buy', message: `PHASE 2 COMPLETE. High Score Chase active.`});
          setModal({ type: 'goal_achieved', data: { title: "PHASE 2 COMPLETE", message: `You are a tycoon! Now chase the high score until Day ${GOAL_PHASE_3_DAYS}.` }});
        } else {
          endGame(s, "Failed to reach Phase 2 goal.");
          return;
        }
      } else if (netWorth >= GOAL_PHASE_2_AMOUNT) {
         s.gamePhase = 3;
         s.messages.push({id:Date.now(), type:'buy', message: `PHASE 2 COMPLETE (EARLY).`});
         setModal({ type: 'goal_achieved', data: { title: "PHASE 2 COMPLETE", message: `Target Achieved Early! Chase the high score until Day ${GOAL_PHASE_3_DAYS}.` }});
      }
    }

    if (s.gamePhase === 3 && s.day > GOAL_PHASE_3_DAYS) {
      const threshold = s.highScores.length >= 5 ? s.highScores[4].score : 0;
      if (netWorth > threshold) {
        s.gamePhase = 4;
        s.messages.push({id:Date.now(), type:'buy', message: `ELITE SCORE. Overtime granted.`});
        setModal({ type: 'goal_achieved', data: { title: "OVERTIME GRANTED", message: `Top 5 Score Detected! You have until Day ${GOAL_OVERTIME_DAYS} to maximize your legacy.` }});
      } else {
        endGame(s, "Mission Complete (Day 50).");
      }
    }

    if (s.gamePhase === 4 && s.day > GOAL_OVERTIME_DAYS) {
       endGame(s, "Overtime Complete.");
    }
    
    if (netWorth < -50000) {
      endGame(s, "Bankruptcy declared.");
    }
  };

  const endGame = (s: GameState, reason: string) => {
    s.gameOver = true;
    setModal({ type: 'endgame', data: { reason, netWorth: calculateNetWorth(s), stats: s.stats } });
  };

  const getMarketTips = (s: GameState) => {
    if (!s) return [];
    const tips: { text: string, type: 'buy' | 'sell', score: number }[] = [];
    const currentMarket = s.markets[s.currentVenueIndex];

    COMMODITIES.forEach(c => {
      const currentPrice = currentMarket[c.name].price;
      let globalMin = Infinity;
      let globalMax = 0;
      let maxVenue = '';

      s.markets.forEach((m, idx) => {
        const p = m[c.name].price;
        if (p < globalMin) globalMin = p;
        if (p > globalMax) { globalMax = p; maxVenue = VENUES[idx]; }
      });

      if (currentPrice <= globalMin * 1.1) {
        tips.push({
           type: 'buy',
           text: `BUY ${c.name}: Low price (${formatCurrency(currentPrice)}). Sell at ${maxVenue} for ~${formatCurrency(globalMax)}.`,
           score: globalMax / currentPrice
        });
      }
      
      if (currentPrice >= globalMax * 0.9) {
        tips.push({
          type: 'sell',
          text: `SELL ${c.name}: High price (${formatCurrency(currentPrice)}).`,
          score: currentPrice
        });
      }
    });

    return tips.sort((a,b) => b.score - a.score).slice(0, 3);
  };

  const handleHighScoreSubmit = () => {
    if (!state) return;
    const netWorth = calculateNetWorth(state);
    saveHighScore(highScoreName || "Anonymous", netWorth).then(updated => {
      setState(prev => prev ? ({ ...prev, highScores: updated }) : null);
      setModal({ type: 'highscores', data: null });
    });
  };

  // --- Render ---

  if (!state) return <div className="p-8 text-center text-neon font-scifi">System Initializing...</div>;

  return (
    <div id="app" className="max-w-7xl mx-auto space-y-4 pb-12">
      
      {/* Header */}
      <header className="text-center">
        <h1 className="font-scifi text-3xl md:text-5xl font-bold text-neon mb-1">STAR BUCKS - v6.4</h1>
        <p className="text-gray-400 text-sm">Phase {state.gamePhase} | Goal: {state.gamePhase === 1 ? formatCurrency(GOAL_PHASE_1_AMOUNT) : (state.gamePhase===2 ? formatCurrency(GOAL_PHASE_2_AMOUNT) : "Max Score")}</p>
      </header>

      {/* Status Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-3 rounded-lg text-center bg-emerald-900/50 border-emerald-700">
          <p className={`font-scifi text-2xl ${calculateNetWorth(state) < 0 ? 'text-red-500' : 'text-neon'}`}>{formatCurrency(calculateNetWorth(state))}</p>
          <p className="text-xs text-gray-400">Net Worth</p>
        </div>
        <div className="card p-3 rounded-lg text-center bg-emerald-900/50 border-emerald-700">
          <p className="font-scifi text-2xl text-neon">{state.day}</p>
          <p className="text-xs text-gray-400">Day (Limit: {state.gamePhase < 3 ? (state.gamePhase===1?10:30) : (state.gamePhase===3?50:55)})</p>
        </div>
        <div className="card p-3 rounded-lg text-center bg-emerald-900/50 border-emerald-700">
          <p className="font-scifi text-2xl text-neon">{state.cargoWeight.toFixed(0)}</p>
          <p className="text-xs text-gray-400">Cargo Load</p>
        </div>
        <div className="card p-3 rounded-lg text-center bg-emerald-900/50 border-emerald-700">
          <p className="font-scifi text-2xl text-neon">{(state.cargo[FUEL_NAME]||0).toLocaleString()}</p>
          <p className="text-xs text-gray-400">Fuel Reserves</p>
        </div>
      </div>

      {/* Ship Status Horizontal Bar */}
      <div className="card rounded-lg p-3 flex flex-wrap justify-around items-center gap-4 bg-emerald-950">
          <div className="flex items-center space-x-4">
             <span className="text-gray-400 font-scifi">HULL: <span className={state.shipHealth < 50 ? 'text-red-500' : 'text-green-400'}>{state.shipHealth.toFixed(0)}%</span></span>
             <button onClick={() => repair('hull')} className="bg-lime-800 hover:bg-lime-700 text-xs px-2 py-1 rounded border border-lime-600">Repair ({formatCurrency(REPAIR_COST)})</button>
          </div>
          <div className="flex items-center space-x-4">
             <span className="text-gray-400 font-scifi">LASER: <span className={state.laserHealth < 50 ? 'text-red-500' : 'text-green-400'}>{state.laserHealth.toFixed(0)}%</span></span>
             <button onClick={() => repair('laser')} className="bg-lime-800 hover:bg-lime-700 text-xs px-2 py-1 rounded border border-lime-600">Repair ({formatCurrency(REPAIR_COST)})</button>
          </div>
          <div className="flex items-center space-x-4">
             <span className="text-gray-400 font-scifi">CARGO BAY: {state.cargoCapacity}{TONS_UNIT}</span>
             <button onClick={upgradeCargo} className="bg-blue-800 hover:bg-blue-700 text-xs px-2 py-1 rounded border border-blue-600">
               +50{TONS_UNIT} ({formatCurrency(CARGO_UPGRADE_COST)})
             </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Stack */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Market */}
          <div className="card rounded-xl p-4 h-[75vh] flex flex-col">
            <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-2">
               <h2 className="font-scifi text-xl font-bold text-emerald-500">{VENUES[state.currentVenueIndex]} Market</h2>
               <select value={tradeQuantity} onChange={(e) => setTradeQuantity(e.target.value)} className="bg-slate-800 text-xs p-1 rounded border border-emerald-600">
                  <option value="1">1</option>
                  <option value="10">10</option>
                  <option value="100">100</option>
                  <option value="MAX_BUY">MAX BUY</option>
                  <option value="MAX_SELL">MAX SELL</option>
               </select>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-grow">
              <table className="w-full">
                <thead className="bg-emerald-900 sticky top-0 z-10 text-xs uppercase text-gray-300">
                  <tr>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Stock</th>
                    <th className="p-2 text-center">Trade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {COMMODITIES.map(c => {
                    const mItem = state.markets[state.currentVenueIndex][c.name];
                    const owned = state.cargo[c.name] || 0;
                    return (
                      <tr key={c.name} className="hover:bg-slate-800/50">
                         <td className="p-2">
                           <div className="flex items-center">
                             <span className="text-lg mr-2">{c.icon === 'metal-lump' ? '🌑' : c.icon}</span>
                             <div className="flex flex-col">
                               <span>{c.name}</span>
                               <span className="text-[10px] text-gray-500">{c.unitWeight}{TONS_UNIT}</span>
                             </div>
                           </div>
                           <div className="text-[10px] text-gray-500 mt-1 italic pl-7">Range: {c.minPrice} - {c.maxPrice}</div>
                         </td>
                         <td className={`p-2 text-right font-mono ${(mItem.price > (c.maxPrice+c.minPrice)/2) ? 'text-red-300' : 'text-green-300'}`}>{formatCurrency(mItem.price)}</td>
                         <td className="p-2 text-right text-gray-400">{mItem.quantity}</td>
                         <td className="p-2 text-center">
                           <div className="flex flex-col space-y-1">
                             <button onClick={() => buy(c, mItem.quantity, mItem.price)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-1 rounded">BUY</button>
                             <button onClick={() => sell(c, owned, mItem.price)} disabled={owned===0} className={`text-[10px] px-2 py-1 rounded ${owned>0 ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 text-gray-500'}`}>SELL</button>
                           </div>
                         </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Stack */}
        <div className="lg:col-span-2 space-y-4">
           
           {/* Banking Button */}
           <button onClick={() => setModal({ type: 'banking', data: null })} className="w-full bg-slate-800 hover:bg-slate-700 text-yellow-500 border border-yellow-700 py-3 rounded-lg font-scifi">
             Access Banking Network ({state.activeLoans.length} Loans Active)
           </button>

           {/* Cargo Hold */}
           <div className="card rounded-xl p-4 min-h-[35vh] flex flex-col">
              <h2 className="font-scifi text-xl font-bold text-emerald-500 mb-2 border-b border-gray-600 pb-2">
                Cargo Hold ({state.cargoWeight.toFixed(0)} / {state.cargoCapacity}{TONS_UNIT})
              </h2>
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                 {Object.keys(state.cargo).length === 0 && <p className="text-gray-500 italic text-sm">Empty.</p>}
                 {Object.entries(state.cargo).map(([name, qty]) => {
                   const c = COMMODITIES.find(x => x.name === name)!;
                   return (
                     <div key={name} className="flex justify-between items-center bg-slate-800/80 p-3 rounded border border-slate-700">
                        <span className="text-gray-200 flex items-center font-bold">
                           <span className="mr-3 text-xl">{c.icon === 'metal-lump' ? '🌑' : c.icon}</span> {name}
                        </span>
                        <div className="text-right">
                           <span className="text-neon block text-lg font-mono">{qty.toLocaleString()}</span>
                           <span className="text-gray-500 text-xs">{(qty*c.unitWeight).toFixed(1)}{TONS_UNIT}</span>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>

           {/* Navigation */}
           <div className="card rounded-xl p-4 min-h-[35vh] flex flex-col">
              <h2 className="font-scifi text-xl font-bold text-emerald-500 mb-2 border-b border-gray-600 pb-2">Navigation</h2>
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                {VENUES.map((v, idx) => {
                  if (idx === state.currentVenueIndex) {
                     return (
                      <div key={v} className="flex justify-between items-center bg-emerald-900/40 p-3 rounded border border-emerald-500/50 ring-1 ring-emerald-500">
                        <div>
                          <span className="text-emerald-400 font-bold block">{v} (Current)</span>
                          <span className="text-xs text-gray-400">Stable Orbit</span>
                        </div>
                        <button 
                           onClick={handleStay}
                           className="px-4 py-2 text-sm rounded font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                        >
                           STAY
                        </button>
                      </div>
                     );
                  }

                  const fuelCost = getFuelCost(state.currentVenueIndex, idx);
                  const canTravel = (state.cargo[FUEL_NAME] || 0) >= fuelCost;
                  const risk = Math.max(1, 10 - Math.floor(fuelCost/2)); 
                  
                  return (
                    <div key={v} className="flex justify-between items-center bg-slate-800/80 p-3 rounded border border-slate-700">
                      <div>
                        <span className="text-gray-200 font-bold block">{v}</span>
                        <span className={`text-xs ${risk > 7 ? 'text-red-400' : 'text-green-400'}`}>Threat Level: {risk}/10</span>
                      </div>
                      <div className="flex items-center space-x-2">
                         <span className="text-xs text-gray-500">{fuelCost} Fuel</span>
                         <button 
                           onClick={() => setModal({ type: 'travel', data: { destIndex: idx, baseFuelCost: fuelCost, insuranceCost: Math.round(calculateCargoValue(state)*0.05) }})} 
                           disabled={!canTravel} 
                           className={`px-4 py-2 text-sm rounded font-bold ${canTravel ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg' : 'bg-gray-700 text-gray-500'}`}
                         >
                           JUMP
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </div>
      
      {/* Comms (Moved to bottom) */}
      <div className="card rounded-xl p-4 flex flex-col h-40">
         <h2 className="font-scifi text-sm font-bold text-gray-400 mb-2 border-b border-gray-700">Comms Log</h2>
         <div ref={commsContainerRef} className="overflow-y-auto custom-scrollbar flex-grow space-y-1 font-mono text-[10px]">
           {state.messages.map(msg => (
             <div key={msg.id} className={`log-entry log-${msg.type} border-b border-dotted border-white/5 pb-1`}>{msg.message}</div>
           ))}
         </div>
      </div>

      {/* --- MODALS --- */}

      {/* Goal Achieved */}
      {modal.type === 'goal_achieved' && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
           <div className="bg-slate-900 border-2 border-yellow-400 p-6 rounded-xl max-w-md w-full text-center shadow-2xl shadow-yellow-900/50">
             <h2 className="text-2xl font-scifi text-yellow-400 mb-4">{modal.data.title}</h2>
             <p className="text-lg text-white mb-6 font-medium">{modal.data.message}</p>
             <button onClick={() => setModal({ type: 'none', data: null })} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-8 py-3 rounded">CONTINUE MISSION</button>
           </div>
        </div>
      )}

      {/* Banking Modal */}
      {modal.type === 'banking' && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
           <div className="bg-slate-900 border border-slate-500 p-6 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                 <h2 className="text-2xl font-scifi text-white">Interstellar Banking</h2>
                 <button onClick={() => setModal({ type: 'none', data: null })} className="text-gray-400 hover:text-white">Close [X]</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                 <div>
                    <h3 className="text-yellow-500 font-bold mb-2">Active Loans</h3>
                    {state.activeLoans.length === 0 && <p className="text-gray-500 italic text-sm">No debt. Excellent.</p>}
                    <div className="space-y-2">
                      {state.activeLoans.map((l, i) => (
                        <div key={l.id} className="bg-red-900/20 p-3 rounded text-sm border border-red-800">
                           <div className="flex justify-between text-red-200 font-bold mb-1">
                             <span>{l.firmName}</span> 
                             <span>{formatCurrency(l.currentDebt)}</span>
                           </div>
                           <p className="text-xs text-gray-400 mb-2">Due in {l.daysRemaining} days. Rate: {l.interestRate.toFixed(2)}%</p>
                           <button onClick={()=>repayLoan(i)} disabled={state.cash < l.currentDebt} className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white py-1 rounded">Repay Full Amount</button>
                        </div>
                      ))}
                    </div>
                 </div>
                 
                 <div>
                    <h3 className="text-blue-500 font-bold mb-2">Loan Offers</h3>
                    {state.loanTakenToday ? <p className="text-yellow-600 text-sm">Daily loan limit reached.</p> : (
                      <div className="space-y-2">
                        {state.loanOffers.map((o,i) => (
                           <div key={i} className="bg-slate-800 p-3 rounded text-sm border border-slate-600">
                             <div className="flex justify-between font-bold text-white mb-1">
                               <span>{o.firmName}</span> 
                               <span className="text-neon">{formatCurrency(o.amount)}</span>
                             </div>
                             <p className="text-xs text-gray-400 mb-2">Interest: {o.interestRate.toFixed(2)}% Daily</p>
                             <button onClick={()=>takeLoan(i)} disabled={state.activeLoans.length >= 3} className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 text-white py-1 rounded">Accept Offer</button>
                           </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Generic Message */}
      {modal.type === 'message' && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
           <div className="bg-slate-900 border border-emerald-500 p-6 rounded-xl max-w-sm w-full text-center shadow-2xl shadow-emerald-900/50">
             <p className="text-lg text-white mb-6 font-medium">{modal.data}</p>
             <button onClick={() => setModal({ type: 'none', data: null })} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded">Dismiss</button>
           </div>
        </div>
      )}

      {/* End Game */}
      {modal.type === 'endgame' && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
           <div className="bg-slate-900 border-2 border-red-500 p-8 rounded-xl max-w-md w-full text-center shadow-2xl">
             <h2 className="text-3xl font-scifi text-red-500 mb-2">GAME OVER</h2>
             <p className="text-gray-300 mb-4">{modal.data.reason}</p>
             
             <div className="bg-slate-800 p-4 rounded mb-4 text-left">
                <p className="text-white">Final Net Worth: <span className="float-right text-neon">{formatCurrency(modal.data.netWorth)}</span></p>
                <p className="text-gray-400 text-sm">Best Trade (Win): <span className="float-right text-green-400">{formatCurrency(modal.data.stats.largestSingleWin)}</span></p>
             </div>

             <div className="mb-4">
                <input 
                  type="text" 
                  placeholder="Enter Name for High Score" 
                  className="w-full p-2 rounded bg-slate-700 text-white text-center"
                  value={highScoreName}
                  onChange={e => setHighScoreName(e.target.value)}
                />
             </div>

             <div className="flex space-x-2">
                <button onClick={handleHighScoreSubmit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold">Save Score & Exit</button>
                <button onClick={() => window.location.reload()} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded">Restart</button>
             </div>
           </div>
        </div>
      )}

      {/* High Scores View */}
      {modal.type === 'highscores' && (
         <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-yellow-500 p-6 rounded-xl max-w-md w-full shadow-2xl">
               <h3 className="text-2xl font-scifi text-yellow-500 mb-4 text-center">GALACTIC LEGENDS</h3>
               <div className="space-y-2 mb-6">
                 {state.highScores.map((s, i) => (
                    <div key={i} className={`flex justify-between p-2 rounded ${i===0 ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-slate-800'}`}>
                       <span className="text-white font-bold">{i+1}. {s.name}</span>
                       <span className="text-neon">{formatCurrency(s.score)}</span>
                    </div>
                 ))}
               </div>
               <button onClick={() => window.location.reload()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded font-bold">PLAY AGAIN</button>
            </div>
         </div>
      )}

      {/* Daily Report */}
      {modal.type === 'report' && (
         <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-emerald-500 p-6 rounded-xl max-w-lg w-full shadow-2xl">
               <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                  <h3 className="font-scifi text-2xl text-neon">Day {modal.data.day} Report</h3>
                  <span className="text-xs text-gray-400">Phase {state.gamePhase}</span>
               </div>

               {/* Goal Countdown */}
               <div className="bg-slate-800 p-3 rounded mb-4 text-center border border-blue-900">
                  <p className="text-gray-300 text-sm">Current Goal</p>
                  <p className="text-xl font-bold text-white">
                    {state.gamePhase === 1 ? formatCurrency(GOAL_PHASE_1_AMOUNT) : (state.gamePhase === 2 ? formatCurrency(GOAL_PHASE_2_AMOUNT) : "Max Score")}
                  </p>
                  {state.gamePhase < 3 && (
                    <p className="text-red-400 text-sm mt-1">
                       Deadline: {state.gamePhase === 1 ? GOAL_PHASE_1_DAYS - state.day : GOAL_PHASE_2_DAYS - state.day} days remaining.
                    </p>
                  )}
               </div>
               
               <div className="bg-slate-800/50 p-4 rounded mb-4 max-h-40 overflow-y-auto">
                 {modal.data.events.length === 0 ? <p className="text-gray-500 italic">No significant events.</p> : modal.data.events.map((e: string, i: number) => (
                   <p key={i} className={`text-sm mb-1 ${e.includes('LOSS') || e.includes('DAMAGE') || e.includes('DEFAULT') ? 'text-red-400' : (e.includes('MINED') || e.includes('OBTAINED') ? 'text-blue-300' : 'text-gray-300')}`}>{e}</p>
                 ))}
               </div>
               
               <h4 className="font-scifi text-sm text-yellow-300 mb-2">Market Intelligence</h4>
               <div className="space-y-2 mb-6">
                 {modal.data.tips.length > 0 ? modal.data.tips.map((t: any, i: number) => (
                   <div key={i} className={`text-sm p-2 rounded border ${t.type === 'sell' ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-blue-900/20 border-blue-800 text-blue-300'}`}>
                      {t.text}
                   </div>
                 )) : <p className="text-gray-500 italic text-sm">Market volatility low. No strong signals.</p>}
               </div>
               
               <div className="flex justify-end">
                 <button onClick={() => setModal({ type: 'none', data: null })} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2 rounded font-scifi">ACKNOWLEDGE</button>
               </div>
            </div>
         </div>
      )}

      {/* Travel Confirmation */}
      {modal.type === 'travel' && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
             <TravelModalInner 
                venueName={VENUES[modal.data.destIndex]}
                baseFuelCost={modal.data.baseFuelCost}
                insuranceCost={modal.data.insuranceCost}
                onConfirm={(ins: boolean, mine: boolean) => {
                   setModal({ type: 'none', data: null });
                   performJump(modal.data.destIndex, modal.data.baseFuelCost + (mine?1:0), ins, mine, modal.data.insuranceCost);
                }}
                onCancel={() => setModal({ type: 'none', data: null })}
             />
          </div>
      )}

    </div>
  );
}

function TravelModalInner({ venueName, baseFuelCost, insuranceCost, onConfirm, onCancel }: any) {
  const [ins, setIns] = useState(false);
  const [mine, setMine] = useState(false);
  return (
    <div className="bg-slate-900 border border-emerald-500 p-6 rounded-xl max-w-md w-full shadow-2xl">
        <h3 className="font-scifi text-2xl text-white mb-4">Jump to {venueName}</h3>
        <p className="mb-4 text-gray-300">Fuel Required: <span className="font-bold text-neon">{baseFuelCost + (mine?1:0)}</span></p>
        
        <label className="flex items-center space-x-3 p-3 bg-slate-800 rounded mb-2 cursor-pointer border border-slate-700 hover:border-yellow-500 transition-colors">
           <input type="checkbox" checked={ins} onChange={e => setIns(e.target.checked)} className="accent-yellow-500 w-5 h-5" />
           <div>
             <span className="text-yellow-400 font-bold block">Purchase Insurance</span>
             <span className="text-xs text-gray-400">Cost: {formatCurrency(insuranceCost)} (Protects Cargo)</span>
           </div>
        </label>

        <label className="flex items-center space-x-3 p-3 bg-slate-800 rounded mb-6 cursor-pointer border border-slate-700 hover:border-red-500 transition-colors">
           <input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} className="accent-red-500 w-5 h-5" />
           <div>
             <span className="text-red-400 font-bold block">Attempt Asteroid Mining</span>
             <span className="text-xs text-gray-400">Cost: +1 Fuel. High Risk, High Reward.</span>
           </div>
        </label>

        <div className="flex justify-between space-x-4">
           <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">Cancel</button>
           <button onClick={() => onConfirm(ins, mine)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-bold">ENGAGE</button>
        </div>
    </div>
  )
}