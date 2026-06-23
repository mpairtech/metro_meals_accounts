import React, { useState, useEffect, useCallback } from 'react';
import { getInventory, getStock, getPriceHistory, addInventoryTx, deleteInventoryTx, downloadCSV } from '../api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { fmt, fmtNum, today, dateLabel, dtLabel, currentMonth } from '../utils';
import { toast } from 'react-toastify';

const TABS = ['Stock In', 'Stock Out', 'Stock Overview', 'Daily Transactions', 'Monthly Summary', 'Price History'];

// ── Bulk Entry Form — defined OUTSIDE Inventory to prevent remount ──
function BulkEntryForm({ type, inventoryHeads, stock, entryDate, setEntryDate,
  quantities, setQuantities, prices, setPrices, notes, setNotes,
  saving, handleSaveBulk, resetForm }) {

  const color   = type === 'in' ? 'var(--green)' : 'var(--red)';
  const bgColor = type === 'in' ? 'var(--green-soft)' : 'var(--red-soft)';
  const label   = type === 'in' ? 'Stock In' : 'Stock Out';
  const emoji   = type === 'in' ? '📥' : '📤';

  const rowTotal = (headId) => (parseFloat(quantities[headId]) || 0) * (parseFloat(prices[headId]) || 0);
  const grandTotal = inventoryHeads.reduce((s, h) => s + rowTotal(h.id), 0);
  const filledCount = inventoryHeads.filter(h => parseFloat(quantities[h.id]) > 0).length;

  return (
    <div>
      <div className="date-bar" style={{ marginBottom: '1.2rem' }}>
        <label>📅 Date</label>
        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
          {filledCount > 0 ? `${filledCount} product(s) filled` : 'Fill quantities below'}
        </span>
      </div>

      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div className="card-header" style={{ background: bgColor, color }}>
          {emoji} {label} — {dateLabel(entryDate)}
        </div>

        {/* Desktop header */}
        <div className="bulk-desktop-header" style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 100px 110px 120px 100px',
          background: '#1a1a1a',
          padding: '8px 12px',
          fontSize: 11, fontWeight: 700, color: '#fff',
          letterSpacing: '.5px', textTransform: 'uppercase',
        }}>
          <div>Product</div>
          <div style={{ textAlign: 'right' }}>Stock</div>
          <div style={{ textAlign: 'right' }}>Quantity</div>
          <div style={{ textAlign: 'right' }}>Unit Price (৳)</div>
          <div style={{ textAlign: 'right' }}>Total</div>
        </div>

        {inventoryHeads.map((h, i) => {
          const stockInfo    = stock.find(s => s.id === h.id);
          const currentStock = stockInfo ? parseFloat(stockInfo.current_stock) : 0;
          const filled       = parseFloat(quantities[h.id]) > 0;
          const rowBg        = filled
            ? (type === 'in' ? '#f0fff4' : '#fff5f5')
            : (i % 2 === 0 ? '#fff' : '#fafafa');

          return (
            <div key={h.id} style={{ borderBottom: '1px solid #f0f0f0', background: rowBg, transition: 'background .1s' }}>

              {/* Desktop row */}
              <div className="bulk-desktop-row" style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 100px 110px 120px 100px',
                padding: '8px 12px',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontWeight: filled ? 600 : 400, fontSize: 14, color: filled ? color : 'var(--text)' }}>
                    {h.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({h.unit})</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: currentStock > 0 ? 'var(--green)' : currentStock < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                    {currentStock.toFixed(3)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="number" min="0" step="0.001"
                    value={quantities[h.id] || ''}
                    onChange={e => setQuantities(p => ({ ...p, [h.id]: e.target.value }))}
                    placeholder="0"
                    style={{
                      width: 88, border: `1.5px solid ${filled ? color : 'var(--border)'}`,
                      borderRadius: 8, padding: '6px 8px', fontSize: 13,
                      fontFamily: 'inherit', outline: 'none', textAlign: 'right',
                      background: filled ? '#fff' : '#fafafa',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <input
                    type="number" min="0" step="0.01"
                    value={prices[h.id] || ''}
                    onChange={e => setPrices(p => ({ ...p, [h.id]: e.target.value }))}
                    placeholder="0.00"
                    style={{
                      width: 100,
                      border: `1.5px solid ${filled && !prices[h.id] ? 'var(--red)' : filled ? color : 'var(--border)'}`,
                      borderRadius: 8, padding: '6px 8px', fontSize: 13,
                      fontFamily: 'inherit', outline: 'none', textAlign: 'right',
                      background: filled ? '#fff' : '#fafafa',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: filled ? color : 'var(--text-muted)' }}>
                  {filled ? fmt(rowTotal(h.id)) : '—'}
                </div>
              </div>

              {/* Mobile card row */}
              <div className="bulk-mobile-row" style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: filled ? 600 : 500, fontSize: 14, color: filled ? color : 'var(--text)' }}>
                      {h.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 5 }}>({h.unit})</span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: currentStock > 0 ? 'var(--green-soft)' : 'var(--red-soft)',
                    color: currentStock > 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {currentStock.toFixed(2)} {h.unit}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, alignItems: 'end' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Quantity</div>
                    <input
                      type="number" min="0" step="0.001"
                      value={quantities[h.id] || ''}
                      onChange={e => setQuantities(p => ({ ...p, [h.id]: e.target.value }))}
                      placeholder="0"
                      style={{
                        width: '100%', border: `1.5px solid ${filled ? color : 'var(--border)'}`,
                        borderRadius: 8, padding: '8px 8px', fontSize: 14,
                        fontFamily: 'inherit', outline: 'none', textAlign: 'right',
                        background: '#fff', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Unit Price</div>
                    <input
                      type="number" min="0" step="0.01"
                      value={prices[h.id] || ''}
                      onChange={e => setPrices(p => ({ ...p, [h.id]: e.target.value }))}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        border: `1.5px solid ${filled && !prices[h.id] ? 'var(--red)' : filled ? color : 'var(--border)'}`,
                        borderRadius: 8, padding: '8px 8px', fontSize: 14,
                        fontFamily: 'inherit', outline: 'none', textAlign: 'right',
                        background: '#fff', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Total</div>
                    <div style={{
                      padding: '8px 8px', borderRadius: 8,
                      background: filled ? bgColor : '#f5f5f5',
                      fontSize: 14, fontWeight: 700,
                      color: filled ? color : 'var(--text-muted)',
                      textAlign: 'right',
                      border: `1.5px solid ${filled ? color : 'var(--border)'}`,
                    }}>
                      {filled ? fmt(rowTotal(h.id)) : '—'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })}

        {/* Grand total footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: bgColor,
          borderTop: `2px solid ${color}`, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color }}>
            TOTAL — {filledCount} product(s)
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color }}>
            {fmt(grandTotal)}
          </div>
        </div>
      </div>

      {/* Notes */}
      {filledCount > 0 && (
        <div className="card" style={{ marginBottom: '1.2rem' }}>
          <div className="card-header neutral">📝 Notes (Optional)</div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inventoryHeads.filter(h => parseFloat(quantities[h.id]) > 0).map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)', width: 120, flexShrink: 0 }}>{h.name}</label>
                  <input
                    type="text"
                    value={notes[h.id] || ''}
                    onChange={e => setNotes(p => ({ ...p, [h.id]: e.target.value }))}
                    placeholder="optional note…"
                    style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={() => handleSaveBulk(type)}
          disabled={saving || filledCount === 0}
        >
          {saving
            ? <><span className="loader"></span> Saving…</>
            : `${emoji} Save ${label} (${filledCount} product${filledCount !== 1 ? 's' : ''})`
          }
        </button>
        <button className="btn btn-secondary" onClick={resetForm}>🔄 Clear All</button>
      </div>
    </div>
  );
}

// ── Main Inventory Component ──────────────────────────────────
export default function Inventory() {
  const { inventoryHeads } = useApp();
  const { can } = useAuth();
  const [tab, setTab] = useState(0);

  const [entryDate, setEntryDate] = useState(today());
  const [quantities, setQuantities] = useState({});
  const [prices, setPrices] = useState({});
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(false);

  const [stock, setStock] = useState([]);
  const [txs, setTxs] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(currentMonth());
  const [monthTxs, setMonthTxs] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadStock = useCallback(async () => {
    try { setStock(await getStock()); } catch {}
  }, []);

  const loadTxs = useCallback(async () => {
    try { setTxs(await getInventory({ date })); } catch {}
  }, [date]);

  const loadMonth = useCallback(async () => {
    try { setMonthTxs(await getInventory({ month })); } catch {}
  }, [month]);

  const loadPH = useCallback(async () => {
    try { setPriceHistory(await getPriceHistory()); } catch {}
  }, []);

  useEffect(() => { loadStock(); }, [loadStock]);
  useEffect(() => { if (tab === 3) loadTxs(); }, [tab, loadTxs]);
  useEffect(() => { if (tab === 4) loadMonth(); }, [tab, loadMonth]);
  useEffect(() => { if (tab === 5) loadPH(); }, [tab, loadPH]);

  useEffect(() => {
    if ((tab === 0 || tab === 1) && stock.length > 0) {
      setPrices(prev => {
        const merged = {};
        stock.forEach(s => { if (s.last_price) merged[s.id] = s.last_price; });
        Object.keys(prev).forEach(k => { if (prev[k]) merged[k] = prev[k]; });
        return merged;
      });
    }
  }, [tab, stock]);

  const resetForm = () => {
    setQuantities({});
    setPrices({});
    setNotes({});
    setEntryDate(today());
  };

  const handleSaveBulk = async (type) => {
    const items = inventoryHeads.filter(h => parseFloat(quantities[h.id]) > 0);
    if (items.length === 0) { toast.error('Enter at least one quantity'); return; }
    const missingPrice = items.find(h => !parseFloat(prices[h.id]));
    if (missingPrice) { toast.error(`Enter unit price for: ${missingPrice.name}`); return; }
    setSaving(true);
    let successCount = 0;
    try {
      for (const h of items) {
        await addInventoryTx({
          transaction_date: entryDate,
          head_id: h.id,
          type,
          quantity: parseFloat(quantities[h.id]),
          unit_price: parseFloat(prices[h.id]),
          notes: notes[h.id] || '',
        });
        successCount++;
      }
      toast.success(`✅ ${successCount} product(s) saved as Stock ${type === 'in' ? 'In' : 'Out'}`);
      resetForm();
      loadStock();
    } catch (e) {
      toast.error(`Failed after ${successCount} items: ` + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try { await deleteInventoryTx(id); toast.success('Deleted'); loadStock(); loadTxs(); loadMonth(); }
    catch { toast.error('Delete failed'); }
  };

  const getMonthSummary = () => monthTxs.reduce((acc, t) => {
    if (!acc[t.head_id]) acc[t.head_id] = {
      product_name: t.product_name, unit: t.unit,
      total_in: 0, total_out: 0, total_in_value: 0, total_out_value: 0
    };
    if (t.type === 'in') {
      acc[t.head_id].total_in += parseFloat(t.quantity);
      acc[t.head_id].total_in_value += parseFloat(t.total_price);
    } else {
      acc[t.head_id].total_out += parseFloat(t.quantity);
      acc[t.head_id].total_out_value += parseFloat(t.total_price);
    }
    return acc;
  }, {});

  const handleLoadMonth = async () => {
    try {
      if (dateFrom && dateTo) {
        const all = await getInventory({});
        setMonthTxs(all.filter(t => t.transaction_date >= dateFrom && t.transaction_date <= dateTo));
      } else if (month) {
        setMonthTxs(await getInventory({ month }));
      } else {
        toast.error('Select a month or date range');
      }
    } catch { toast.error('Failed to load'); }
  };

  const exportDailyCSV = () => {
    downloadCSV(`Inventory_Daily_${date}.csv`,
      ['Date', 'Product', 'Unit', 'Type', 'Quantity', 'Unit Price', 'Total'],
      txs.map(t => [dateLabel(t.transaction_date), t.product_name, t.unit,
        t.type.toUpperCase(), t.quantity, fmtNum(t.unit_price), fmtNum(t.total_price)])
    );
  };

  const exportMonthCSV = () => {
    const summary = getMonthSummary();
    const rangeLabel = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : month;
    downloadCSV(`Inventory_${rangeLabel}.csv`,
      ['Product', 'Unit', 'Total In (Qty)', 'Total Out (Qty)', 'Net Stock', 'In Value', 'Out Value', 'Net Value'],
      Object.values(summary).sort((a, b) => a.product_name.localeCompare(b.product_name)).map(t => [
        t.product_name, t.unit,
        t.total_in.toFixed(3), t.total_out.toFixed(3),
        (t.total_in - t.total_out).toFixed(3) + ' ' + t.unit,
        fmtNum(t.total_in_value), fmtNum(t.total_out_value),
        fmtNum(t.total_in_value - t.total_out_value)
      ])
    );
  };

  const bulkProps = {
    inventoryHeads, stock, entryDate, setEntryDate,
    quantities, setQuantities, prices, setPrices,
    notes, setNotes, saving, handleSaveBulk, resetForm,
  };

  return (
    <div>
      <div className="page-header">
        <h1>Inventory</h1>
        <p>Bulk stock in/out by date. All products listed — fill what you need.</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <button key={i} className={`btn ${tab === i ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (can('admin', 'manager')
        ? <BulkEntryForm type="in" {...bulkProps} />
        : <div className="empty-state"><div className="icon">🔒</div><p>Access denied.</p></div>
      )}

      {tab === 1 && (can('admin', 'manager')
        ? <BulkEntryForm type="out" {...bulkProps} />
        : <div className="empty-state"><div className="icon">🔒</div><p>Access denied.</p></div>
      )}

      {tab === 2 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit</th>
                <th className="td-right">Total In</th>
                <th className="td-right">Total Out</th>
                <th className="td-right">Current Stock</th>
                <th className="td-right">Last Price</th>
              </tr>
            </thead>
            <tbody>
              {stock.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No inventory data yet.</td></tr>
                : stock.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td className="td-muted">{s.unit}</td>
                    <td className="td-right" style={{ color: 'var(--green)' }}>{parseFloat(s.total_in).toFixed(3)}</td>
                    <td className="td-right" style={{ color: 'var(--red)' }}>{parseFloat(s.total_out).toFixed(3)}</td>
                    <td className="td-right">
                      <span className={`badge ${parseFloat(s.current_stock) >= 0 ? 'badge-green' : 'badge-red'}`}>
                        {parseFloat(s.current_stock).toFixed(3)} {s.unit}
                      </span>
                    </td>
                    <td className="td-right">{s.last_price ? fmt(s.last_price) : '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {tab === 3 && (
        <div>
          <div className="toolbar">
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.8px' }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={loadTxs}>Load</button>
            {txs.length > 0 && <button className="btn btn-secondary btn-sm" onClick={exportDailyCSV}>⬇ CSV</button>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Unit</th><th>Type</th>
                  <th className="td-right">Qty</th>
                  <th className="td-right">Unit Price</th>
                  <th className="td-right">Total</th>
                  <th>Notes</th>
                  {can('admin') && <th></th>}
                </tr>
              </thead>
              <tbody>
                {txs.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No transactions for {dateLabel(date)}.</td></tr>
                  : txs.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.product_name}</td>
                      <td className="td-muted">{t.unit}</td>
                      <td><span className={`badge ${t.type === 'in' ? 'badge-green' : 'badge-red'}`}>{t.type === 'in' ? '📥 In' : '📤 Out'}</span></td>
                      <td className="td-right">{parseFloat(t.quantity).toFixed(3)}</td>
                      <td className="td-right">{fmt(t.unit_price)}</td>
                      <td className="td-right" style={{ fontWeight: 600 }}>{fmt(t.total_price)}</td>
                      <td className="td-muted">{t.notes || '—'}</td>
                      {can('admin') && <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(t.id)}>✕</button></td>}
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 4 && (
        <div>
          <div className="toolbar">
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.8px' }}>Month</label>
            <input type="month" value={month} onChange={e => { setMonth(e.target.value); setDateFrom(''); setDateTo(''); }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.8px' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setMonth(''); }} />
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.8px' }}>To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setMonth(''); }} />
            <button className="btn btn-primary btn-sm" onClick={handleLoadMonth}>Load</button>
            {monthTxs.length > 0 && <button className="btn btn-secondary btn-sm" onClick={exportMonthCSV}>⬇ CSV</button>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Unit</th>
                  <th className="td-right">Total In</th>
                  <th className="td-right">Total Out</th>
                  <th className="td-right">In Value</th>
                  <th className="td-right">Out Value</th>
                  <th className="td-right">Net Stock</th>
                  <th className="td-right">Net Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(getMonthSummary()).length === 0
                  ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data for this period.</td></tr>
                  : Object.values(getMonthSummary())
                    .sort((a, b) => a.product_name.localeCompare(b.product_name))
                    .map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{s.product_name}</td>
                        <td className="td-muted">{s.unit}</td>
                        <td className="td-right" style={{ color: 'var(--green)' }}>{s.total_in.toFixed(3)}</td>
                        <td className="td-right" style={{ color: 'var(--red)' }}>{s.total_out.toFixed(3)}</td>
                        <td className="td-right">{fmt(s.total_in_value)}</td>
                        <td className="td-right">{fmt(s.total_out_value)}</td>
                        <td className="td-right">
                          <span className={`badge ${s.total_in - s.total_out >= 0 ? 'badge-green' : 'badge-red'}`}>
                            {(s.total_in - s.total_out).toFixed(3)} {s.unit}
                          </span>
                        </td>
                        <td className="td-right">
                          <span className={`badge ${s.total_in_value - s.total_out_value >= 0 ? 'badge-green' : 'badge-red'}`}>
                            {fmt(s.total_in_value - s.total_out_value)}
                          </span>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 5 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th><th>Product</th>
                <th className="td-right">Previous Price</th>
                <th className="td-right">New Price</th>
                <th className="td-right">Change</th>
                <th>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {priceHistory.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No price changes recorded yet.</td></tr>
                : priceHistory.map(p => {
                  const diff = parseFloat(p.new_price) - parseFloat(p.previous_price);
                  return (
                    <tr key={p.id}>
                      <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{dtLabel(p.changed_at)}</td>
                      <td style={{ fontWeight: 500 }}>{p.product_name} <span className="td-muted">({p.unit})</span></td>
                      <td className="td-right">{fmt(p.previous_price)}</td>
                      <td className="td-right" style={{ fontWeight: 600 }}>{fmt(p.new_price)}</td>
                      <td className="td-right">
                        <span className={`badge ${diff >= 0 ? 'badge-green' : 'badge-red'}`}>
                          {diff >= 0 ? '+' : ''}{fmtNum(diff)}
                        </span>
                      </td>
                      <td className="td-muted">{p.changed_by_name || '—'}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}