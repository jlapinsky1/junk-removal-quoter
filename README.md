# Junk Removal Quoter

A mobile-friendly quoting tool for a solo junk removal business. Enter job details, calculate quotes with cost/margin analysis, and present clean customer-facing quotes.

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# (Optional) Add your Google Maps Distance Matrix API key to .env
# Without it, you can manually enter distance to landfill

# Start dev server
npm run dev
```

## Features

- Quote calculator with load size, difficulty, add-ons, and distance surcharges
- Internal view with cost breakdown, margin analysis, and profitability warnings
- Clean customer quote view with copy and print support
- Quote history with duplicate and delete
- Fully configurable settings (prices, surcharges, truck specs, landfill address)
- Mobile-optimized UI
- All data stored in localStorage (no backend needed)

## Google Maps Distance Matrix API (Optional)

To auto-calculate distance from job address to landfill:

1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Distance Matrix API
3. Add `VITE_GOOGLE_MAPS_API_KEY=your_key_here` to `.env`

Without an API key, you can always enter distance manually.

## Build for Production

```bash
npm run build
npm run preview
```

## Deploy to Netlify

1. Push to GitHub (jonathanlapinsky1 account)
2. Connect the repo in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add `VITE_GOOGLE_MAPS_API_KEY` as an environment variable in Netlify if desired
