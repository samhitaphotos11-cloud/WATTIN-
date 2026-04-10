import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/plan',     label: 'Plan Route',     icon: 'route' },
  { to: '/history',  label: 'History',         icon: 'history', filled: true },
  { to: '/charging', label: 'Charging Hubs',   icon: 'ev_station' },
  { to: '/qr',       label: 'QR Session',      icon: 'qr_code_2' },
];

const TOP_NAV = [
  { to: '/plan',     label: 'Route Planner' },
  { to: '/charging', label: 'Charging Stations' },
  { to: '/qr',       label: 'QR Session' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className={styles.shell}>
      {/* ── Top Nav Bar ─────────────────────────────────── */}
      <nav className={styles.topNav}>
        <div className={styles.topNavLeft}>
          <span className={styles.logo}>Wattin</span>
          <div className={styles.topNavLinks}>
            {TOP_NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.topNavLink} ${isActive ? styles.topNavLinkActive : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className={styles.topNavRight}>
          <button className={styles.iconBtn} title="Settings">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className={styles.iconBtn} title="Account">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_circle
            </span>
          </button>
        </div>
      </nav>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarClosed}`}>
        <div className={styles.sidebarProfile}>
          <div className={styles.profileAvatar}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--primary)' }}>
              electric_car
            </span>
          </div>
          <div>
            <p className={styles.profileName}>Wattin Navigator</p>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map(({ to, label, icon, filled }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span
                className="material-symbols-outlined"
                style={
                  filled && location.pathname === to
                    ? { fontVariationSettings: "'FILL' 1" }
                    : {}
                }
              >
                {icon}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.newJourneyBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            New Journey
          </button>
          <div className={styles.footerLinks}>
            <NavLink to="#" className={styles.footerLink}>
              <span className="material-symbols-outlined">help</span>
              <span>Support</span>
            </NavLink>
            <NavLink to="#" className={styles.footerLink}>
              <span className="material-symbols-outlined">person</span>
              <span>Account</span>
            </NavLink>
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ───────────────────────────── */}
      <nav className={styles.bottomNav}>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ''}`
            }
          >
            <span className="material-symbols-outlined" style={
              location.pathname === to ? { fontVariationSettings: "'FILL' 1" } : {}
            }>{icon}</span>
            <span>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Main Content ────────────────────────────────── */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
