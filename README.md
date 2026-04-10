# Wattin — EV Route Planner & Charging Intelligence System

A production-grade React frontend for an AI-powered Electric Vehicle route planning and charging management platform.

---

## Features

### Route Planner
- **Place-based input only** — no raw coordinates needed, fully geocoded via Nominatim (OpenStreetMap)
- **Live route visualization** on dark-themed Leaflet map (CARTO dark tiles)
- **Real road routing** via OSRM public API
- **ML backend integration** — calls the FastAPI `/predict` endpoint with automatic physics-based fallback
- **Battery SOC analysis** with animated slider and color-coded status
- **Advanced parameters** — efficiency (Wh/km), temperature, target SOC, charger power
- **Charging station recommendations** auto-shown when destination is unreachable
- **Trip history saved** to localStorage automatically

### Charging Locator
- **27+ charging stations** across India (EESL, Tata Power, Tata Motors, Ather Grid, Zeon, Statiq)
- **Filter by state, city, and network type**
- **Toggle available-only** view
- **Click to focus** on the map with detailed station popup
- **Color-coded markers** per network type

### Trip History
- All planned routes saved automatically
- Card grid with route details, stats, reachability status
- Clear all functionality

### QR Session Manager
- **4-step guided flow**: Book → Entry QR → Charging → Exit QR
- **Entry QR** — UUID-based, time-limited (30 min), contains booking details
- **Exit QR** — energy consumed, cost breakdown, session closure
- **Downloadable QR codes** as PNG
- Real-time battery visualization during charging
- ₹12/kWh billing calculation

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Routing | React Router v6 |
| Maps | Leaflet + React Leaflet |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing API | OSRM |
| ML Backend | FastAPI (Wattin `/predict` endpoint) |
| QR Codes | qrcode.react |
| Icons | Lucide React |
| Styling | CSS Modules |
| State | React hooks + localStorage |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

The app runs on `http://localhost:3000`.

---

## ML Backend

The app connects to:
```
POST https://yasmin-tyrannous-brandi.ngrok-free.dev/predict
```

**Request body:**
```json
{
  "soc": 80,
  "battery_capacity": 75,
  "efficiency": 180,
  "distance": 150,
  "charger_power": 50,
  "target_soc": 80,
  "temperature": 25
}
```

**Response:**
```json
{
  "reachable": true,
  "arrival_soc": 42.5,
  "remaining_range": 180,
  "charging_time_minutes": 45,
  "energy_consumed_kwh": 27.0
}
```

If the ML backend is unavailable, the app falls back to physics-based calculation automatically.

---

## Architecture

```
src/
├── components/
│   ├── Layout.jsx          # Sidebar navigation shell
│   └── Layout.module.css
├── pages/
│   ├── RoutePlanner.jsx    # Main route planning + map
│   ├── RoutePlanner.module.css
│   ├── ChargingLocator.jsx # Station finder + map
│   ├── ChargingLocator.module.css
│   ├── History.jsx         # Past trips
│   ├── History.module.css
│   ├── QRSession.jsx       # Entry/exit QR flow
│   └── QRSession.module.css
├── utils/
│   └── api.js              # Geocoding, routing, ML API, station data
├── styles/
│   └── global.css          # CSS variables, base styles
├── App.js
└── index.js
```

---

## Design System

| Token | Value |
|---|---|
| Primary accent | `#4fffb0` (electric green) |
| Secondary accent | `#00c9ff` (sky blue) |
| Warning | `#ffb347` (amber) |
| Danger | `#ff5f6d` |
| Background base | `#080d1a` |
| Font sans | DM Sans |
| Font mono | Space Mono |
| Font serif | Instrument Serif |
