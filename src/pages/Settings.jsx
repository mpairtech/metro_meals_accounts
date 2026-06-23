import React, { useState, useEffect, useCallback } from 'react';
import { getHeads, createHead, updateHead, deleteHead, getUsers, createUser, updateUser, deleteUser, getActivity } from '../api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { dtLabel } from '../utils';
import { toast } from 'react-toastify';

const TABS = ['Heads','Users','Activity Log'];

function HeadManager({ type, title, color, hasUnit }) {
  const { loadHeads } = useApp();
  const [heads, setHeads] = useState([]);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');

  const load = useCallback(async()=>{ try{ setHeads(await getHeads(type)); }catch{} },[type]);
  useEffect(()=>{ load(); },[load]);

  const handleAdd = async()=>{
    if(!newName.trim()){ toast.error('Enter a name'); return; }
    setLoading(true);
    try{ await createHead(type,newName.trim(),newUnit); setNewName(''); setNewUnit('pcs'); await load(); await loadHeads(); toast.success('Added'); }
    catch(e){ toast.error(e.response?.data?.error||'Failed'); }
    finally{ setLoading(false); }
  };

  const handleToggle = async(h)=>{
    try{ await updateHead(type,h.id,{name:h.name,is_active:h.is_active?0:1,unit:h.unit||'pcs'}); await load(); await loadHeads(); }
    catch{ toast.error('Update failed'); }
  };

  const handleDelete = async(h)=>{
    if(!window.confirm(`Delete "${h.name}"?`)) return;
    try{ await deleteHead(type,h.id); await load(); await loadHeads(); toast.success('Deleted'); }
    catch{ toast.error('Delete failed'); }
  };

  const startEdit=(h)=>{ setEditingId(h.id); setEditName(h.name); setEditUnit(h.unit||'pcs'); };
  const handleEditSave=async(h)=>{
    if(!editName.trim()) return;
    try{ await updateHead(type,h.id,{name:editName.trim(),is_active:h.is_active,unit:editUnit}); setEditingId(null); await load(); await loadHeads(); toast.success('Updated'); }
    catch{ toast.error('Update failed'); }
  };

  return (
    <div className="card" style={{marginBottom:'1.2rem'}}>
      <div className={`card-header ${color}`}>{title}</div>
      <div className="card-body">
        <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap'}}>
          <input type="text" placeholder={`New ${title.toLowerCase()} name…`} value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAdd()}
            style={{flex:1,minWidth:160,border:'1.5px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
          {hasUnit&&<input type="text" placeholder="unit (e.g. kg)" value={newUnit} onChange={e=>setNewUnit(e.target.value)} style={{width:90,border:'1.5px solid var(--border)',borderRadius:8,padding:'8px 10px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>}
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={loading}>+ Add</button>
        </div>
        <div className="heads-list">
          {heads.length===0&&<p style={{color:'var(--text-muted)',fontSize:13}}>No heads yet.</p>}
          {heads.map(h=>(
            <div className={`head-item ${!h.is_active?'inactive':''}`} key={h.id}>
              {editingId===h.id?(
                <div style={{display:'flex',gap:8,flex:1,flexWrap:'wrap'}}>
                  <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleEditSave(h)} autoFocus
                    style={{flex:1,border:'none',background:'transparent',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
                  {hasUnit&&<input type="text" value={editUnit} onChange={e=>setEditUnit(e.target.value)} style={{width:70,border:'1px solid var(--border)',borderRadius:6,padding:'2px 6px',fontSize:13,fontFamily:'inherit'}}/>}
                </div>
              ):(
                <span style={{flex:1,fontSize:14,color:h.is_active?'var(--text)':'var(--text-muted)'}}>{h.name}{hasUnit&&<span className="td-muted"> ({h.unit})</span>}</span>
              )}
              <div style={{display:'flex',gap:4}}>
                {editingId===h.id?(
                  <><button className="btn btn-primary btn-sm" onClick={()=>handleEditSave(h)}>Save</button><button className="btn btn-secondary btn-sm" onClick={()=>setEditingId(null)}>Cancel</button></>
                ):(
                  <><button className="btn btn-ghost btn-sm btn-icon" onClick={()=>startEdit(h)}>✏️</button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>handleToggle(h)} title={h.is_active?'Disable':'Enable'}>{h.is_active?'🟢':'⭕'}</button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={()=>handleDelete(h)}>✕</button></>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserManager() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username:'', full_name:'', password:'', role:'manager' });
  const [editId, setEditId] = useState(null);

  const load = useCallback(async()=>{ try{ setUsers(await getUsers()); }catch{} },[]);
  useEffect(()=>{ load(); },[load]);

  const handleSave = async()=>{
    if(!form.full_name||(!editId&&!form.username)||(!editId&&!form.password)){ toast.error('Fill required fields'); return; }
    try{
      if(editId){ await updateUser(editId,{full_name:form.full_name,role:form.role,is_active:1,password:form.password||undefined}); toast.success('Updated'); }
      else{ await createUser(form); toast.success('User created'); }
      setShowForm(false); setEditId(null); setForm({username:'',full_name:'',password:'',role:'manager'}); load();
    }catch(e){ toast.error(e.response?.data?.error||'Failed'); }
  };

  const startEdit=(u)=>{ setEditId(u.id); setForm({username:u.username,full_name:u.full_name,password:'',role:u.role}); setShowForm(true); };

  const handleDelete=async(u)=>{
    if(u.id===me?.id){ toast.error("Can't delete yourself"); return; }
    if(!window.confirm(`Delete user "${u.username}"?`)) return;
    try{ await deleteUser(u.id); toast.success('Deleted'); load(); }
    catch(e){ toast.error(e.response?.data?.error||'Failed'); }
  };

  const ROLE_COLORS = { admin:'#CC1122', manager:'#7c4a00', director:'#0d47a1' };

  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:'1.2rem',alignItems:'center'}}>
        <button className="btn btn-primary btn-sm" onClick={()=>{setShowForm(v=>!v);setEditId(null);setForm({username:'',full_name:'',password:'',role:'manager'});}}>
          {showForm&&!editId?'✕ Cancel':'+ Add User'}
        </button>
      </div>

      {showForm&&(
        <div className="card" style={{marginBottom:'1.2rem'}}>
          <div className="card-header neutral">{editId?'✏️ Edit User':'➕ New User'}</div>
          <div className="card-body">
            <div className="grid-2" style={{gap:'1rem',marginBottom:'1rem'}}>
              {!editId&&<div>
                <label style={{fontSize:12,fontWeight:700,color:'var(--red)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.7px'}}>Username *</label>
                <input type="text" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} style={{width:'100%',border:'1.5px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
              </div>}
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'var(--red)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.7px'}}>Full Name *</label>
                <input type="text" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} style={{width:'100%',border:'1.5px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'var(--red)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.7px'}}>Role *</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={{width:'100%'}}>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'var(--red)',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'.7px'}}>{editId?'New Password (leave blank to keep)':'Password *'}</label>
                <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={{width:'100%',border:'1.5px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-primary" onClick={handleSave}>✅ {editId?'Update':'Create'} User</button>
              <button className="btn btn-secondary" onClick={()=>{setShowForm(false);setEditId(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Full Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id}>
                <td style={{fontWeight:500}}>{u.full_name}</td>
                <td className="td-muted">{u.username}</td>
                <td><span className="badge" style={{background:ROLE_COLORS[u.role]+'22',color:ROLE_COLORS[u.role]}}>{u.role.charAt(0).toUpperCase()+u.role.slice(1)}</span></td>
                <td><span className={`badge ${u.is_active?'badge-green':'badge-red'}`}>{u.is_active?'Active':'Inactive'}</span></td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>startEdit(u)}>✏️</button>
                    {u.id!==me?.id&&<button className="btn btn-danger btn-sm btn-icon" onClick={()=>handleDelete(u)}>✕</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ getActivity({limit:200}).then(d=>setLogs(d.rows)).catch(()=>{}).finally(()=>setLoading(false)); },[]);
  const ACTION_COLORS = { CREATE:'var(--green)', UPDATE:'var(--amber)', DELETE:'var(--red)', LOGIN:'var(--blue)' };
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Description</th></tr></thead>
        <tbody>
          {loading?<tr><td colSpan={5} style={{textAlign:'center',padding:'2rem'}}>Loading…</td></tr>
          :logs.length===0?<tr><td colSpan={5} style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}>No activity yet.</td></tr>
          :logs.map(l=>(
            <tr key={l.id}>
              <td className="td-muted" style={{whiteSpace:'nowrap'}}>{dtLabel(l.created_at)}</td>
              <td style={{fontWeight:500}}>{l.username||'—'}</td>
              <td><span className="badge" style={{background:(ACTION_COLORS[l.action]||'#999')+'22',color:ACTION_COLORS[l.action]||'#999'}}>{l.action}</span></td>
              <td className="td-muted">{l.entity}</td>
              <td style={{fontSize:12,color:'var(--text-muted)'}}>{l.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Settings() {
  const { can } = useAuth();
  const [tab, setTab] = useState(0);

  return (
    <div>
      <div className="page-header"><h1>Settings</h1><p>Manage heads, users, and activity log.</p></div>
      <div style={{display:'flex',gap:4,marginBottom:'1.5rem',flexWrap:'wrap'}}>
        {TABS.map((t,i)=>(
          <button key={i} className={`btn ${tab===i?'btn-primary':'btn-secondary'} btn-sm`} onClick={()=>setTab(i)}>{t}</button>
        ))}
      </div>

      {tab===0&&(
        <div className="grid-2">
          <HeadManager type="income" title="Income Heads" color="income"/>
          <HeadManager type="commission" title="Commission Heads" color="commission"/>
          <HeadManager type="inventory" title="Inventory Products" color="inventory" hasUnit/>
          <div className="full-span"><HeadManager type="expense" title="Expense Heads" color="expense"/></div>
        </div>
      )}
      {tab===1&&can('admin')&&<UserManager/>}
      {tab===2&&can('admin')&&<ActivityLog/>}
    </div>
  );
}
