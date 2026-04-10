import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  MapContainer, TileLayer, Polyline, Marker, Popup, useMap, Circle
} from 'react-leaflet';
import L from 'leaflet';
import { geocodePlace, getRoute, predictEV, findNearestStations, STATION_TYPES, formatDuration, saveTripToHistory, CHARGING_STATIONS, generateUUID } from '../utils/api';
import styles from './RoutePlanner.module.css';



function createSvgPin(color, innerColor = 'white') {
  const svg = `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.373 18.627 0 12 0Z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="${innerColor}"/></svg>`;
  return encodeURIComponent(svg.trim());
}

function createStationIcon(available) {
  const color = available ? '#006b5c' : '#7f8c8d';
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${createSvgPin(color)}`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -32],
  });
}

function createLocationIcon(type) {
  const color = type === 'start' ? '#006b5c' : '#f97316';
  const svg = `<svg width="30" height="42" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.373 18.627 0 12 0Z" fill="${color}"/><circle cx="12" cy="12" r="6" fill="white"/></svg>`;
  
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
}

function MapController({ bounds, center }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (center) {
      map.setView(center, 5);
    }
  }, [bounds, center, map]);
  return null;
}


export default function RoutePlanner({ routeData, setRouteData }) {
  const [startInput, setStartInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState(40);
  const [soc, setSoc] = useState(80);
  const [speed, setSpeed] = useState(80);
  const [temperature, setTemperature] = useState(25);
  const [efficiency, setEfficiency] = useState(150);
  
  const [targetSoc, setTargetSoc] = useState(20);
  const [chargerPower, setChargerPower] = useState(50);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [selectedBillingStation, setSelectedBillingStation] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [qrPhase, setQrPhase] = useState('entry');
  const [bookingId, setBookingId] = useState('');
  const [bookingTime, setBookingTime] = useState(null);

  // GPS current location state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [userGpsCoords, setUserGpsCoords] = useState(null);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsStatus('locating');
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserGpsCoords({ lat, lng });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'Wattin-EV-Planner/1.0' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const label = [
            addr.suburb || addr.neighbourhood || addr.village || addr.town,
            addr.city || addr.town || addr.county,
            addr.state,
          ].filter(Boolean).join(', ');
          setStartInput(label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setGpsStatus('success');
        } catch {
          setStartInput(`${lat.toFixed(6)},${lng.toFixed(6)}`);
          setGpsStatus('success');
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsStatus('error');
        if (err.code === 1) {
          setError('Location access denied. Please allow location permission and try again.');
        } else if (err.code === 2) {
          setError('Unable to determine your location. Please enter it manually.');
        } else {
          setError('Location request timed out. Please try again or enter manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handlePlan = async () => {
    if (!startInput.trim() || !destInput.trim()) {
      setError('Please enter both start location and destination.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setNearbyStations([]);

    try {
      const [startCoord, destCoord] = await Promise.all([
        userGpsCoords
          ? Promise.resolve({ ...userGpsCoords, name: 'Current Location', fullName: startInput })
          : geocodePlace(startInput),
        geocodePlace(destInput),
      ]);

      const route = await getRoute(startCoord, destCoord);

      const mlResult = await predictEV({
        soc,
        battery_capacity: batteryCapacity,
        efficiency,
        distance: route.distance,
        charger_power: chargerPower,
        target_soc: targetSoc,
        temperature,
      });

      let stations = [];
      if (!mlResult.reachable || mlResult.arrival_soc < 15) {
        const radiusKm = 50;
        stations = await findNearestStations(startCoord.lat, startCoord.lng, 5, radiusKm);
        if (stations.length === 0) {
          stations = await findNearestStations(startCoord.lat, startCoord.lng, 5);
        }
        setNearbyStations(stations);
      }

      const tripData = {
        start: startCoord,
        dest: destCoord,
        route,
        mlResult,
        nearbyStations: stations,
        params: { soc, batteryCapacity, efficiency, temperature, speed },
        timestamp: new Date().toISOString(),
        fromLabel: startInput,
        toLabel: destInput,
      };

      setRouteData(tripData);
      setResult(tripData);
      setShowResultPopup(true);

      const lats = route.geometry.map(([lat]) => lat);
      const lngs = route.geometry.map(([, lng]) => lng);
      setMapBounds([
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ]);

      saveTripToHistory({
        fromLabel: startInput,
        toLabel: destInput,
        distance: route.distance,
        reachable: mlResult.reachable,
        arrivalSoc: mlResult.arrival_soc,
        duration: route.duration,
      });

    } catch (err) {
      setError(err.message || 'Failed to plan route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setRouteData(null);
    setNearbyStations([]);
    setMapBounds(null);
    setError('');
    setShowResultPopup(false);
  };

  return (
    <div className={styles.page}>
      {/* ── Left Panel (Skeuomorphic Parameters) ─────── */}
      <section className={styles.panel}>
        <div className={styles.panelScroll}>
          {/* Page Title */}
          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Route Planner</h1>
            <p className={styles.pageSubtitle}>Define your path with precision.</p>
          </header>

          {/* Journey Details Card */}
          <div className={styles.journeyCard}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIcon}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>location_on</span>
              </div>
              <h3 className={styles.sectionTitle}>JOURNEY DETAILS</h3>
            </div>

            <div className={styles.inputStack}>
              {/* Start Location */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>START LOCATION</label>
                <div className={styles.neuInputRow}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 20 }}>my_location</span>
                  <input
                    className={styles.neuInput}
                    type="text"
                    value={startInput}
                    onChange={e => {
                      setStartInput(e.target.value);
                      if (userGpsCoords) {
                        setUserGpsCoords(null);
                        setGpsStatus('');
                      }
                    }}
                    placeholder="e.g. Chennai, Tamil Nadu"
                  />
                  <button
                    className={`${styles.gpsBtn} ${gpsStatus === 'success' ? styles.gpsBtnSuccess : ''} ${gpsStatus === 'error' ? styles.gpsBtnError : ''}`}
                    onClick={handleUseMyLocation}
                    disabled={gpsLoading}
                    title="Use my current GPS location"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {gpsLoading ? 'sync' : 'gps_fixed'}
                    </span>
                  </button>
                </div>
                {gpsStatus === 'locating' && (
                  <p className={styles.gpsStatusMsg}><span className="material-symbols-outlined" style={{ fontSize: 12, animation: 'spin 1s linear infinite' }}>sync</span> Detecting your location...</p>
                )}
                {gpsStatus === 'success' && (
                  <p className={styles.gpsStatusSuccess}>✓ GPS location detected</p>
                )}
              </div>

              {/* Swap Button */}
              <div className={styles.swapBtnRow}>
                <button className={styles.swapBtn}>
                  <span className="material-symbols-outlined">swap_vert</span>
                </button>
              </div>

              {/* Destination */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>DESTINATION</label>
                <div className={styles.neuInputRow}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 20 }}>flag</span>
                  <input
                    className={styles.neuInput}
                    type="text"
                    value={destInput}
                    onChange={e => setDestInput(e.target.value)}
                    placeholder="e.g. Coimbatore, Tamil Nadu"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* EV Parameters */}
          <div className={styles.evSection}>
            <div className={styles.sectionTitleRow}>
              <div className={styles.sectionIconSm}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>bolt</span>
              </div>
              <h3 className={styles.sectionTitle}>EV PARAMETERS</h3>
            </div>

            <div className={styles.paramGrid}>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>CURRENT RANGE</span>
                <div className={styles.paramValueRow}>
                  <input
                    className={styles.paramInput}
                    type="number"
                    value={batteryCapacity}
                    onChange={e => setBatteryCapacity(Number(e.target.value))}
                    min={10} max={200}
                  />
                  <span className={styles.paramUnit}>KWH</span>
                </div>
              </div>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>SOC LEVEL</span>
                <div className={styles.paramValueRow}>
                  <input
                    className={styles.paramInput}
                    type="number"
                    value={soc}
                    onChange={e => setSoc(Number(e.target.value))}
                    min={1} max={100}
                  />
                  <span className={styles.paramUnit}>%</span>
                </div>
              </div>
            </div>

            {/* SOC Slider */}
            <div className={styles.socSliderWrap}>
              <div className={styles.socSliderHeader}>
                <span className={styles.paramLabel}>CURRENT SOC LEVEL</span>
                <div className={styles.socValueBadge}>{soc}%</div>
              </div>
              <input
                className={styles.socSlider}
                type="range"
                min={1}
                max={100}
                value={soc}
                onChange={e => setSoc(Number(e.target.value))}
              />
              <div className={styles.socSliderLabels}>
                <span>Low</span>
                <span>Full</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorMsg}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--error)' }}>warning</span>
              <span>{error}</span>
            </div>
          )}

          {/* Plan Button */}
          <button
            className={`${styles.planBtn} ${loading ? styles.planBtnLoading : ''}`}
            onClick={handlePlan}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>sync</span>
                Calculating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>navigation</span>
                Plan Route
              </>
            )}
          </button>

          {/* View Summary */}
          {result && (
            <button className={styles.summaryBtn} onClick={() => setShowResultPopup(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
              View Trip Summary
            </button>
          )}

          {/* Reset */}
          {result && (
            <button className={styles.resetBtn} onClick={handleReset}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
              Reset
            </button>
          )}

          {/* Nearby Stations */}
          {nearbyStations.length > 0 && (
            <div className={styles.stationsPanel}>
              <div className={styles.stationsPanelHeader}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--accent-warning)' }}>ev_station</span>
                <span>Recommended Reachable Stations</span>
              </div>
              {nearbyStations.map(s => (
                <div key={s.id} className={styles.stationItem}>
                  <div
                    className={styles.stationDot}
                    style={{
                      background: STATION_TYPES[s.type]?.color || '#8899bb',
                      boxShadow: `0 0 6px ${STATION_TYPES[s.type]?.color || '#8899bb'}55`,
                    }}
                  />
                  <div className={styles.stationInfo}>
                    <span className={styles.stationName}>{s.name}</span>
                    <span className={styles.stationMeta}>
                      {s.power} kW · {s.distance?.toFixed(1)} km away
                    </span>
                  </div>
                  <div className={`${styles.stationAvail} ${s.available ? styles.stationAvailYes : styles.stationAvailNo}`}>
                    {s.available ? 'Open' : 'Busy'}
                  </div>
                  <button className={styles.stationSelectBtn} onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedBillingStation(s); 
                    setQrPhase('entry');
                    setBookingId(generateUUID());
                    setBookingTime(new Date());
                  }}>
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Map Section (Skeuomorphic Command Center) ──── */}
      <div className={styles.mapArea}>
        {!result && (
          <div className={styles.mapOverlay}>
            <div className={styles.mapPlaceholder}>
              <div className={styles.mapPlaceholderNav}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>navigation</span>
              </div>
              <h3 className={styles.mapPlaceholderTitle}>Ready to navigate?</h3>
              <p className={styles.mapPlaceholderText}>
                Enter your destination on the left<br />to calculate the optimal EV route.
              </p>
            </div>
          </div>
        )}
        <MapContainer
          center={mapCenter}
          zoom={5}
          className={styles.leafletMap}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />
          <MapController bounds={mapBounds} center={!mapBounds ? mapCenter : null} />

          {CHARGING_STATIONS.map((s, idx) => (
            <Marker
              key={`global-station-${s.id}-${idx}`}
              position={[s.lat, s.lng]}
              icon={createStationIcon(s.available)}
            >
              <Popup>
                <strong>{s.name}</strong><br />
                {s.power} kW · {STATION_TYPES[s.type]?.label || 'Charging Station'}<br />
                {s.available ? '✅ Available' : '⏳ Occupied'}<br />
                {s.address}
              </Popup>
            </Marker>
          ))}

          {result && (
            <>
              <Polyline
                positions={result.route.geometry}
                pathOptions={{
                  color: result.mlResult.reachable ? '#006b5c' : '#f59e0b',
                  weight: 4,
                  opacity: 0.85,
                  dashArray: result.mlResult.reachable ? null : '10, 6',
                }}
              />
              <Marker
                position={[result.start.lat, result.start.lng]}
                icon={createLocationIcon('start')}
              >
                <Popup>
                  <strong>Start:</strong> {result.start.name}
                </Popup>
              </Marker>
              <Marker
                position={[result.dest.lat, result.dest.lng]}
                icon={createLocationIcon('dest')}
              >
                <Popup>
                  <strong>Destination:</strong> {result.dest.name}
                </Popup>
              </Marker>

              {nearbyStations.map(s => (
                <Marker
                  key={s.id}
                  position={[s.lat, s.lng]}
                  icon={createStationIcon(s.available)}
                >
                  <Popup>
                    <strong>{s.name}</strong><br />
                    {s.power} kW · {STATION_TYPES[s.type]?.label}<br />
                    {s.available ? '✅ Available' : '⏳ Occupied'}<br />
                    {s.address}
                  </Popup>
                </Marker>
              ))}
            </>
          )}
        </MapContainer>

        {/* Map legend */}
        {result && (
          <div className={styles.mapLegend}>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: '#006b5c' }} />
              <span>Start</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: '#f97316' }} />
              <span>Destination</span>
            </div>
            {nearbyStations.length > 0 && (
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: '#006b5c' }} />
                <span>Charging Stop</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Result Card Modal ────────────────────────────── */}
      {result && showResultPopup && (
        <div className={styles.modalOverlay} onClick={() => setShowResultPopup(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowResultPopup(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className={`${styles.resultCard} ${result.mlResult.reachable ? styles.resultReachable : styles.resultUnreachable}`}>
              <div className={styles.resultHeader}>
                {result.mlResult.reachable ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--primary)' }}>check_circle</span>
                    <div>
                      <span className={styles.resultStatus}>Trip Possible</span>
                      <span className={styles.resultSub}>Your EV can reach the destination</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--accent-warning)' }}>warning</span>
                    <div>
                      <span className={styles.resultStatus}>Charging Required</span>
                      <span className={styles.resultSub}>Nearest stations shown on map</span>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>DISTANCE</span>
                  <span className={styles.statValue}>
                    {result.route.distance.toFixed(1)}<span className={styles.statUnit}>km</span>
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>DRIVE TIME</span>
                  <span className={styles.statValue}>
                    {formatDuration(result.route.duration)}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>ARRIVAL SOC</span>
                  <span className={`${styles.statValue} ${
                    result.mlResult.arrival_soc > 20 ? styles.statGreen :
                    result.mlResult.arrival_soc > 10 ? styles.statOrange : styles.statRed
                  }`}>
                    {result.mlResult.arrival_soc.toFixed(1)}<span className={styles.statUnit}>%</span>
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>ENERGY USED</span>
                  <span className={styles.statValue}>
                    {result.mlResult.energy_consumed_kwh}<span className={styles.statUnit}>kWh</span>
                  </span>
                </div>
              </div>

              {!result.mlResult.reachable && result.mlResult.charging_time_minutes > 0 && (
                <div className={styles.chargingInfo}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                  <span>Estimated charge time: <strong>{formatDuration(result.mlResult.charging_time_minutes)}</strong></span>
                </div>
              )}

              {result.mlResult.source === 'physics' && (
                <div className={styles.sourceNote}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                  <span>Physics-based estimate (ML backend unavailable)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Billing QR Overlay ───────────────────────────── */}
      {selectedBillingStation && (
        <div className={styles.modalOverlay} onClick={() => setSelectedBillingStation(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedBillingStation(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className={styles.modalHeader}>
               <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>qr_code_2</span>
               <h2>
                 {qrPhase === 'entry' ? 'Entry Authorization' : 
                  qrPhase === 'charging' ? 'Charging Session' : 
                  'Exit & Payment'}
               </h2>
            </div>
            
            {qrPhase === 'entry' ? (
              <div className={styles.modalBody}>
                 <p className={styles.modalText}>Scan at <strong>{selectedBillingStation.name}</strong> to authorize entry.</p>
                 <div className={styles.qrWrapper}>
                    <QRCodeCanvas 
                       value={JSON.stringify({id: bookingId, uid: 'USR-892', sid: selectedBillingStation.id, exp: new Date(bookingTime?.getTime() + 30 * 60000).toISOString()})}
                       size={160}
                       level={"H"}
                       includeMargin={true}
                    />
                 </div>
                 <div className={styles.stationDetailsMini}>
                    <span>Booking ID: {bookingId.split('-')[0].toUpperCase()}</span>
                    <span>Reserved: {bookingTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (Valid 30m)</span>
                 </div>
                 <button className={styles.mockPayBtn} onClick={() => setQrPhase('charging')}>
                    Simulate Scan & Start Charging
                 </button>
              </div>
            ) : qrPhase === 'charging' ? (
              <div className={styles.modalBody} style={{textAlign: 'center', padding: '20px 0'}}>
                 <div className={styles.successCircle}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--primary)' }}>check_circle</span>
                 </div>
                 <h3 className={styles.successMsg}>Charging Started Successfully!</h3>
                 <p className={styles.modalText}>
                   The charger at <strong>{selectedBillingStation.name}</strong> is now active. 
                   Real-time monitoring is available in your vehicle dashboard.
                 </p>
                 <div className={styles.chargeBar}>
                    <div className={styles.chargeBarFill} style={{ width: '40%' }} />
                 </div>
                 <button className={styles.mockPayBtn} onClick={() => setQrPhase('exit')}>
                    Finish Charging & Exit
                 </button>
              </div>
            ) : (
              <div className={styles.modalBody}>
                 <p className={styles.modalText}>Session Complete at <strong>{selectedBillingStation.name}</strong>.</p>
                 <div className={styles.qrWrapper}>
                    <QRCodeCanvas 
                       value={JSON.stringify({id: bookingId, type: 'exit', energy: result?.mlResult?.energy_consumed_kwh || 45, cost: ((result?.mlResult?.energy_consumed_kwh || 45) * 15).toFixed(2), req: true})}
                       size={160}
                       level={"H"}
                       includeMargin={true}
                    />
                 </div>
                 <div className={styles.stationDetailsMini}>
                    <span style={{fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)'}}>
                      Total Cost: ₹{((result?.mlResult?.energy_consumed_kwh || 45) * 15).toFixed(2)}
                    </span>
                    <span>Energy Consumed: {(result?.mlResult?.energy_consumed_kwh || 45).toFixed(1)} kWh</span>
                 </div>
                 <button className={styles.mockPayBtn} onClick={() => setSelectedBillingStation(null)}>
                    Process Payment & Close
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
