import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RoutePlanner from './pages/RoutePlanner';
import ChargingLocator from './pages/ChargingLocator';
import History from './pages/History';
import QRSession from './pages/QRSession';

export default function App() {
  const [routeData, setRouteData] = useState(null);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/plan" replace />} />
        <Route
          path="/plan"
          element={<RoutePlanner routeData={routeData} setRouteData={setRouteData} />}
        />
        <Route path="/charging" element={<ChargingLocator />} />
        <Route path="/history" element={<History />} />
        <Route path="/qr" element={<QRSession routeData={routeData} />} />
      </Routes>
    </Layout>
  );
}
