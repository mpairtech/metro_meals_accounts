import React, { useState, useEffect, useCallback } from 'react';
import { getEntries, deleteEntry } from '../api';
import { fmt, currentMonth, dateLabel, fmtNum } from '../utils';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { downloadCSV } from '../api';

export default function Records() {
  const { can } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setEntries(await getEntries(month || undefined)); }
    catch (e) { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete entry for ${dateLabel(entry.entry_date)}?`)) return;
    try { await deleteEntry(entry.id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const handleCSV = () => {
    downloadCSV(
      `Records_${month||'all'}.csv`,
      ['Date','Total Income','Total Expense','Commissions','Balance','Notes'],
      entries.map(e => {
        const bal = (parseFloat(e.total_income)+parseFloat(e.closing_inventory||0))
          - (parseFloat(e.total_expense)+parseFloat(e.total_commission)+parseFloat(e.opening_inventory||0));
        return [dateLabel(e.entry_date), fmtNum(e.total_income), fmtNum(e.total_expense), fmtNum(e.total_commission), fmtNum(bal), e.notes||''];
      })
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Records</h1>
        <p>View and manage all saved daily entries.</p>
      </div>

      <div className="toolbar">
        <label style={{ fontSize:12, fontWeight:700, color:'var(--red)', textTransform:'uppercase', letterSpacing:'.8px' }}>Month</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        <button className="btn btn-secondary btn-sm" onClick={() => setMonth('')}>Show All</button>
        {entries.length > 0 && <button className="btn btn-secondary btn-sm" onClick={handleCSV}>⬇ CSV</button>}
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-muted)' }}>{entries.length} record(s)</span>
      </div>

      {/* Summary strip */}
      {entries.length > 0 && (() => {
        const totInc = entries.reduce((s,e)=>s+parseFloat(e.total_income||0),0);
        const totExp = entries.reduce((s,e)=>s+parseFloat(e.total_expense||0),0);
        const totCom = entries.reduce((s,e)=>s+parseFloat(e.total_commission||0),0);
        const totBal = entries.reduce((s,e)=>{
          const b=(parseFloat(e.total_income)+parseFloat(e.closing_inventory||0))
            -(parseFloat(e.total_expense)+parseFloat(e.total_commission)+parseFloat(e.opening_inventory||0));
          return s+b;
        },0);
        return (
          <div className="grid-4" style={{ marginBottom:'1.2rem' }}>
            <div className="stat-card green"><div className="stat-label">Total Income</div><div className="stat-value">{fmt(totInc)}</div></div>
            <div className="stat-card red"><div className="stat-label">Total Expense</div><div className="stat-value">{fmt(totExp)}</div></div>
            <div className="stat-card amber"><div className="stat-label">Commissions</div><div className="stat-value">{fmt(totCom)}</div></div>
            <div className={`stat-card ${totBal>=0?'green':'red'}`}><div className="stat-label">Net Balance</div><div className="stat-value">{fmt(totBal)}</div></div>
          </div>
        );
      })()}

      {loading ? (
        <div className="empty-state"><div className="icon">⏳</div><p>Loading…</p></div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><div className="icon">📋</div><p>No entries found.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="td-right">Income</th>
                <th className="td-right">Expense</th>
                <th className="td-right">Commission</th>
                <th className="td-right">Balance</th>
                <th>Notes</th>
                {can('admin') && <th></th>}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const bal = (parseFloat(e.total_income)+parseFloat(e.closing_inventory||0))
                  -(parseFloat(e.total_expense)+parseFloat(e.total_commission)+parseFloat(e.opening_inventory||0));
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight:500 }}>{dateLabel(e.entry_date)}</td>
                    <td className="td-right" style={{ color:'var(--green)' }}>{fmt(e.total_income)}</td>
                    <td className="td-right" style={{ color:'var(--red)' }}>{fmt(e.total_expense)}</td>
                    <td className="td-right" style={{ color:'var(--amber)' }}>{fmt(e.total_commission)}</td>
                    <td className="td-right">
                      <span className={`badge ${bal>=0?'badge-green':'badge-red'}`}>{fmt(bal)}</span>
                    </td>
                    <td className="td-muted" style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.notes||'—'}</td>
                    {can('admin') && <td><button className="btn btn-danger btn-sm btn-icon" onClick={()=>handleDelete(e)}>✕</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
