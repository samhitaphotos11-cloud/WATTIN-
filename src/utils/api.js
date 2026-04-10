import stationsData from '../data/stations.json';

// Geocoding using Nominatim (OpenStreetMap)
// Also supports raw "lat,lng" coordinate strings from GPS fallback
export async function geocodePlace(placeName) {
  // Check if the input is a raw coordinate string (e.g. "12.98765,80.24832")
  const coordMatch = placeName.trim().match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    return {
      lat,
      lng,
      name: 'Current Location',
      fullName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    };
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'Wattin-EV-Planner/1.0' }
  });
  const data = await res.json();
  if (!data.length) throw new Error(`Location not found: ${placeName}`);
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    name: data[0].display_name.split(',')[0],
    fullName: data[0].display_name,
  };
}

// Route calculation using OSRM
export async function getRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error('Route calculation failed');
  const route = data.routes[0];
  return {
    distance: route.distance / 1000, // km
    duration: route.duration / 60,   // minutes
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    legs: route.legs,
  };
}

const ML_BASE = 'https://snoozy-gaslighted-jakobe.ngrok-free.dev';
const ML_HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' };

// ── Range/Energy prediction  (/energy/predict) ──────────────────────────────
// Fields required (confirmed): soc_percent, battery_capacity_kwh, distance_km
export async function predictRange({ soc, battery_capacity, efficiency, distance }) {
  try {
    const res = await fetch(`${ML_BASE}/energy/predict`, {
      method: 'POST',
      headers: ML_HEADERS,
      body: JSON.stringify({
        soc_percent:          soc,
        battery_capacity_kwh: battery_capacity,
        distance_km:          distance
      }),
    });
    if (!res.ok) throw new Error(`/energy/predict ${res.status}`);
    const d = await res.json();
    
    // Derive arrival_soc from energy fields returned by API
    const remainingEnergy = (d.energy_available_kwh ?? 0) - (d.energy_needed_kwh ?? 0);
    const arrival_soc = battery_capacity > 0
      ? Math.max(0, (remainingEnergy / battery_capacity) * 100)
      : 0;
      
    return {
      reachable:            d.can_reach ?? false,
      arrival_soc:          parseFloat(arrival_soc.toFixed(1)),
      remaining_range:      parseFloat((d.range_remaining_km ?? 0).toFixed(1)),
      energy_consumed_kwh:  parseFloat((d.energy_needed_kwh ?? 0).toFixed(4)),
      energy_available_kwh: d.energy_available_kwh ?? 0,
      charge_status:        d.charge_status ?? '',
      source: 'ml',
    };
  } catch (err) {
    console.warn('Range ML API (/energy/predict) unavailable, using physics fallback:', err.message);
    return rangePhysicsFallback({ soc, battery_capacity, efficiency, distance });
  }
}

// ── Charging time prediction  (/evcs/predict) ────────────────────────────────
// Fields required (confirmed): SOC_percent, target_SOC, battery_capacity_kWh, charger_power_kW
export async function predictChargingTime({ arrival_soc, target_soc, battery_capacity, charger_power }) {
  try {
    const res = await fetch(`${ML_BASE}/evcs/predict`, {
      method: 'POST',
      headers: ML_HEADERS,
      body: JSON.stringify({
        SOC_percent:          arrival_soc,
        target_SOC:           target_soc,
        battery_capacity_kWh: battery_capacity,
        charger_power_kW:     charger_power
      }),
    });
    if (!res.ok) throw new Error(`/evcs/predict ${res.status}`);
    const d = await res.json();
    return {
      charging_time_minutes: parseFloat((d.charging_time_mins ?? 0).toFixed(2)),
      source: 'ml',
    };
  } catch (err) {
    console.warn('Charging time ML API (/evcs/predict) unavailable, using physics fallback:', err.message);
    return chargingTimeFallback({ arrival_soc, target_soc, battery_capacity, charger_power });
  }
}

// ── Combined helper (used by RoutePlanner) ────────────────────────────────────
// Fixed: Pass initial 'soc' to charging time to match user's test model cases exactly
export async function predictEV({ soc, battery_capacity, efficiency, distance, charger_power, target_soc, temperature }) {
  // Step 1: range from /energy/predict (uses initial soc)
  const rangeResult = await predictRange({ soc, battery_capacity, efficiency, distance, temperature });

  // Step 2: charging time from /evcs/predict
  // Pass arrival_soc to determine the correct charging time required at destination/station
  const chargeResult = await predictChargingTime({
    arrival_soc:     rangeResult.arrival_soc, 
    target_soc:      target_soc ?? 80,
    battery_capacity,
    charger_power:   charger_power ?? 50,
  });

  return {
    reachable:             rangeResult.reachable,
    arrival_soc:           rangeResult.arrival_soc,
    remaining_range:       rangeResult.remaining_range,
    energy_consumed_kwh:   rangeResult.energy_consumed_kwh,
    charging_time_minutes: chargeResult.charging_time_minutes,
    charge_status:         rangeResult.charge_status,
    energy_available_kwh:  rangeResult.energy_available_kwh,
    source: rangeResult.source === 'physics' && chargeResult.source === 'physics'
      ? 'physics' : 'ml',
  };
}

