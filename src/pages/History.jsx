import React, { useState, useEffect } from 'react';
import { getTripHistory, formatDuration } from '../utils/api';
import styles from './History.module.css';

export default function History() {
  const [trips, setTrips] = useState([]);
  const [activeTab, setActiveTab] = useState('recent');

  useEffect(() => {
    setTrips(getTripHistory());
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('wattin_history');
    setTrips([]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Compute aggregate stats from trips
  const totalDistance = trips.reduce((sum, t) => sum + (t.distance || 0), 0);
  const avgEfficiency = trips.length > 0 
    ? Math.round(trips.reduce((sum, t) => sum + (t.distance ? (t.distance * 0.28) : 0), 0) / trips.length)
    : 0;
  const chargingStops = trips.filter(t => !t.reachable).length;

  return (
    <div className={styles.page}>
      {/* Header Section */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleArea}>
          <nav className={styles.breadcrumb}>
            <span>Navigator</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            <span className={styles.breadcrumbActive}>History</span>
          </nav>
          <h1 className={styles.pageTitle}>Journey History</h1>
          <p className={styles.pageSubtitle}>Detailed logs of your electric adventures.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.tabGroup}>
            {['recent', 'monthly', 'total'].map(tab => (
              <button
                key={tab}
                className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {trips.length > 0 && (
            <button className={styles.filterBtn} onClick={clearHistory}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_outline</span>
              <span>Clear All</span>
            </button>
          )}
        </div>
      </header>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statHero}>
          <div className={styles.statHeroContent}>
            <p className={styles.statHeroLabel}>TOTAL DISTANCE</p>
            <h2 className={styles.statHeroValue}>
              {totalDistance > 1000 ? `${(totalDistance / 1).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : totalDistance.toFixed(0)}
              <span className={styles.statHeroUnit}>km</span>
            </h2>
          </div>
          <div className={styles.statHeroFooter}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-primary-container)' }}>trending_up</span>
            <span>{trips.length} total trips</span>
          </div>
          <div className={styles.statHeroGlow} />
        </div>

        <div className={styles.statCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--primary)' }}>bolt</span>
          <div>
            <p className={styles.statCardLabel}>Avg. Efficiency</p>
            <h3 className={styles.statCardValue}>{avgEfficiency || '—'} <span className={styles.statCardUnit}>Wh/km</span></h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--tertiary)' }}>ev_station</span>
          <div>
            <p className={styles.statCardLabel}>Charging Stops</p>
            <h3 className={styles.statCardValue}>{chargingStops} <span className={styles.statCardUnit}>Total</span></h3>
          </div>
        </div>
      </div>

      {/* Trip List */}
      <div className={styles.tripSection}>
        <h3 className={styles.tripSectionTitle}>Recent Trips</h3>
        
        {trips.length === 0 ? (
          <div className={styles.empty}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.4 }}>explore</span>
            <h3 className={styles.emptyTitle}>No trips yet</h3>
            <p className={styles.emptyText}>
              Plan your first route and it will appear here for future reference.
            </p>
          </div>
        ) : (
          <div className={styles.tripList}>
            {trips.map((trip, i) => (
              <div
                key={trip.id}
                className={styles.tripCard}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={styles.tripCardLeft}>
                  <div className={styles.tripMeta}>
                    <span>{formatDate(trip.savedAt)}</span>
                    <span>•</span>
                    <span>{formatTime(trip.savedAt)}</span>
                  </div>
                  <h4 className={styles.tripRoute}>
                    {trip.fromLabel}
                    <span className={styles.tripArrow}>→</span>
                    {trip.toLabel}
                  </h4>
                  <div className={styles.tripStats}>
                    <div className={styles.tripStat}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--primary)' }}>distance</span>
                      {trip.distance?.toFixed(1)} km
                    </div>
                    <div className={styles.tripStat}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--primary)' }}>speed</span>
                      {Math.round((trip.distance || 0) * 0.28)} Wh/km
                    </div>
                    <div className={styles.tripStat}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--primary)' }}>ev_station</span>
                      {trip.reachable ? '0 Stops' : '1+ Stops'}
                    </div>
                  </div>
                </div>
                <div className={styles.tripCardRight}>
                  <span className={`${styles.tripBadge} ${
                    trip.reachable
                      ? styles.tripBadgeGreen
                      : trip.arrivalSoc > 10
                        ? styles.tripBadgeYellow
                        : styles.tripBadgeRed
                  }`}>
                    {trip.reachable ? 'OPTIMIZED' : trip.arrivalSoc > 10 ? 'ECO MODE' : 'HIGH USAGE'}
                  </span>
                  <button className={styles.tripArrowBtn}>
                    <span className="material-symbols-outlined">arrow_forward_ios</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
