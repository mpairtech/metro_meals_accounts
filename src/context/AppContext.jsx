import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getHeads } from '../api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [incomeHeads, setIncomeHeads]         = useState([]);
  const [expenseHeads, setExpenseHeads]       = useState([]);
  const [commissionHeads, setCommissionHeads] = useState([]);
  const [inventoryHeads, setInventoryHeads]   = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHeads = useCallback(async () => {
    const token = localStorage.getItem('mm_token');
    if (!token) return;   // ← do nothing if not logged in
    setLoading(true);
    try {
      const [inc, exp, com, inv] = await Promise.all([
        getHeads('income'), getHeads('expense'),
        getHeads('commission'), getHeads('inventory'),
      ]);
      setIncomeHeads(inc.filter(h => h.is_active));
      setExpenseHeads(exp.filter(h => h.is_active));
      setCommissionHeads(com.filter(h => h.is_active));
      setInventoryHeads(inv.filter(h => h.is_active));
    } catch (e) {
      console.error('Failed to load heads', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHeads(); }, [loadHeads]);

  return (
    <AppContext.Provider value={{ incomeHeads, expenseHeads, commissionHeads, inventoryHeads, loadHeads, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);