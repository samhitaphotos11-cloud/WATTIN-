import fs from 'fs';

const ML_BASE = 'https://snoozy-gaslighted-jakobe.ngrok-free.dev';
const ML_HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' };

async function predictRange({ soc, battery_capacity, distance }) {
  const d = await fetch(`${ML_BASE}/energy/predict`, {
    method: 'POST',
    headers: ML_HEADERS,
    body: JSON.stringify({ soc_percent: soc, battery_capacity_kwh: battery_capacity, distance_km: distance }),
  }).then(r => r.json());
  
  const remainingEnergy = (d.energy_available_kwh ?? 0) - (d.energy_needed_kwh ?? 0);
  const arrival_soc = battery_capacity > 0 ? Math.max(0, (remainingEnergy / battery_capacity) * 100) : 0;
    
  return {
    reachable: d.can_reach ?? false,
    arrival_soc: parseFloat(arrival_soc.toFixed(1)),
    remaining_range: parseFloat((d.range_remaining_km ?? 0).toFixed(1)),
    energy_consumed_kwh: parseFloat((d.energy_needed_kwh ?? 0).toFixed(4)),
    charge_status: d.charge_status ?? '',
  };
}

async function predictChargingTime({ arrival_soc, target_soc, battery_capacity, charger_power }) {
  const d = await fetch(`${ML_BASE}/evcs/predict`, {
    method: 'POST',
    headers: ML_HEADERS,
    body: JSON.stringify({ SOC_percent: arrival_soc, target_SOC: target_soc, battery_capacity_kWh: battery_capacity, charger_power_kW: charger_power }),
  }).then(r => r.json());
  
  return {
    charging_time_minutes: parseFloat((d.charging_time_mins ?? 0).toFixed(2)),
  };
}

async function run() {
  const tests = [
    {soc: 10, dist: 20},
    {soc: 20, dist: 40},
    {soc: 30, dist: 60},
    {soc: 40, dist: 80},
    {soc: 60, dist: 100},
    {soc: 80, dist: 120},
  ];
  for (const t of tests) {
    const range = await predictRange({ soc: t.soc, battery_capacity: 60, distance: t.dist });
    const charge = await predictChargingTime({ arrival_soc: t.soc, target_soc: 80, battery_capacity: 60, charger_power: 50 });
    console.log(`TEST SOC=${t.soc} Dist=${t.dist}`);
    console.log(range);
    console.log(charge);
    console.log('---');
  }
}

run();
