import requests
import json

base_url = "https://snoozy-gaslighted-jakobe.ngrok-free.dev"
headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "1"
}

results = []

def test_endpoint(path, payload):
    item = {"path": path, "payload": payload}
    try:
        response = requests.post(f"{base_url}{path}", headers=headers, json=payload)
        item["status"] = response.status_code
        item["response"] = response.json()
    except Exception as e:
        item["error"] = str(e)
    results.append(item)

# Test /energy/predict (seems to be energy/range calculation) with suspected names
test_endpoint("/energy/predict", {
    "soc_percent": 50,
    "battery_capacity_kwh": 60,
    "distance_km": 50
})

# Test /evcs/predict (seems to be charging calculation) with suspected names
test_endpoint("/evcs/predict", {
    "SOC_percent": 50,
    "target_SOC": 80,
    "battery_capacity_kWh": 60,
    "charger_power_kW": 50
})

with open("ml_results.json", "w") as f:
    json.dump(results, f, indent=2)
