import React, { useState } from 'react';
import { login } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import logo from '../assets/logo.png';

export default function Login() {
  const { loginUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Enter username and password'); return; }
    setLoading(true);
    try {
      const data = await login(username, password);
      loginUser(data.token, data.user);
      toast.success(`Welcome, ${data.user.full_name}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 4px 24px rgba(0,0,0,.12)', width:'100%', maxWidth:400, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:'#CC1122', padding:'2rem', textAlign:'center' }}>
          <img src={logo} alt="Metro Meals" style={{ height:64, borderRadius:8, marginBottom:12 }} />
          <div style={{ color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:22 }}>Metro Meals</div>
          <div style={{ color:'rgba(255,255,255,.7)', fontSize:12, letterSpacing:'1.2px', textTransform:'uppercase', marginTop:4 }}>Finance Manager</div>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding:'2rem' }}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#CC1122', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:6 }}>Username</label>
            <input
              type="text" value={username} onChange={e=>setUsername(e.target.value)}
              placeholder="Enter username" autoFocus
              style={{ width:'100%', border:'1.5px solid #e0e0e0', borderRadius:8, padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none' }}
            />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#CC1122', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:6 }}>Password</label>
            <input
              type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ width:'100%', border:'1.5px solid #e0e0e0', borderRadius:8, padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none' }}
            />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', background:'#CC1122', color:'#fff', border:'none', borderRadius:8, padding:'11px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <><span className="loader"></span> Signing in…</> : '🔐 Sign In'}
          </button>
         
        </form>
      </div>
    </div>
  );
}
