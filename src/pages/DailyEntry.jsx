import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getEntry, saveEntry } from '../api';
import { today, fmt } from '../utils';
import { toast } from 'react-toastify';

function AmountInput({ value, onChange }) {
  return (
    <input type="number" className="amount-input" min="0" step="0.01"
      value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" />
  );
}

export default function DailyEntry() {
  const { incomeHeads, expenseHeads, commissionHeads, loading } = useApp();
  const [date, setDate] = useState(today());
  const [income, setIncome] = useState({});
  const [expenses, setExpenses] = useState({});
  const [commissions, setCommissions] = useState({});
  const [openingInv, setOpeningInv] = useState('');
  const [closingInv, setClosingInv] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [loadingEntry, setLoadingEntry] = useState(false);

  const resetForm = useCallback(() => {
    setIncome({}); setExpenses({}); setCommissions({});
    setOpeningInv(''); setClosingInv(''); setNotes(''); setExistingId(null);
  }, []);

  const loadEntry = useCallback(async (d) => {
    setLoadingEntry(true); resetForm();
    try {
      const entry = await getEntry(d);
      if (entry) {
        setExistingId(entry.id);
        setOpeningInv(entry.opening_inventory || '');
        setClosingInv(entry.closing_inventory || '');
        setNotes(entry.notes || '');
        const im = {}; entry.income.forEach(i => { im[i.head_id] = i.amount; }); setIncome(im);
        const em = {}; entry.expenses.forEach(i => { em[i.head_id] = i.amount; }); setExpenses(em);
        const cm = {}; entry.commissions.forEach(i => { cm[i.head_id] = i.amount; }); setCommissions(cm);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingEntry(false); }
  }, [resetForm]);

  useEffect(() => { if (date) loadEntry(date); }, [date, loadEntry]);

  const totalIncome     = incomeHeads.reduce((s, h) => s + (parseFloat(income[h.id]) || 0), 0);
  const totalExpense    = expenseHeads.reduce((s, h) => s + (parseFloat(expenses[h.id]) || 0), 0);
  const totalCommission = commissionHeads.reduce((s, h) => s + (parseFloat(commissions[h.id]) || 0), 0);
  const oi = parseFloat(openingInv) || 0;
  const ci = parseFloat(closingInv) || 0;
  const balance = (totalIncome + ci) - (totalExpense + totalCommission + oi);

  const handleSave = async () => {
    if (!date) { toast.error('Select a date'); return; }
    setSaving(true);
    try {
      await saveEntry({
        entry_date: date,
        opening_inventory: oi, closing_inventory: ci, notes,
        income:      incomeHeads.map(h => ({ head_id: h.id, amount: parseFloat(income[h.id]) || 0 })),
        expenses:    expenseHeads.map(h => ({ head_id: h.id, amount: parseFloat(expenses[h.id]) || 0 })),
        commissions: commissionHeads.map(h => ({ head_id: h.id, amount: parseFloat(commissions[h.id]) || 0 })),
      });
      toast.success(existingId ? '✅ Entry updated!' : '✅ Entry saved!');
      loadEntry(date);
    } catch (e) { toast.error('Failed: ' + (e.response?.data?.error || e.message)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="empty-state"><div className="icon">⏳</div><p>Loading…</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Daily Entry</h1>
        <p>Record income, expenses, commissions and inventory for a specific date.</p>
      </div>

      {/* Date bar */}
      <div className="date-bar">
        <label>📅 Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        {existingId && <span className="badge badge-green">Existing — will update</span>}
        {loadingEntry && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</span>}
      </div>

      {/* Live summary */}
      <div className="grid-4" style={{ marginBottom: '1.2rem' }}>
        <div className="stat-card green"><div className="stat-label">Income</div><div className="stat-value">{fmt(totalIncome)}</div></div>
        <div className="stat-card red"><div className="stat-label">Expenses</div><div className="stat-value">{fmt(totalExpense)}</div></div>
        <div className="stat-card amber"><div className="stat-label">Commissions</div><div className="stat-value">{fmt(totalCommission)}</div></div>
        <div className={`stat-card ${balance >= 0 ? 'green' : 'red'}`}>
          <div className="stat-label">Balance</div>
          <div className="stat-value">{fmt(balance)}</div>
          <div className="stat-sub">(Inc+ClInv)−(Exp+Com+OpInv)</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Income */}
        <div className="card">
          <div className="card-header income">💰 Income</div>
          <div className="card-body">
            {incomeHeads.map(h => (
              <div className="form-row" key={h.id}>
                <label>{h.name}</label>
                <AmountInput value={income[h.id] || ''} onChange={v => setIncome(p => ({ ...p, [h.id]: v }))} />
              </div>
            ))}
          </div>
        </div>

        {/* Commissions + Inventory stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="card">
            <div className="card-header commission">🤝 Commissions</div>
            <div className="card-body">
              {commissionHeads.map(h => (
                <div className="form-row" key={h.id}>
                  <label>{h.name}</label>
                  <AmountInput value={commissions[h.id] || ''} onChange={v => setCommissions(p => ({ ...p, [h.id]: v }))} />
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header inventory">📦 Inventory</div>
            <div className="card-body">
              <div className="form-row">
                <label>Opening Inventory</label>
                <AmountInput value={openingInv} onChange={setOpeningInv} />
              </div>
              <div className="form-row">
                <label>Closing Inventory</label>
                <AmountInput value={closingInv} onChange={setClosingInv} />
              </div>
            </div>
          </div>
        </div>

        {/* Expenses — full width responsive 2-col */}
        <div className="card full-span">
          <div className="card-header expense">📉 Expenses</div>
          <div className="expense-grid" style={{ padding: '0.5rem' }}>
            {expenseHeads.map(h => (
              <div className="form-row" key={h.id} style={{ padding: '6px 10px' }}>
                <label>{h.name}</label>
                <AmountInput value={expenses[h.id] || ''} onChange={v => setExpenses(p => ({ ...p, [h.id]: v }))} />
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="card full-span">
          <div className="card-header neutral">📝 Notes (Optional)</div>
          <div className="card-body">
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any notes for this day…"
              style={{ width: '100%', resize: 'vertical', fontSize: 13, padding: '8px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'inherit', outline: 'none' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: '1.2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="loader"></span> Saving…</> : existingId ? '✅ Update Entry' : '✅ Save Entry'}
        </button>
        <button className="btn btn-secondary" onClick={resetForm}>🔄 Clear</button>
      </div>
    </div>
  );
}
