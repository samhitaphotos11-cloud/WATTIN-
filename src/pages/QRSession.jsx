import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { generateUUID, formatDuration, CHARGING_STATIONS, STATION_TYPES } from '../utils/api';
import styles from './QRSession.module.css';

const CHARGER_RATE = 12; // ₹ per kWh

function QRCard({ title, subtitle, data, color, iconName, expiry }) {
  const handleDownload = () => {
    const canvas = document.getElementById(`qr-canvas-${title.replace(/\s/g, '')}`);
    if (canvas) {
      const link = document.createElement('a');
      link.download = `wattin-${title.toLowerCase().replace(/\s/g, '-')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className={styles.qrCard} style={{ '--card-color': color }}>
      <div className={styles.qrCardHeader}>
        <div className={styles.qrCardIcon} style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>{iconName}</span>
        </div>
        <div>
          <h3 className={styles.qrCardTitle}>{title}</h3>
          <p className={styles.qrCardSub}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.qrWrap}>
        <div className={styles.qrBorder} style={{ borderColor: `${color}25`, boxShadow: `0 0 20px ${color}10` }}>
          <QRCodeCanvas
            id={`qr-canvas-${title.replace(/\s/g, '')}`}
            value={JSON.stringify(data)}
            size={160}
            bgColor="#ffffff"
            fgColor={color}
            level="M"
            includeMargin={false}
          />
        </div>
        {expiry && (
          <div className={styles.qrExpiry}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
            <span>Expires in {expiry}</span>
          </div>
        )}
      </div>

      <div className={styles.qrMeta}>
        {Object.entries(data).slice(0, 4).map(([k, v]) => (
          <div key={k} className={styles.qrMetaRow}>
            <span className={styles.qrMetaKey}>{k.replace(/_/g, ' ')}</span>
            <span className={styles.qrMetaVal} style={{ color: k === 'status' ? color : undefined }}>
              {String(v).substring(0, 30)}
            </span>
          </div>
        ))}
      </div>

      <button className={styles.downloadBtn} onClick={handleDownload} style={{ borderColor: `${color}25`, color }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
        Download QR
      </button>
    </div>
  );
}

export default function QRSession({ routeData }) {
  const [step, setStep] = useState('setup');
  const [selectedStation, setSelectedStation] = useState('');
  const [targetSoc, setTargetSoc] = useState(80);
  const [currentSoc, setCurrentSoc] = useState(20);
  const [sessionData, setSessionData] = useState(null);
  const [exitData, setExitData] = useState(null);
  const [sessionStart] = useState(Date.now());

  const availableStations = CHARGING_STATIONS.filter(s => s.available);

  const handleBook = () => {
    if (!selectedStation) return;
    const station = CHARGING_STATIONS.find(s => s.id === Number(selectedStation));
    const bookingId = generateUUID().substring(0, 8).toUpperCase();
    const userId = 'USR-' + generateUUID().substring(0, 6).toUpperCase();
    const validity = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    setSessionData({
      booking_id: bookingId,
      user_id: userId,
      station_id: `STN-${station.id}`,
      station_name: station.name,
      slot_time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      charger_power: station.power,
      target_soc: targetSoc,
      validity,
      status: 'AUTHORIZED',
    });
    setStep('entry');
  };

  const handleStartCharging = () => {
    setStep('active');
  };

  const handleEndSession = () => {
    if (!sessionData) return;
    const energyConsumed = ((targetSoc - currentSoc) / 100) * 75;
    const cost = (energyConsumed * CHARGER_RATE).toFixed(2);
    const chargingMinutes = (energyConsumed / sessionData.charger_power) * 60;

    setExitData({
      booking_id: sessionData.booking_id,
      energy_consumed: `${energyConsumed.toFixed(2)} kWh`,
      total_cost: `₹${cost}`,
      charging_time: formatDuration(chargingMinutes),
      final_soc: `${targetSoc}%`,
      payment_flag: 'REQUIRED',
      status: 'SESSION_CLOSED',
    });
    setStep('exit');
  };

  const handleReset = () => {
    setStep('setup');
    setSessionData(null);
    setExitData(null);
    setSelectedStation('');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>qr_code_2</span>
          <div>
            <h1 className={styles.heading}>QR Session Manager</h1>
            <p className={styles.sub}>Contactless entry, billing & session control</p>
          </div>
        </div>
        <div className={styles.securityBadge}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified_user</span>
          <span>End-to-End Secured</span>
        </div>
      </div>

      {/* Progress steps */}
      <div className={styles.steps}>
        {['setup', 'entry', 'active', 'exit'].map((s, i) => {
          const labels = ['Book Slot', 'Entry QR', 'Charging', 'Exit & Pay'];
          const active = step === s;
          const done = ['setup', 'entry', 'active', 'exit'].indexOf(step) > i;
          return (
            <React.Fragment key={s}>
              <div className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}>
                <div className={styles.stepNum}>
                  {done ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span> : i + 1}
                </div>
                <span className={styles.stepLabel}>{labels[i]}</span>
              </div>
              {i < 3 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className={styles.content}>

        {/* SETUP */}
        {step === 'setup' && (
          <div className={styles.setupWrap}>
            <div className={styles.setupCard}>
              <h2 className={styles.setupTitle}>Book a Charging Slot</h2>
              <p className={styles.setupDesc}>
                Select a charging station, set your target state of charge, and generate a secure entry QR code.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Charging Station</label>
                <select
                  className={styles.formSelect}
                  value={selectedStation}
                  onChange={e => setSelectedStation(e.target.value)}
                >
                  <option value="">— Choose a station —</option>
                  {availableStations.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.power} kW) — {s.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Current SOC (%)</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min={1}
                    max={99}
                    value={currentSoc}
                    onChange={e => setCurrentSoc(Number(e.target.value))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target SOC (%)</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min={currentSoc + 1}
                    max={100}
                    value={targetSoc}
                    onChange={e => setTargetSoc(Number(e.target.value))}
                  />
                </div>
              </div>

              {selectedStation && (
                <div className={styles.stationPreview}>
                  {(() => {
                    const s = CHARGING_STATIONS.find(st => st.id === Number(selectedStation));
                    const type = STATION_TYPES[s.type] || STATION_TYPES.others;
                    return (
                      <>
                        <div className={styles.stationPreviewDot} style={{ background: type.color }} />
                        <div className={styles.stationPreviewInfo}>
                          <span className={styles.stationPreviewName}>{s.name}</span>
                          <span className={styles.stationPreviewMeta}>
                            {s.power} kW · {s.connectors.join(', ')} · {s.address}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className={styles.securityInfo}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>lock</span>
                <span>QR codes are time-limited, UUID-based, and validated server-side.</span>
              </div>

              <button
                className={styles.bookBtn}
                onClick={handleBook}
                disabled={!selectedStation}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>qr_code_2</span>
                Generate Entry QR Code
              </button>
            </div>

            <div className={styles.infoPanel}>
              <h3 className={styles.infoPanelTitle}>How It Works</h3>
              <div className={styles.infoSteps}>
                {[
                  { icon: 'qr_code_2', title: 'Book & Get QR', desc: 'Reserve your slot and receive a time-limited entry QR code.' },
                  { icon: 'bolt', title: 'Scan to Enter', desc: 'Scan the QR at the station entry. Backend validates booking details.' },
                  { icon: 'battery_charging_full', title: 'Charge Up', desc: 'Charging begins automatically. Track progress in real time.' },
                  { icon: 'payments', title: 'Exit & Pay', desc: 'On completion, scan your exit QR to process transparent billing.' },
                ].map(({ icon, title, desc }, i) => (
                  <div key={i} className={styles.infoStep}>
                    <div className={styles.infoStepNum}>{i + 1}</div>
                    <div className={styles.infoStepContent}>
                      <div className={styles.infoStepTitle}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--primary)' }}>{icon}</span>
                        {title}
                      </div>
                      <p className={styles.infoStepDesc}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ENTRY QR */}
        {step === 'entry' && sessionData && (
          <div className={styles.qrStep}>
            <div className={styles.qrStepLeft}>
              <QRCard
                title="Entry QR Code"
                subtitle="Scan at station entry to begin session"
                data={{
                  booking_id: sessionData.booking_id,
                  user_id: sessionData.user_id,
                  station_id: sessionData.station_id,
                  slot_time: sessionData.slot_time,
                  status: sessionData.status,
                }}
                color="#006b5c"
                iconName="qr_code_2"
                expiry="30 minutes"
              />
            </div>
            <div className={styles.qrStepRight}>
              <div className={styles.sessionInfo}>
                <h3 className={styles.sessionInfoTitle}>Booking Confirmed</h3>
                <div className={styles.sessionInfoRows}>
                  {[
                    ['Booking ID', sessionData.booking_id],
                    ['Station', sessionData.station_name],
                    ['Charger Power', `${sessionData.charger_power} kW`],
                    ['Target SOC', `${sessionData.target_soc}%`],
                    ['Slot Time', sessionData.slot_time],
                  ].map(([label, value]) => (
                    <div key={label} className={styles.sessionInfoRow}>
                      <span className={styles.sessionInfoLabel}>{label}</span>
                      <span className={styles.sessionInfoVal}>{value}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.expiryWarning}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                  QR expires in 30 minutes. Present at station entry.
                </div>
                <button className={styles.proceedBtn} onClick={handleStartCharging}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                  QR Scanned — Start Charging
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE SESSION */}
        {step === 'active' && sessionData && (
          <div className={styles.activeSession}>
            <div className={styles.activeHeader}>
              <div className={styles.activePulse} />
              <h2 className={styles.activeTitle}>Charging in Progress</h2>
            </div>

            <div className={styles.activeCards}>
              <div className={styles.activeCard}>
                <span className={styles.activeCardLabel}>Station</span>
                <span className={styles.activeCardVal}>{sessionData.station_name}</span>
              </div>
              <div className={styles.activeCard}>
                <span className={styles.activeCardLabel}>Booking ID</span>
                <span className={styles.activeCardVal} style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>
                  {sessionData.booking_id}
                </span>
              </div>
              <div className={styles.activeCard}>
                <span className={styles.activeCardLabel}>Charger Power</span>
                <span className={styles.activeCardVal}>{sessionData.charger_power} kW</span>
              </div>
              <div className={styles.activeCard}>
                <span className={styles.activeCardLabel}>Target SOC</span>
                <span className={styles.activeCardVal} style={{ color: 'var(--primary)' }}>
                  {sessionData.target_soc}%
                </span>
              </div>
            </div>

            {/* Battery animation */}
            <div className={styles.batteryViz}>
              <div className={styles.batteryBody}>
                <div className={styles.batteryFill} style={{ width: `${targetSoc}%` }} />
                <div className={styles.batteryLabel}>{targetSoc}%</div>
              </div>
              <div className={styles.batteryTip} />
            </div>

            <div className={styles.estimateRow}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>schedule</span>
              <span className={styles.estimateText}>
                Estimated time: {formatDuration(((targetSoc - currentSoc) / 100 * 75) / sessionData.charger_power * 60)}
              </span>
            </div>

            <button className={styles.endBtn} onClick={handleEndSession}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
              Charging Complete — Generate Exit QR
            </button>
          </div>
        )}

        {/* EXIT QR */}
        {step === 'exit' && exitData && (
          <div className={styles.qrStep}>
            <div className={styles.qrStepLeft}>
              <QRCard
                title="Exit QR Code"
                subtitle="Scan at exit terminal to complete billing"
                data={exitData}
                color="#f59e0b"
                iconName="payments"
              />
            </div>
            <div className={styles.qrStepRight}>
              <div className={styles.sessionInfo}>
                <h3 className={styles.sessionInfoTitle}>Session Summary</h3>
                <div className={styles.sessionInfoRows}>
                  {[
                    ['Booking ID', exitData.booking_id],
                    ['Energy Consumed', exitData.energy_consumed],
                    ['Charging Time', exitData.charging_time],
                    ['Final SOC', exitData.final_soc],
                    ['Total Cost', exitData.total_cost],
                    ['Payment', exitData.payment_flag],
                  ].map(([label, value]) => (
                    <div key={label} className={styles.sessionInfoRow}>
                      <span className={styles.sessionInfoLabel}>{label}</span>
                      <span
                        className={styles.sessionInfoVal}
                        style={{
                          color: label === 'Total Cost' ? 'var(--accent-warning)' :
                                 label === 'Payment' ? 'var(--error)' : undefined
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.completeBadge}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                  Session successfully closed. Receipt saved.
                </div>
                <button className={styles.sessionResetBtn} onClick={handleReset}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
                  Start New Session
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
