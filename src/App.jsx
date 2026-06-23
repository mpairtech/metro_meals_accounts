import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DailyEntry from './pages/DailyEntry';
import Records from './pages/Records';
import DailyReport from './pages/DailyReport';
import MonthlyReport from './pages/MonthlyReport';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import logo from './assets/logo.png';

// ── Role-based nav ────────────────────────────────────────────
const ALL_PAGES = [
  { id: 'entry',    label: '✏️ Daily Entry',    roles: ['admin','manager'] },
  { id: 'records',  label: '📋 Records',         roles: ['admin','manager','director'] },
  { id: 'daily',    label: '📊 Daily Report',    roles: ['admin','director'] },
  { id: 'monthly',  label: '📅 Monthly Report',  roles: ['admin','director'] },
  { id: 'inventory',label: '📦 Inventory',       roles: ['admin','manager','director'] },
  { id: 'settings', label: '⚙️ Settings',        roles: ['admin'] },
];

function Shell() {
  const { user, logout, can, checked } = useAuth();
  const { loadHeads } = useApp();
  const [page, setPage]     = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const prevUser = React.useRef(null);

  // When user logs in, load heads
  useEffect(() => {
    if (user && !prevUser.current) {
      loadHeads();
    }
    prevUser.current = user;
  }, [user, loadHeads]);

  if (!checked) return null;
  if (!user) return <Login />;

  const visiblePages  = ALL_PAGES.filter(p => p.roles.includes(user.role));
  const defaultPage   = visiblePages[0]?.id || 'entry';
  const activePage    = page || defaultPage;

  const renderPage = () => {
    switch (activePage) {
      case 'entry':     return <DailyEntry />;
      case 'records':   return <Records />;
      case 'daily':     return <DailyReport />;
      case 'monthly':   return <MonthlyReport />;
      case 'inventory': return <Inventory />;
      case 'settings':  return <Settings />;
      default:          return <DailyEntry />;
    }
  };

  const navigate = (id) => { setPage(id); setMenuOpen(false); };

  const ROLE_LABEL = { admin: '🔴 Admin', manager: '🟡 Manager', director: '🔵 Director' };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-logo">
          <img src={logo} alt="Metro Meals" />
          <div>
            <div className="brand-name">Metro Meals</div>
            <div className="brand-sub">Finance Manager</div>
          </div>
        </div>
        <nav className="topbar-nav desktop-nav">
          {visiblePages.map(p => (
            <button key={p.id} className={activePage === p.id ? 'active' : ''} onClick={() => navigate(p.id)}>
              {p.label}
            </button>
          ))}
        </nav>
        <div className="topbar-user">
          <span className="user-chip">{ROLE_LABEL[user.role]} &nbsp;{user.full_name}</span>
          <button className="btn-logout" onClick={logout}>⏏ Logout</button>
          <button className="hamburger" onClick={() => setMenuOpen(v => !v)}>☰</button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-drawer">
          {visiblePages.map(p => (
            <button key={p.id} className={activePage === p.id ? 'active' : ''} onClick={() => navigate(p.id)}>
              {p.label}
            </button>
          ))}
          <div className="drawer-user">{ROLE_LABEL[user.role]} — {user.full_name}</div>
          <button className="drawer-logout" onClick={logout}>⏏ Logout</button>
        </div>
      )}

      <main className="content">{renderPage()}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Shell />
        <ToastContainer position="bottom-right" autoClose={3000} newestOnTop theme="light" />
      </AppProvider>
    </AuthProvider>
  );
}
