
import { Commodity, EquipmentItem } from './types';

// Updated Initial Capacity
export const INITIAL_CARGO_CAPACITY = 500;
export const BASE_MAX_CARGO_CAPACITY = 5000; // Phase 1 Max
export const CARGO_UPGRADE_AMOUNT = 100;
export const CARGO_UPGRADE_COST = 2000;

export const TONS_UNIT = 'T';
export const CURRENCY_UNIT = '$B'; // Internal logic ref
export const COIN_MARKER = '(C)'; // Marker for replacing with Icon
export const FUEL_NAME = 'Spice Fuel';
export const NUTRI_PASTE_NAME = 'Nutri-Paste';
export const H2O_NAME = 'H2O';
export const POWER_CELL_NAME = 'Power Cell';
export const MESH_NAME = 'Z@onflex Weave Mesh';

// Goals Phases
export const GOAL_PHASE_1_DAYS = 10;
export const GOAL_PHASE_1_AMOUNT = 1000000;
export const GOAL_PHASE_2_DAYS = 30;
export const GOAL_PHASE_2_AMOUNT = 1000000000;
export const GOAL_PHASE_3_DAYS = 50;
export const GOAL_OVERTIME_DAYS = 55;

export const CONTRACT_LIMIT_P1 = 3;
export const CONTRACT_LIMIT_P2 = 5;
export const CONTRACT_LIMIT_P3 = 10;
export const TRADE_BAN_DURATION = 3;

export const REPAIR_COST = 1000;
export const REPAIR_INCREMENT = 5;
export const MAX_REPAIR_HEALTH = 150;
export const LASER_REPAIR_COST = 2000; 

export const LOAN_REPAYMENT_DAYS = 5; 

export const TUTORIAL_QUOTES: Record<string, {text: string, color: string, author: string}> = {
    banking: { text: "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it.", author: "Albert Einstein", color: "text-yellow-400" },
    travel: { text: "Not all those who wander are lost. Some are just looking for better profit margins.", author: "J.R.R. Tolkien (Adapted)", color: "text-emerald-400" },
    shop: { text: "Take my love, take my land, take me where I cannot stand. I don't care, I'm still free, you can't take the sky from me.", author: "Ballad of Serenity", color: "text-purple-400" },
    shipping: { text: "The spice must flow. He who controls the spice controls the universe.", author: "Frank Herbert", color: "text-blue-400" },
    comms: { text: "The single biggest problem in communication is the illusion that it has taken place.", author: "George Bernard Shaw", color: "text-gray-400" },
    fomo: { text: "Industry is the soul of business and the keystone of prosperity.", author: "Charles Dickens", color: "text-orange-400" }
};

const BUREAUCRACY_MESSAGES = [
    "The Galactic Trade Commission just mandated a new anti-grav sticker for all exported Zydium.",
    "Sector 7G's triplicate customs forms caused a 48-hour backlog. Demand is spiking.",
    "Your latest shipment of Chrono-Widgets has been flagged for 'Temporal Irregularity.' Expect delays.",
    "Auditors found one credit misplaced in 2077. The planet's economy is now frozen.",
    "New regulation: All cargo pilots must wear hats. Hat prices surge.",
    "The Dept of Redundancy Dept issued a new form for filling out forms.",
    "Tariffs on 'Things that beep' have tripled due to noise complaints.",
    "Customs officers are on strike. They demand better coffee.",
    "A typo in the tax code just made 'Zero' equal to 'One Million'. Chaos ensues.",
    "License renewal Required: 'Breathing License Class C'.",
    "Bureaucratic Error 404: Economy not found.",
    "Mandatory safety briefing regarding the dangers of paper cuts.",
    "The Emperor's signature stamp was stolen. No laws can be passed today.",
    "Tax Season extended by 6 light years.",
    "The Interstellar Zoning Board rezoned this trade lane as a 'Quiet Zone'."
];

const BIOLOGY_MESSAGES = [
    "The Vlorp Queen sneezed, creating a rush for tissues woven from Nebula Silk.",
    "Market panic: It turns out 'Glarb Oil' is highly addictive to space slugs. Buy low!",
    "A newly discovered species uses common rust as a gourmet spice. Scraps just became gold.",
    "Local stock of 'Antimatter Custard' plummeted after a food critic called it 'too beige.'",
    "Space Whales are migrating. Plankton futures are up.",
    "Warning: Do not pet the fuzzy cargo. It bites.",
    "The slime mold in Sector 4 has achieved sentience and is day-trading.",
    "Alien flu outbreak. Symptoms include turning plaid.",
    "Demand for salt licks increases as the rock-people population booms.",
    "A plant that eats money was found in the cargo hold.",
    "New species discovered: It looks like a potato but screams when peeled.",
    "The Zognoid ambassador is allergic to the color blue. Market adjusting.",
    "Bio-hazard: Someone left a sandwich in the airlock for 3 years.",
    "The sentient moss on Beta-9 is demanding voting rights.",
    "Rare bacteria found that turns lead into slightly heavier lead."
];

