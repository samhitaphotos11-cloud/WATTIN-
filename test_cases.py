import requests
import json

base_url = "https://snoozy-gaslighted-jakobe.ngrok-free.dev"
headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "1"}

tests = [
    {"soc": 10, "dist": 20},
    {"soc": 20, "dist": 40},
    {"soc": 30, "dist": 60},
    {"soc": 40, "dist": 80},
    {"soc": 60, "dist": 100},
    {"soc": 80, "dist": 120},
]

for t in tests:
    print(f"==================================================")
    print(f"TEST -> SOC={t['soc']}% | Distance={t['dist']} km")
    print(f"==================================================")
    
    # Energy
    resp1 = requests.post(f"{base_url}/energy/predict", headers=headers, json={
        "soc_percent": t["soc"],
        "battery_capacity_kwh": 60.0,
        "distance_km": t["dist"]
    })
    print("🔋 ENERGY RESPONSE:")
    print(resp1.json())
    
    # EVCS
    resp2 = requests.post(f"{base_url}/evcs/predict", headers=headers, json={
        "SOC_percent": t["soc"],
        "target_SOC": 80,
        "battery_capacity_kWh": 60.0,
        "charger_power_kW": 50.0
    })
    print("\n⚡ EVCS RESPONSE:")
    print(resp2.json())
    print("\n")

