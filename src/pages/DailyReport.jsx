import React, { useState } from 'react';
import { getDailyReport, downloadDailyPDF, downloadCSV, downloadHTML } from '../api';
import { today, fmt, fmtNum, dateLabel } from '../utils';
import { toast } from 'react-toastify';

function ReportLine({ label, value, isSubtotal, color }) {
  return (
    <div className={`report-line${isSubtotal?' subtotal':''}`} style={color?{color}:{}}>
      <span>{label}</span>
      <span style={{fontVariantNumeric:'tabular-nums'}}>{fmt(value)}</span>
    </div>
  );
}

export default function DailyReport() {
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!date) { toast.error('Select a date'); return; }
    setLoading(true); setReport(null);
    try {
      const data = await getDailyReport(date);
      if (!data) toast.warn('No entry for this date');
      else setReport(data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const handleCSV = () => {
    if (!report) return;
    const { income, expenses, commissions, entry, totalIncome, totalExpense, totalCommission, balance } = report;
    const rows = [
      ['=== INCOME ===',''],
      ...income.map(i=>['  '+i.name, fmtNum(i.amount)]),
      ['Total Income', fmtNum(totalIncome)],
      ['',''],
      ['=== COMMISSIONS ===',''],
      ...commissions.map(i=>['  '+i.name, fmtNum(i.amount)]),
      ['Total Commissions', fmtNum(totalCommission)],
      ['',''],
      ['=== INVENTORY ===',''],
      ['Opening Inventory', fmtNum(entry.opening_inventory)],
      ['Closing Inventory', fmtNum(entry.closing_inventory)],
      ['',''],
      ['=== EXPENSES ===',''],
      ...expenses.map(i=>['  '+i.name, fmtNum(i.amount)]),
      ['Total Expenses', fmtNum(totalExpense)],
      ['',''],
      ['NET BALANCE', fmtNum(balance)],
    ];
    downloadCSV(`DailyReport_${date}.csv`, ['Category','Amount (BDT)'], rows);
  };

  const handleHTML = () => {
    if (!report) return;
    const { income, expenses, commissions, entry, totalIncome, totalExpense, totalCommission, balance } = report;
    const isPos = balance >= 0;
    const line = (label, val, bold=false) =>
      `<tr style="border-bottom:1px solid #eee"><td style="padding:5px 8px;${bold?'font-weight:700':'color:#555'}">${label}</td><td style="padding:5px 8px;text-align:right;${bold?'font-weight:700':''}">${fmt(val)}</td></tr>`;
    const section = (title, color, rows) =>
      `<tr><td colspan="2" style="background:${color};padding:6px 8px;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase">${title}</td></tr>${rows}`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Daily Report — ${dateLabel(date)}</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;background:#f5f5f5}
.paper{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
.header{background:#CC1122;color:#fff;padding:24px 28px}
.header h2{margin:0;font-size:22px}.header p{margin:4px 0 0;opacity:.75;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px}
.balance{margin:0 20px 20px;padding:16px 20px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;border:2px solid ${isPos?'#4caf50':'#CC1122'};background:${isPos?'#e8f5e9':'#fdecea'}}
.bal-val{font-size:26px;font-weight:700;color:${isPos?'#1b5e20':'#CC1122'}}
</style></head><body><div class="paper">
<div class="header"><h2>Daily Report</h2><p>${dateLabel(date)}</p></div>
<div style="padding:16px 20px">
<table>
${section('Income','#e8f5e9', income.map(i=>line(i.name,i.amount)).join('')+line('Total Income',totalIncome,true))}
${section('Commissions','#fff8e1', commissions.map(i=>line(i.name,i.amount)).join('')+line('Total Commissions',totalCommission,true))}
${section('Inventory','#e3f2fd', line('Opening Inventory',entry.opening_inventory)+line('Closing Inventory',entry.closing_inventory))}
${section('Expenses','#fdecea', expenses.map(i=>line(i.name,i.amount)).join('')+line('Total Expenses',totalExpense,true))}
</table></div>
<div class="balance">
<div><strong>NET BALANCE</strong><div style="font-size:11px;opacity:.7;margin-top:4px">(Income+Closing Inv.) − (Expense+Commissions+Opening Inv.)</div></div>
<div class="bal-val">${isPos?'+':'−'} ${fmt(Math.abs(balance))}</div>
</div></div></body></html>`;
    downloadHTML(`DailyReport_${date}.html`, html);
  };

  return (
    <div>
      <div className="page-header"><h1>Daily Report</h1><p>View and download the report for a specific day.</p></div>
      <div className="date-bar">
        <label>📅 Date</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading?<><span className="loader"></span> Loading…</>:'📊 Generate'}
        </button>
        {report && <>
          <button className="btn btn-secondary" onClick={()=>downloadDailyPDF(date)}>⬇ PDF</button>
          <button className="btn btn-secondary" onClick={handleCSV}>⬇ CSV</button>
          <button className="btn btn-secondary" onClick={handleHTML}>⬇ HTML</button>
        </>}
      </div>

      {!report && !loading && <div className="empty-state"><div className="icon">📊</div><p>Select a date and click Generate.</p></div>}

      {report && (() => {
        const { entry, income, expenses, commissions, totalIncome, totalExpense, totalCommission, balance } = report;
        const oi=parseFloat(entry.opening_inventory), ci=parseFloat(entry.closing_inventory);
        return (
          <div>
            <div className={`balance-box ${balance>=0?'positive':'negative'}`} style={{marginBottom:'1.2rem'}}>
              <div>
                <div className="bal-label">Net Balance — {dateLabel(entry.entry_date)}</div>
                <div className="bal-formula">(Income + Closing Inv.) − (Expense + Commissions + Opening Inv.)</div>
                <div className="bal-formula" style={{marginTop:4}}>({fmt(totalIncome)} + {fmt(ci)}) − ({fmt(totalExpense)} + {fmt(totalCommission)} + {fmt(oi)})</div>
              </div>
              <div className="bal-value">{balance>=0?'+':'−'} {fmt(Math.abs(balance))}</div>
            </div>
            <div className="grid-2">
              <div className="card">
                <div className="card-header income">💰 Income</div>
                <div className="card-body">
                  {income.map(i=><ReportLine key={i.name} label={i.name} value={i.amount}/>)}
                  <ReportLine label="Total Income" value={totalIncome} isSubtotal color="var(--green)"/>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'1.2rem'}}>
                <div className="card">
                  <div className="card-header commission">🤝 Commissions</div>
                  <div className="card-body">
                    {commissions.map(i=><ReportLine key={i.name} label={i.name} value={i.amount}/>)}
                    <ReportLine label="Total Commissions" value={totalCommission} isSubtotal color="var(--amber)"/>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header inventory">📦 Inventory</div>
                  <div className="card-body">
                    <ReportLine label="Opening Inventory" value={oi}/>
                    <ReportLine label="Closing Inventory" value={ci}/>
                  </div>
                </div>
              </div>
              <div className="card full-span">
                <div className="card-header expense">📉 Expenses</div>
                <div className="card-body">
                  <div className="expense-grid" style={{gap:0}}>
                    {expenses.map(i=>(
                      <div className="report-line" key={i.name} style={{padding:'5px 8px'}}>
                        <span>{i.name}</span><span style={{fontVariantNumeric:'tabular-nums'}}>{fmt(i.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8}}><ReportLine label="Total Expenses" value={totalExpense} isSubtotal color="var(--red)"/></div>
                </div>
              </div>
            </div>
            {entry.notes&&<div className="card" style={{marginTop:'1.2rem'}}><div className="card-header neutral">📝 Notes</div><div className="card-body" style={{fontSize:13,color:'var(--text-muted)'}}>{entry.notes}</div></div>}
          </div>
        );
      })()}
    </div>
  );
}