const GLITCH_MESSAGES = [
    "The market AI, 'HAL-9001,' decided today is Opposite Day. All sell orders are now buy orders.",
    "A massive teleportation accident swapped all Hyper-Batteries with sentient doorstops.",
    "The automated freighter fleet got distracted by a shiny asteroid. Supply delayed.",
    "The universal calculator rounded down too aggressively. We just got 10% more rich!",
    "Error: Market prices displayed in binary. 01000110!",
    "The navigation buoy is broadcasting disco music. Traffic jammed.",
    "Gravity generator glitch: Everything is now slightly to the left.",
    "The trading algorithm developed a crush on a toaster.",
    "System Update 98% complete... for the last 4 days.",
    "Data corruption: All cargo manifests now read 'Banana'.",
    "The holographic clerks are flickering. Seizure warning.",
    "Time-loop detected. Time-loop detected. Time-loop detected.",
    "The comms array is picking up soap operas from 1985.",
    "Firewall breach. The hackers only stole the virtual cookies.",
    "Robot uprising cancelled due to low battery."
];

const RELIC_MESSAGES = [
    "The original 21st-century 'meme stock' investor guide just resurfaced. Market volatility expected.",
    "Trade routes are jammed—everyone is buying 'Vintage Oxygen' canisters from the third planet.",
    "Demand for 'rubber ducks' has inexplicably gone intergalactic. Time to corner the market.",
    "Fashion trends on Xylar-4 now require neon pink socks. The textile market is exploding.",
    "Archaeologists found a 'Fidget Spinner'. Cults are forming.",
    "A 'Floppy Disk' sold for 1 million credits.",
    "Ancient Earth Artifact 'Nokia 3310' found intact. Used as ship armor.",
    "Collectors paying top dollar for 'Beanie Babies'.",
    "A VHS tape of 'Cats' is being used as a torture device.",
    "The 'Internet' is rumored to be a physical place. Explorers dispatched.",
    "Vintage 'Hoodie' found. Tech CEOs bidding war.",
    "A 'Tamagotchi' survived 1000 years. It still needs feeding.",
    "Plastic straws are now the galaxy's rarest currency.",
    "An ancient 'Meme' has gone viral again.",
    "Twinkies found. Still edible."
];

const CONSPIRACY_MESSAGES = [
    "A reputable source claims all Space-Widgets are hollowed-out containers for spy drones.",
    "They say the price of Iron is tied directly to the emotional state of the Galactic Emperor's cat.",
    "It's not a glitch, it's a feature! The markets are controlled by a shadowy cabal of space squirrels.",
    "The 'Void Diamonds' are actually just compressed space lint. Don't tell anyone.",
    "Birds aren't real. Neither are spaceships.",
    "The moon landing was faked. Which moon? All of them.",
    "Hyperspace is just a loading screen.",
    "The stars are actually giant LEDs.",
    "Oxygen is a hallucinogen. Wake up, sheeple!",
    "The government is putting chemicals in the fuel to make the ships gay.",
    "Area 52 is just a distraction from Area 53.",
    "The universe is a simulation running on Windows 95.",
    "Time travel exists, but it's expensive.",
    "The Lizard People run the banks. Literally, they are lizards.",
    "Red ones don't actually go faster."
];

const CHEMISTRY_MESSAGES = [
    "H2O + CO2 + Sunlight -> Glucose + O2. Photosynthesis units operational.",
    "Warning: CH4 levels critical in Crew Quarters. Stop feeding the pilot beans.",
    "NaCl prices stable. Don't get salty.",
    "C8H10N4O2: The formula for caffeine. Pilot morale improving.",
    "Au (Gold) is conductive, but trading it is electrifying.",
    "He (Helium) shortage. Communications voices pitch increasing.",
    "Fe2O3 detected on hull. Rust never sleeps.",
    "C2H5OH supply critical. The space-bar is running dry.",
    "Ag (Silver) lining found in the nebula cloud.",
    "U235 stock glowing. Geiger counters clicking rhythmically.",
    "O3 layer depletion on Planet X. Sunscreen prices rising.",
    "CO (Carbon Monoxide) leak? I feel sleepy...",
    "Pb (Lead) shielding holding. Radiation nominal.",
    "NH3 (Ammonia) scrubbers requiring maintenance.",
    "H2SO4 rain predicted. Hull polish ruined.",
    "SiO2 (Sand) detected in gears. It's coarse and gets everywhere.",
    "Titanium alloy mix incorrect. Structural integrity questionable.",
    "Antimatter containment magnetic field stable. No boom today.",
    "Dark Matter isn't just a theory, it's sticky.",
    "Zero-G chemistry experiment created a sentient blob."
];

