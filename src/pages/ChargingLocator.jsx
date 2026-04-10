import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  CHARGING_STATIONS, STATION_TYPES, getStates, getCitiesByState, filterStations
} from '../utils/api';
import styles from './ChargingLocator.module.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createStationIcon(type, available, selected = false) {
  const config = STATION_TYPES[type] || STATION_TYPES.others;
  const color = available ? config.color : '#94a3b8';
  const size = selected ? 20 : 14;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      border:${selected ? '3px' : '2px'} solid rgba(255,255,255,${selected ? '0.95' : '0.6'});
      box-shadow:0 0 ${selected ? '16px' : '8px'} ${color}${selected ? '66' : '33'};
      transition:all 0.2s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapFocus({ station }) {
  const map = useMap();
  useEffect(() => {
    if (station) map.setView([station.lat, station.lng], 14, { animate: true });
  }, [station, map]);
  return null;
}

const ALL_TYPES = Object.entries(STATION_TYPES).map(([k, v]) => ({ key: k, ...v }));

export default function ChargingLocator() {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stations, setStations] = useState(CHARGING_STATIONS);

  const states = getStates();
  const cities = selectedState ? getCitiesByState(selectedState) : [];

  useEffect(() => {
    let filtered = filterStations({
      state: selectedState || null,
      city: selectedCity || null,
      type: selectedType || null,
    });
    if (availableOnly) filtered = filtered.filter(s => s.available);
    setStations(filtered);
    setSelectedStation(null);
  }, [selectedState, selectedCity, selectedType, availableOnly]);

  const handleStateChange = (v) => {
    setSelectedState(v);
    setSelectedCity('');
  };

  const handleReset = () => {
    setSelectedState('');
    setSelectedCity('');
    setSelectedType('');
    setAvailableOnly(false);
    setStations(CHARGING_STATIONS);
    setSelectedStation(null);
  };

  const typeCounts = {};
  CHARGING_STATIONS.forEach(s => {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });

  return (
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--accent-warning)' }}>ev_station</span>
            <div>
              <h1 className={styles.panelHeading}>Charging Locator</h1>
              <p className={styles.panelSub}>{stations.length} stations found</p>
            </div>
          </div>
          <button className={styles.resetBtn} onClick={handleReset} title="Reset filters">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          </button>
        </div>

        <div className={styles.panelScroll}>
          {/* Filters */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--accent-warning)' }}>filter_list</span>
              <span>Filter Stations</span>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Select State</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={selectedState}
                  onChange={e => handleStateChange(e.target.value)}
                >
                  <option value="">All States</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="material-symbols-outlined" style={{ fontSize: 16, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>expand_more</span>
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Select City</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  disabled={!selectedState}
                >
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="material-symbols-outlined" style={{ fontSize: 16, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>expand_more</span>
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Network Type</label>
              <div className={styles.typeChips}>
                <button
                  className={`${styles.typeChip} ${!selectedType ? styles.typeChipActive : ''}`}
                  onClick={() => setSelectedType('')}
                >
                  All
                </button>
                {ALL_TYPES.map(t => (
                  <button
                    key={t.key}
                    className={`${styles.typeChip} ${selectedType === t.key ? styles.typeChipActive : ''}`}
                    onClick={() => setSelectedType(selectedType === t.key ? '' : t.key)}
                    style={selectedType === t.key ? {
                      background: t.bgColor,
                      borderColor: t.color + '55',
                      color: t.color,
                    } : {}}
                  >
                    <span
                      className={styles.typeChipDot}
                      style={{ background: t.color }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Available only</span>
              <div
                className={`${styles.toggle} ${availableOnly ? styles.toggleOn : ''}`}
                onClick={() => setAvailableOnly(!availableOnly)}
              >
                <div className={styles.toggleThumb} />
              </div>
            </label>
          </section>

          {/* Legend */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--accent-warning)' }}>location_on</span>
              <span>Map Legend</span>
            </div>
            <div className={styles.legendGrid}>
              {ALL_TYPES.map(t => (
                <div key={t.key} className={styles.legendItem}>
                  <div
                    className={styles.legendDot}
                    style={{ background: t.color, boxShadow: `0 0 6px ${t.color}33` }}
                  />
                  <span className={styles.legendLabel}>{t.label}</span>
                  <span className={styles.legendCount}>{typeCounts[t.key] || 0}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Results list */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--accent-warning)' }}>battery_charging_full</span>
              <span>Results For Charging Stations</span>
            </div>
            {stations.length === 0 ? (
              <div className={styles.noResults}>
                No stations match the current filters.
              </div>
            ) : (
              <div className={styles.stationList}>
                {stations.map(s => (
                  <div
                    key={s.id}
                    className={`${styles.stationCard} ${selectedStation?.id === s.id ? styles.stationCardSelected : ''}`}
                    onClick={() => setSelectedStation(s)}
                  >
                    <div className={styles.stationCardTop}>
                      <div
                        className={styles.stationCardDot}
                        style={{
                          background: STATION_TYPES[s.type]?.color || '#8899bb',
                          boxShadow: `0 0 6px ${STATION_TYPES[s.type]?.color || '#8899bb'}44`,
                        }}
                      />
                      <span className={styles.stationCardName}>{s.name}</span>
                      <span className={`${styles.stationCardAvail} ${s.available ? styles.availYes : styles.availNo}`}>
                        {s.available ? 'Open' : 'Busy'}
                      </span>
                    </div>
                    <div className={styles.stationCardMeta}>
                      <span>{s.power} kW</span>
                      <span className={styles.dot}>·</span>
                      <span>{s.connectors.join(', ')}</span>
                      <span className={styles.dot}>·</span>
                      <span>{s.city}</span>
                    </div>
                    <div className={styles.stationCardAddr}>{s.address}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Map */}
      <div className={styles.mapArea}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          className={styles.leafletMap}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          {selectedStation && <MapFocus station={selectedStation} />}

          {stations.map(s => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={createStationIcon(s.type, s.available, selectedStation?.id === s.id)}
              eventHandlers={{ click: () => setSelectedStation(s) }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13, color: 'var(--on-surface)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.address}</div>
                  <div style={{ fontSize: 11, marginBottom: 4 }}>
                    {s.power} kW · {s.connectors.join(', ')}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 100,
                    fontSize: 10,
                    fontWeight: 700,
                    background: s.available ? 'rgba(0,191,165,0.12)' : 'rgba(186,26,26,0.1)',
                    color: s.available ? 'var(--primary)' : 'var(--error)',
                  }}>
                    {s.available ? 'Available' : 'Occupied'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Selected station detail card */}
        {selectedStation && (
          <div className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <div
                className={styles.detailDot}
                style={{
                  background: STATION_TYPES[selectedStation.type]?.color,
                  boxShadow: `0 0 10px ${STATION_TYPES[selectedStation.type]?.color}44`,
                }}
              />
              <div className={styles.detailName}>{selectedStation.name}</div>
              <button className={styles.detailClose} onClick={() => setSelectedStation(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className={styles.detailGrid}>
              <div className={styles.detailStat}>
                <span className={styles.detailStatLabel}>Power</span>
                <span className={styles.detailStatVal}>{selectedStation.power} kW</span>
              </div>
              <div className={styles.detailStat}>
                <span className={styles.detailStatLabel}>Status</span>
                <span
                  className={styles.detailStatVal}
                  style={{ color: selectedStation.available ? 'var(--primary)' : 'var(--error)' }}
                >
                  {selectedStation.available ? 'Available' : 'Occupied'}
                </span>
              </div>
              <div className={styles.detailStat}>
                <span className={styles.detailStatLabel}>Network</span>
                <span className={styles.detailStatVal}>{STATION_TYPES[selectedStation.type]?.label}</span>
              </div>
              <div className={styles.detailStat}>
                <span className={styles.detailStatLabel}>Connectors</span>
                <span className={styles.detailStatVal}>{selectedStation.connectors.join(', ')}</span>
              </div>
            </div>
            <div className={styles.detailAddress}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>location_on</span>
              {selectedStation.address}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
