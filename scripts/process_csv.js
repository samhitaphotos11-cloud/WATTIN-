const fs = require('fs');
const path = require('path');

const csvFilePath = 'd:\\WATTIN\\New folder\\Indian_EV_Stations_Simplified (3).csv';
const outputJsonPath = path.join(__dirname, '..', 'src', 'data', 'stations.json');

// Ensure output dir exists
const outputDir = path.dirname(outputJsonPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const csvData = fs.readFileSync(csvFilePath, 'utf8');
const lines = csvData.trim().split('\n');

const headers = lines[0].split(',').map(h => h.trim());

const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});

// Station Name,City,State,Latitude,Longitude,Operator,Usage Type,Connector Type,Power (kW)
const stations = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // simple csv split ignoring commas inside quotes
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  
  if (parts.length < headers.length) continue;
  
  const name = parts[0].trim();
  const city = parts[1].trim();
  const state = parts[2].trim();
  const lat = parseFloat(parts[3]);
  const lng = parseFloat(parts[4]);
  const operatorString = parts[5].trim();
  const usageType = parts[6].trim();
  const connectorType = parts[7].trim();
  const powerStr = parts[8].trim();
  
  const power = parseFloat(powerStr) || 22; // default if not parseable

  let type = operatorString.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
  if (!type) type = 'unknown';

  let available = Math.random() > 0.2; // roughly 80% available for UX
  
  stations.push({
    id: generateUUID(),
    name,
    lat,
    lng,
    type,
    power,
    connectors: [connectorType],
    available,
    city,
    state,
    address: `${city}, ${state}`
  });
}

fs.writeFileSync(outputJsonPath, JSON.stringify(stations, null, 2));
console.log(`Successfully converted ${stations.length} stations to src/data/stations.json`);
