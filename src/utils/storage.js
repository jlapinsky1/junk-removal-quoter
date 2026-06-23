const SETTINGS_KEY = 'junkremoval_settings';
const QUOTES_KEY = 'junkremoval_quotes';

export const DEFAULT_SETTINGS = {
  homeBaseAddress: '',
  landfillAddress: '100 Landfill Dr, Jefferson, GA 30549',
  mpg: 15,
  gasPrice: 3.50,
  dumpFee: 25,
  minimumPrice: 150,
  basePrices: {
    'Single item curbside': { min: 150, max: 175, default: 150 },
    'Small curbside pile': { min: 165, max: 200, default: 175 },
    'Couch + small curbside pile': { min: 175, max: 225, default: 195 },
    'Normal small job': { min: 185, max: 250, default: 200 },
    'Quarter truck/trailer': { min: 225, max: 300, default: 275 },
    'Half truck/trailer': { min: 300, max: 450, default: 400 },
    'Three-quarter truck/trailer': { min: 425, max: 575, default: 525 },
    'Full truck/trailer': { min: 500, max: 750, default: 650 },
    'Oversized / custom': { min: 0, max: 0, default: 0 },
  },
  addOnPrices: {
    'Stairs': 50,
    'Heavy item': 50,
    'Appliance': 50,
    'Mattress': 25,
    'Same-day / urgent': 75,
    'Extra labor needed': 100,
    'Long carry': 50,
    'Donation/recycling stop': 50,
  },
  distanceSurcharges: [
    { min: 0, max: 10.0, surcharge: 0 },
    { min: 10.1, max: 20.0, surcharge: 25 },
    { min: 20.1, max: 30.0, surcharge: 50 },
    { min: 30.1, max: 40.0, surcharge: 75 },
    { min: 40.1, max: Infinity, surcharge: 100 },
  ],
  accessModifiers: {
    'Curbside / already outside': 0,
    'Garage / driveway': 0,
    'Inside first floor': 25,
    'Upstairs / basement': 75,
    'Long carry': 50,
    'Difficult access': 75,
  },
  priceSensitivity: {
    winTheJobDiscount: 25,
    protectMarginSmall: 25,
    protectMarginLarge: 50,
  },
};

export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getQuotes() {
  try {
    const stored = localStorage.getItem(QUOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load quotes:', e);
    return [];
  }
}

export function saveQuote(quote) {
  const quotes = getQuotes();
  quotes.unshift({ ...quote, id: Date.now(), createdAt: new Date().toISOString() });
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

export function deleteQuote(id) {
  const quotes = getQuotes().filter(q => q.id !== id);
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}
