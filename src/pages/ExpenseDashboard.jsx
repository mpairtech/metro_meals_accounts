import React, { useState, useCallback, useRef } from 'react';
import { downloadCSV, downloadHTML } from '../api';
import { currentMonth, monthLabel } from '../utils';
import { toast } from 'react-toastify';

// Deterministic color per head name
const HEAD_COLORS = [
  '#CC1122','#1565C0','#2E7D32','#6A1B9A','#E65100',
  '#00695C','#AD1457','#4527A0','#558B2F','#00838F',
  '#F9A825','#37474F','#BF360C','#1A237E','#33691E',
  '#880E4F','#311B92','#827717','#01579B','#1B5E20',
];
function headColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return HEAD_COLORS[Math.abs(hash) % HEAD_COLORS.length];
}

const fmtAmt = (v) =>
  v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : null;

const fmtFull = (v) =>
  Number(v||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ExpenseDashboard() {
  const [month, setMonth]         = useState(currentMonth());
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [sortDay, setSortDay]     = useState(null); // null = natural order
  const tableRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!month) { toast.error('Select a month'); return; }
    setLoading(true);
    setTableData(null);
    setSortDay(null);
    try {
      const token = localStorage.getItem('mm_token');
      const base  = import.meta.env.VITE_API_URL || '/api';

      const rawRes = await fetch(`${base}/summary/expenses?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawText = await rawRes.text();
      if (!rawRes.ok) { toast.error('Server error: ' + rawText); return; }
      const entries = JSON.parse(rawText);
      if (!entries || entries.length === 0) { toast.warn('No data for this month'); return; }

      // Collect heads
      const headMap = {};
      entries.forEach(entry => {
        (entry.expenses || []).forEach(e => {
          if (!headMap[e.head_id]) headMap[e.head_id] = { id: e.head_id, name: e.name };
        });
      });
      const heads = Object.values(headMap).sort((a, b) => a.name.localeCompare(b.name));

      // Collect dates
      const dateSet = {};
      entries.forEach(entry => {
        const obj = entry.entry_date instanceof Date ? entry.entry_date : new Date(entry.entry_date);
        const key = `${obj.getUTCFullYear()}-${String(obj.getUTCMonth()+1).padStart(2,'0')}-${String(obj.getUTCDate()).padStart(2,'0')}`;
        dateSet[key] = { key, day: obj.getUTCDate() };
      });
      const dates = Object.values(dateSet).sort((a, b) => a.day - b.day);

      // Build matrix
      const matrix = {};
      const headTotals = {};
      const dateTotals = {};
      let grandTotal = 0;

      entries.forEach(entry => {
        const obj = entry.entry_date instanceof Date ? entry.entry_date : new Date(entry.entry_date);
        const key = `${obj.getUTCFullYear()}-${String(obj.getUTCMonth()+1).padStart(2,'0')}-${String(obj.getUTCDate()).padStart(2,'0')}`;
        (entry.expenses || []).forEach(e => {
          const amt = parseFloat(e.amount) || 0;
          if (!amt) return;
          if (!matrix[e.head_id]) matrix[e.head_id] = {};
          matrix[e.head_id][key] = (matrix[e.head_id][key] || 0) + amt;
          headTotals[e.head_id] = (headTotals[e.head_id] || 0) + amt;
          dateTotals[key] = (dateTotals[key] || 0) + amt;
          grandTotal += amt;
        });
      });

      setTableData({ heads, dates, matrix, headTotals, dateTotals, grandTotal });
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  const handleCSV = () => {
    if (!tableData) return;
    const { heads, dates, matrix, headTotals, dateTotals, grandTotal } = tableData;
    const headers = ['Expense Head', ...dates.map(d => d.day), 'Total'];
    const rows = [
      ...heads.map(h => [
        h.name,
        ...dates.map(d => matrix[h.id]?.[d.key] ? fmtFull(matrix[h.id][d.key]) : ''),
        fmtFull(headTotals[h.id] || 0)
      ]),
      ['Daily Total', ...dates.map(d => dateTotals[d.key] ? fmtFull(dateTotals[d.key]) : ''), fmtFull(grandTotal)]
    ];
    downloadCSV(`ExpenseDashboard_${month}.csv`, headers, rows);
  };

  const handleHTML = () => {
    if (!tableData) return;
    const { heads, dates, matrix, headTotals, dateTotals, grandTotal } = tableData;
    const thStyle = `style="padding:8px 12px;text-align:right;white-space:nowrap;font-size:12px;background:#1a1a1a;color:#fff;font-weight:600"`;
    const tdStyle = (v) => `style="padding:7px 12px;text-align:right;font-size:12px;color:${v?'#1a1a1a':'#ccc'};border-bottom:1px solid #f0f0f0"`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Expense Dashboard — ${monthLabel(month)}</title>
<style>body{font-family:Arial,sans-serif;background:#f5f5f5;padding:2rem}
.wrap{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
.header{background:#CC1122;color:#fff;padding:20px 24px}h2{margin:0;font-size:20px}p{margin:4px 0 0;opacity:.75;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px}
.sticky{position:sticky;left:0;background:#fff;z-index:1;border-right:2px solid #f0f0f0}
.total-row td{background:#1a1a1a;color:#fff;font-weight:700;padding:9px 12px;border:none}
.total-col{background:#fff3e0;color:#e65100;font-weight:700;position:sticky;right:0;border-left:1px solid #ffe0b2}
</style></head><body><div class="wrap">
<div class="header"><h2>Expense Dashboard — ${monthLabel(month)}</h2><p>Generated ${new Date().toLocaleDateString()}</p></div>
<div style="overflow-x:auto"><table>
<thead><tr>
<th style="padding:8px 14px;text-align:left;background:#1a1a1a;color:#fff;font-size:12px;position:sticky;left:0;z-index:2;min-width:180px">Expense Head</th>
${dates.map(d=>`<th ${thStyle}>${d.day}</th>`).join('')}
<th style="padding:8px 12px;text-align:right;background:#006064;color:#fff;font-size:12px;font-weight:700;position:sticky;right:0">Total</th>
</tr></thead>
<tbody>
${heads.map((h,i)=>`<tr style="background:${i%2===0?'#fff':'#fafafa'}">
<td style="padding:7px 14px;font-size:12px;color:#e53935;border-bottom:1px solid #f0f0f0;border-right:2px solid #f0f0f0;white-space:nowrap">${h.name}</td>
${dates.map(d=>{const v=matrix[h.id]?.[d.key];return`<td ${tdStyle(v)}>${v?fmtFull(v):'—'}</td>`;}).join('')}
<td style="padding:7px 12px;text-align:right;font-weight:700;font-size:12px;background:#fff3e0;color:#e65100;border-left:1px solid #ffe0b2">${fmtFull(headTotals[h.id]||0)}</td>
</tr>`).join('')}
<tr class="total-row">
<td style="padding:9px 14px;background:#1a1a1a;color:#fff;font-weight:700;font-size:12px">Daily Total</td>
${dates.map(d=>`<td style="padding:9px 12px;text-align:right;background:#263238;color:#fff;font-weight:700;font-size:12px;border-right:1px solid #37474f">${dateTotals[d.key]?fmtFull(dateTotals[d.key]):''}</td>`).join('')}
<td style="padding:9px 12px;text-align:right;background:#CC1122;color:#fff;font-weight:700;font-size:14px">৳ ${fmtFull(grandTotal)}</td>
</tr>
</tbody></table></div></div></body></html>`;
    downloadHTML(`ExpenseDashboard_${month}.html`, html);
  };

  // Sort dates by amount for a given day (toggle)
  const displayDates = tableData
    ? (sortDay
        ? [...tableData.dates].sort((a, b) =>
            (tableData.dateTotals[b.key]||0) - (tableData.dateTotals[a.key]||0))
        : tableData.dates)
    : [];

  return (
    <div>
      <div className="page-header">
        <h1>Expense Dashboard</h1>
        <p>Daily breakdown of expense heads across the month.</p>
      </div>

      {/* Controls */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 12, padding: '1rem 1.2rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
        flexWrap: 'wrap', marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,.06)'
      }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.8px' }}>
          📅 Month
        </label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
        />
        <button className="btn btn-primary" onClick={loadData} disabled={loading}>
          {loading ? <><span className="loader"></span> Loading…</> : '📊 Generate'}
        </button>
        {tableData && <>
          <button className="btn btn-secondary" onClick={handleCSV}>⬇ CSV</button>
          <button className="btn btn-secondary" onClick={handleHTML}>⬇ HTML</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {tableData.heads.length} expense heads · {tableData.dates.length} days
          </span>
        </>}
      </div>

      {/* Empty / loading */}
      {!tableData && !loading && (
        <div className="empty-state"><div className="icon">📊</div><p>Select a month and click Generate.</p></div>
      )}
      {loading && (
        <div className="empty-state"><div className="icon">⏳</div><p>Building dashboard…</p></div>
      )}

      {/* Summary cards */}
      {tableData && (
        <>
          <div className="grid-4" style={{ marginBottom: '1.2rem' }}>
            <div className="stat-card red">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value" style={{ fontSize: 20 }}>৳ {fmtFull(tableData.grandTotal)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Expense Heads</div>
              <div className="stat-value">{tableData.heads.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Days Recorded</div>
              <div className="stat-value">{tableData.dates.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Daily Average</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                ৳ {fmtFull(tableData.grandTotal / (tableData.dates.length || 1))}
              </div>
            </div>
          </div>

          {/* Main table */}
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid var(--border)',
            boxShadow: '0 1px 6px rgba(0,0,0,.06)',
            overflow: 'hidden',
          }}>
            {/* Table header bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>
                Daily Breakdown — {monthLabel(month)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Scroll horizontally to view all days
              </div>
            </div>

            {/* Scrollable table */}
            <div ref={tableRef} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: displayDates.length * 80 + 240,
                width: '100%',
              }}>
                <thead>
                  <tr>
                    {/* Sticky first column header */}
                    <th style={{
                      position: 'sticky', left: 0, zIndex: 3,
                      background: '#f8f8f8',
                      padding: '10px 18px',
                      textAlign: 'left',
                      fontSize: 12, fontWeight: 600, color: '#888',
                      borderRight: '2px solid #e8e8e8',
                      borderBottom: '2px solid #e8e8e8',
                      minWidth: 200, whiteSpace: 'nowrap',
                    }}>
                      Expense Head
                    </th>

                    {/* Date columns */}
                    {displayDates.map(d => {
                      const total = tableData.dateTotals[d.key] || 0;
                      const max   = Math.max(...Object.values(tableData.dateTotals));
                      const pct   = max ? (total / max) : 0;
                      return (
                        <th key={d.key} style={{
                          padding: '0',
                          textAlign: 'center',
                          fontSize: 12, fontWeight: 600,
                          color: '#555',
                          minWidth: 72,
                          borderBottom: '2px solid #e8e8e8',
                          borderRight: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          background: '#f8f8f8',
                        }}
                          onClick={() => setSortDay(v => v === d.key ? null : d.key)}
                          title={`Sort by day ${d.day}`}
                        >
                          <div style={{ padding: '8px 6px 4px' }}>{d.day}</div>
                          {/* Heat bar */}
                          <div style={{
                            height: 3,
                            background: `rgba(204,17,34,${0.15 + pct * 0.85})`,
                            margin: '0 6px 6px',
                            borderRadius: 2,
                          }} />
                        </th>
                      );
                    })}

                    {/* Total column header */}
                    <th style={{
                      position: 'sticky', right: 0, zIndex: 3,
                      background: '#fff3e0',
                      padding: '10px 14px',
                      textAlign: 'right',
                      fontSize: 12, fontWeight: 700, color: '#e65100',
                      borderLeft: '2px solid #ffe0b2',
                      borderBottom: '2px solid #e8e8e8',
                      minWidth: 110, whiteSpace: 'nowrap',
                    }}>
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {tableData.heads.map((h, i) => {
                    const color = headColor(h.name);
                    const rowTotal = tableData.headTotals[h.id] || 0;
                    return (
                      <tr key={h.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        {/* Sticky name cell */}
                        <td style={{
                          position: 'sticky', left: 0, zIndex: 1,
                          background: i % 2 === 0 ? '#fff' : '#fafafa',
                          padding: '8px 18px',
                          borderRight: '2px solid #e8e8e8',
                          borderBottom: '1px solid #f5f5f5',
                          whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: color, flexShrink: 0, display: 'inline-block'
                          }} />
                          <span style={{ fontSize: 13, color: '#333', fontWeight: 400 }}>{h.name}</span>
                        </td>

                        {/* Value cells */}
                        {displayDates.map(d => {
                          const val = tableData.matrix[h.id]?.[d.key];
                          return (
                            <td key={d.key} style={{
                              padding: '8px 10px',
                              textAlign: 'right',
                              fontSize: 13,
                              color: val ? '#1a1a1a' : '#ccc',
                              borderBottom: '1px solid #f5f5f5',
                              borderRight: '1px solid #f5f5f5',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}>
                              {val ? fmtAmt(val) : '—'}
                            </td>
                          );
                        })}

                        {/* Row total */}
                        <td style={{
                          position: 'sticky', right: 0, zIndex: 1,
                          background: '#fff3e0',
                          padding: '8px 14px',
                          textAlign: 'right',
                          fontWeight: 700, fontSize: 13,
                          color: '#e65100',
                          borderLeft: '2px solid #ffe0b2',
                          borderBottom: '1px solid #f5f5f5',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}>
                          {fmtAmt(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Daily total row */}
                  <tr>
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 2,
                      background: '#1a1a1a', color: '#fff',
                      padding: '10px 18px',
                      fontWeight: 700, fontSize: 13,
                      borderTop: '2px solid #000',
                      whiteSpace: 'nowrap',
                    }}>
                      Daily total
                    </td>
                    {displayDates.map(d => {
                      const val = tableData.dateTotals[d.key];
                      return (
                        <td key={d.key} style={{
                          padding: '10px 10px',
                          textAlign: 'right',
                          fontWeight: 700, fontSize: 13,
                          background: '#263238', color: '#fff',
                          borderTop: '2px solid #000',
                          borderRight: '1px solid #37474f',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}>
                          {val ? fmtAmt(val) : ''}
                        </td>
                      );
                    })}
                    <td style={{
                      position: 'sticky', right: 0, zIndex: 2,
                      background: '#CC1122', color: '#fff',
                      padding: '10px 14px',
                      textAlign: 'right',
                      fontWeight: 700, fontSize: 15,
                      borderTop: '2px solid #000',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}>
                      ৳ {fmtFull(tableData.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <div style={{
              padding: '10px 18px',
              fontSize: 11, color: '#aaa',
              borderTop: '1px solid var(--border)',
              background: '#fafafa',
            }}>
              Figures in BDT. Scroll horizontally to view all {tableData.dates.length} days.
              Click a column header to sort by daily total.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