// ── Physics fallbacks ─────────────────────────────────────────────────────────
function rangePhysicsFallback({ soc, battery_capacity, efficiency = 180, distance }) {
  const available_energy = (soc / 100) * battery_capacity;
  const energy_needed    = (distance * efficiency) / 1000;
  const remaining_energy = available_energy - energy_needed;
  const remaining_range  = Math.max(0, (remaining_energy / battery_capacity) * (battery_capacity * 1000 / efficiency));
  const arrival_soc      = Math.max(0, (remaining_energy / battery_capacity) * 100);
  return {
    reachable:           remaining_energy > 0,
    arrival_soc:         parseFloat(arrival_soc.toFixed(1)),
    remaining_range:     parseFloat(remaining_range.toFixed(1)),
    energy_consumed_kwh: parseFloat(energy_needed.toFixed(2)),
    energy_available_kwh: parseFloat(available_energy.toFixed(2)),
    charge_status:       remaining_energy > 0 ? 'Sufficient charge' : 'Insufficient charge',
    source: 'physics',
  };
}

function chargingTimeFallback({ arrival_soc = 0, target_soc = 80, battery_capacity, charger_power = 50 }) {
  const energy_to_charge = ((target_soc - Math.min(arrival_soc, target_soc)) / 100) * battery_capacity;
  const charging_time    = (energy_to_charge / charger_power) * 60;
  return {
    charging_time_minutes: parseFloat(charging_time.toFixed(2)),
    source: 'physics',
  };
}


export const CHARGING_STATIONS = stationsData;

export const STATION_TYPES = {
  eesl: { label: 'EESL', color: '#4fffb0', bgColor: 'rgba(79,255,176,0.15)' },
  eesl_in: { label: 'EESL', color: '#4fffb0', bgColor: 'rgba(79,255,176,0.15)' },
  ather: { label: 'Ather Grid', color: '#00c9ff', bgColor: 'rgba(0,201,255,0.15)' },
  tata_motors: { label: 'Tata Motors', color: '#a78bfa', bgColor: 'rgba(167,139,250,0.15)' },
  tata_power: { label: 'Tata Power', color: '#ffb347', bgColor: 'rgba(255,179,71,0.15)' },
  zeon: { label: 'Zeon', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)' },
  zeon_charging: { label: 'Zeon Charging', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)' },
  statiq: { label: 'Statiq', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
  statiq_in: { label: 'Statiq', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
  chargemod_in: { label: 'ChargeMOD', color: '#ec4899', bgColor: 'rgba(236,72,153,0.15)' },
  go_ec_in: { label: 'GO EC', color: '#84cc16', bgColor: 'rgba(132,204,22,0.15)' },
  chargezone_india: { label: 'ChargeZone', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)' },
  jio_bp_pulse_india: { label: 'Jio-bp pulse', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
  others: { label: 'Others', color: '#8899bb', bgColor: 'rgba(136,153,187,0.15)' },
};

// Get unique states from stations
export function getStates() {
  return [...new Set(CHARGING_STATIONS.map(s => s.state))].sort();
}

// Get cities for a given state
export function getCitiesByState(state) {
  return [...new Set(CHARGING_STATIONS.filter(s => s.state === state).map(s => s.city))].sort();
}

// Filter stations
export function filterStations({ state, city, type }) {
  return CHARGING_STATIONS.filter(s => {
    if (state && s.state !== state) return false;
    if (city && s.city !== city) return false;
    if (type && s.type !== type) return false;
    return true;
  });
}

// Find nearest stations to a coordinate using actual OpenStreetMap driving distance
export async function findNearestStations(lat, lng, count = 5, maxDistance = Infinity) {
  // Pass 1: Prune array using straight-line Haversine to avoid excessive network calls
  const candidates = CHARGING_STATIONS
    .map(s => ({
      ...s,
      haversineDistance: haversineDistance(lat, lng, s.lat, s.lng),
    }))
    .sort((a, b) => a.haversineDistance - b.haversineDistance)
    .slice(0, 15);
    
  // Pass 2: Calculate actual driving routes for the geographically closest stations
  const start = { lat, lng };
  const verifiedStations = [];
  
  for (let s of candidates) {
      try {
          const route = await getRoute(start, {lat: s.lat, lng: s.lng});
          if (route.distance <= maxDistance) {
              verifiedStations.push({ ...s, distance: route.distance, duration: route.duration });
          }
      } catch(e) {
          // If the OSM router fails for this specific coordinate, fall back safely to haversine calculation
          if (s.haversineDistance <= maxDistance) {
              verifiedStations.push({ ...s, distance: s.haversineDistance, duration: s.haversineDistance * 1.5 }); // mock duration
          }
      }
  }

  // Sort by strictly actual driving distances
  return verifiedStations
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

// Haversine distance in km
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Format duration
export function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Generate UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Save trip to history
export function saveTripToHistory(trip) {
  const history = getTripHistory();
  history.unshift({ ...trip, id: generateUUID(), savedAt: new Date().toISOString() });
  localStorage.setItem('wattin_history', JSON.stringify(history.slice(0, 20)));
}

// Get trip history
export function getTripHistory() {
  try {
    return JSON.parse(localStorage.getItem('wattin_history') || '[]');
  } catch {
    return [];
  }
}