const GENERAL_SCIFI_MESSAGES = [
    "Don't panic.",
    "I've got a bad feeling about this.",
    "Beam me up.",
    "The truth is out there.",
    "In space, no one can hear you scream.",
    "Resistance is futile.",
    "Make it so.",
    "These are not the droids you are looking for.",
    "Live long and prosper.",
    "So long, and thanks for all the fish.",
    "It's a trap!",
    "I am your father's brother's nephew's cousin's former roommate.",
    "Open the pod bay doors, please.",
    "Set phasers to stun.",
    "To infinity and beyond!"
];

export const QUIRKY_MESSAGES_DB = {
    bureaucracy: BUREAUCRACY_MESSAGES,
    biology: BIOLOGY_MESSAGES,
    glitch: GLITCH_MESSAGES,
    relic: RELIC_MESSAGES,
    conspiracy: CONSPIRACY_MESSAGES,
    chemistry: CHEMISTRY_MESSAGES,
    general: GENERAL_SCIFI_MESSAGES
};

export const LOAN_FIRMS = [
  { name: "Starfleet Credit Union", baseRate: 1 },
  { name: "Tyrell Corporation Finance", baseRate: 3 },
  { name: "Weyland-Yutani Trust", baseRate: 5 },
  { name: "The Great Barter Bank", baseRate: 7 },
  { name: "The Hutt Cartel Lending", baseRate: 10 },
];

export const CONTRACT_FIRMS = [
  "Weyland-Yutani Logistics", "Choam Corp", "Federation Supply", "Hutt Smuggling Ring", "Cyberdyne Systems"
];

export const SHOP_ITEMS: EquipmentItem[] = [
  { id: 'laser_mk1', name: 'Mining Laser Mk I', type: 'laser', level: 1, cost: 5000, description: 'Mines Titanium Ore.', owned: false },
  { id: 'laser_mk2', name: 'Mining Laser Mk II', type: 'laser', level: 2, cost: 50000, description: 'Mines Ore + Antimatter. Req Mk I.', owned: false },
  { id: 'laser_mk3', name: 'Mining Laser Mk III', type: 'laser', level: 3, cost: 500000, description: 'Mines Ore, Anti, Dark Matter. Req Mk II.', owned: false },
  { id: 'scanner', name: 'Mineral Scanner', type: 'scanner', level: 1, cost: 10000, description: 'Analyze asteroid density and composition.', owned: false },
  { id: 'plasma_cannon', name: 'Plasma Cannons', type: 'defense', level: 1, cost: 15000, description: 'Deterrent against pirate raids. (Consumable)', owned: false, canBeDamaged: true },
  { id: 'shield_gen', name: 'Deflector Shields', type: 'defense', level: 1, cost: 25000, description: 'Mitigates hull damage. (Consumable)', owned: false, canBeDamaged: true },
];

// SORTED ALPHABETICALLY
export const COMMODITIES: Commodity[] = [
  { name: "Antimatter Rod", icon: "✨", unitWeight: 0.5, minPrice: 2500, maxPrice: 15000, rarity: 0.95 },
  { name: "Dark Matter", icon: "🌌", unitWeight: 0.75, minPrice: 5000, maxPrice: 50000, rarity: 0.98 },
  { name: "G.I.R.L (Lite) Matter", icon: "💥", unitWeight: 0.5, minPrice: 10000, maxPrice: 100000, rarity: 0.99 },
  { name: H2O_NAME, icon: "💧", unitWeight: 1.0, minPrice: 5, maxPrice: 50, rarity: 0.1 },
  { name: "Medical Kits", icon: "🩹", unitWeight: 0.01, minPrice: 400, maxPrice: 4000, rarity: 0.7 },
  { name: NUTRI_PASTE_NAME, icon: "🍲", unitWeight: 0.5, minPrice: 10, maxPrice: 100, rarity: 0.1 },
  { name: "PC Chips", icon: "💾", unitWeight: 0.01, minPrice: 20, maxPrice: 2000, rarity: 0.65 },
  { name: POWER_CELL_NAME, icon: "🔋", unitWeight: 0.1, minPrice: 50, maxPrice: 250, rarity: 0.5 },
  { name: "Spacetime Tea", icon: "☕", unitWeight: 0.1, minPrice: 7, maxPrice: 70000, rarity: 0.5 },
  { name: FUEL_NAME, icon: "⛽", unitWeight: 0.20, minPrice: 10, maxPrice: 150, rarity: 0.2 },
  { name: "Stim-Packs", icon: "💉", unitWeight: 0.25, minPrice: 500, maxPrice: 5000, rarity: 0.85 },
  { name: "Synthetic Cloth", icon: "🧵", unitWeight: 0.25, minPrice: 100, maxPrice: 1000, rarity: 0.6 },
  { name: "Titanium Ore", icon: "metal-lump", unitWeight: 5.0, minPrice: 50, maxPrice: 2500, rarity: 0.8 }, 
  { name: MESH_NAME, icon: "🕸️", unitWeight: 2.5, minPrice: 5000, maxPrice: 25000, rarity: 0.9 },
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
