'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Camera, TrendingUp, TrendingDown, Plus, Filter, Download, LogOut, Moon, Sun, BarChart3, Home, Percent } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signIn, signOut } from '@/lib/auth';
import { getSetups, addSetup, updateSetup, Setup } from '@/lib/db';

const TradingJournalApp = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'new' | 'detail' | 'login' | 'analytics'>('login');
  const [setups, setSetups] = useState<Setup[]>([]);
  const [selectedSetup, setSelectedSetup] = useState<Setup | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterPair, setFilterPair] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setCurrentView('dashboard');
        // Load setups
        try {
          const userSetups = await getSetups(user.uid);
          setSetups(userSetups);
        } catch (error) {
          console.error('Error loading setups:', error);
        }
      } else {
        setCurrentView('login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  const pairs = ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'USDJPY', 'AUDUSD'];
  const statuses = ['Running', 'Skipped'];

  const checklistItems = {
    htf: [
      'Trend HTF jelas (higher highs/lows)',
      'Price di area supply/demand valid',
      'Struktur pasar masih utuh',
      'Confluence dengan fibonacci/EMA',
      'Volume mendukung bias'
    ],
    ltf: [
      'Break of structure (BOS) terlihat',
      'Candle rejection/engulfing muncul',
      'Price action konfirmasi entry',
      'Risk/Reward minimal 1:2',
      'Entry di zona optimal'
    ],
    risk: [
      'Stop loss di lokasi logis',
      'Position size sesuai risiko 1-2%',
      'Take profit realistis',
      'Tidak ada konflik dengan news',
      'Emosi stabil saat entry'
    ]
  };

  // Login Component
  const LoginView = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
        await signIn(email, password);
        // Auth state listener will handle navigation
      } catch (err: any) {
        setError(err.message || 'Login gagal. Periksa email dan password.');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md w-full ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-8 space-y-6`}>
          <div className="text-center">
            <TrendingUp className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Trading Journal</h1>
            <p className={`mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Track, analyze, and improve your trades</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} focus:ring-2 focus:ring-indigo-500 outline-none`}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} focus:ring-2 focus:ring-indigo-500 outline-none`}
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-lg font-semibold transition"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // New Setup Form
  const NewSetupForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      pair: 'EURUSD',
      direction: 'Buy' as 'Buy' | 'Sell',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      status: 'Running',
      slUsd: 0,
      tpUsd: 0,
      slAmount: 0,
      tpAmount: 0,
      outcome: 'TP',
      pnl: 0,
      notes: '',
      setupOutcome: '',
      checklist: {
        htf: Array(5).fill(false),
        ltf: Array(5).fill(false),
        risk: Array(5).fill(false)
      }
    });

    const [isSaving, setIsSaving] = useState(false);

    const calculateScore = () => {
      return formData.checklist.htf.filter(Boolean).length +
             formData.checklist.ltf.filter(Boolean).length +
             formData.checklist.risk.filter(Boolean).length;
    };

    const calculateRR = () => {
      if (formData.slUsd > 0) {
        return (formData.tpUsd / formData.slUsd).toFixed(2);
      }
      return '0.00';
    };

    const handleSubmit = async () => {
      if (!user) return;
      
      setIsSaving(true);
      try {
        const score = calculateScore();
        const rrRatio = parseFloat(calculateRR());
        
        let pnl = 0;
        if (formData.status === 'Executed') {
          if (formData.outcome === 'TP') pnl = formData.tpAmount || formData.tpUsd;
          else if (formData.outcome === 'SL') pnl = -(formData.slAmount || formData.slUsd);
          else pnl = formData.pnl;
        }

        const newSetup: Omit<Setup, 'id' | 'createdAt'> = {
          name: formData.name || `${formData.pair} ${formData.direction} – ${formData.date}`,
          pair: formData.pair,
          direction: formData.direction,
          date: formData.date,
          time: formData.time,
          status: formData.status,
          slUsd: formData.slUsd,
          tpUsd: formData.tpUsd,
          slAmount: formData.slAmount,
          tpAmount: formData.tpAmount,
          outcome: formData.outcome,
          pnl,
          rrRatio,
          screenshotUrls: [],
          notes: formData.notes,
          setupOutcome: formData.setupOutcome,
          checklist: formData.checklist,
          score,
        };

        await addSetup(user.uid, newSetup as Setup);
        
        // Reload setups
        const updatedSetups = await getSetups(user.uid);
        setSetups(updatedSetups);
        
        setCurrentView('dashboard');
      } catch (error) {
        console.error('Error saving setup:', error);
        alert('Gagal menyimpan setup. Silakan coba lagi.');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-8`}>
            <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>New Setup</h2>
            
            <div className="space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder={`${formData.pair} ${formData.direction} – ${formData.date}`}
                    className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>
                
                <div>
                  <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Pair</label>
                  <select
                    value={formData.pair}
                    onChange={(e) => setFormData({...formData, pair: e.target.value})}
                    className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    {pairs.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Direction</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, direction: 'Buy'})}
                      className={`flex-1 py-2 rounded-lg font-medium transition ${formData.direction === 'Buy' ? 'bg-green-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-slate-700'}`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, direction: 'Sell'})}
                      className={`flex-1 py-2 rounded-lg font-medium transition ${formData.direction === 'Sell' ? 'bg-red-500 text-white' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-slate-700'}`}
                    >
                      Sell
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>

                <div>
                  <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Setup Details */}
              {(formData.status === 'Running' || formData.status === 'Skipped') && (
                <div className={`p-6 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-indigo-50'} space-y-4`}>
                  <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formData.status === 'Running' ? 'Setup Entry Details' : 'Skipped Setup Details'}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>SL Distance (USD)</label>
                      <input
                        type="number"
                        value={formData.slUsd}
                        onChange={(e) => setFormData({...formData, slUsd: parseFloat(e.target.value) || 0})}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>TP Distance (USD)</label>
                      <input
                        type="number"
                        value={formData.tpUsd}
                        onChange={(e) => setFormData({...formData, tpUsd: parseFloat(e.target.value) || 0})}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>SL Amount (USD)</label>
                      <input
                        type="number"
                        value={formData.slAmount}
                        onChange={(e) => setFormData({...formData, slAmount: parseFloat(e.target.value) || 0})}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="0.00"
                      />
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Jumlah uang risiko di SL</p>
                    </div>
                    
                    <div>
                      <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>TP Amount (USD)</label>
                      <input
                        type="number"
                        value={formData.tpAmount}
                        onChange={(e) => setFormData({...formData, tpAmount: parseFloat(e.target.value) || 0})}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="0.00"
                      />
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Jumlah uang target di TP</p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-600' : 'bg-white'}`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>RR Ratio: <span className="font-bold text-indigo-600">{calculateRR()}</span></p>
                  </div>

                  {formData.status === 'Skipped' && (
                    <div>
                      <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Setup Outcome</label>
                      <div className="space-y-2">
                        {['TP', 'SL'].map(outcome => (
                          <label key={outcome} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="setupOutcome"
                              checked={formData.setupOutcome === outcome}
                              onChange={() => setFormData({...formData, setupOutcome: outcome})}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                              {outcome === 'TP' ? 'Would Hit TP' : 'Would Hit SL'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-4">
                <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Quality Checklist (Score: {calculateScore()}/15)</h3>
                
                {Object.entries(checklistItems).map(([key, items]) => (
                  <div key={key} className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-medium mb-3 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {key === 'htf' ? 'HTF (H4) - Bias Utama' : key === 'ltf' ? 'LTF (M15/M5) - Konfirmasi Entry' : 'Risk & Execution'}
                    </h4>
                    <div className="space-y-2">
                      {items.map((item, i) => (
                        <label key={i} className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.checklist[key as keyof typeof formData.checklist][i]}
                            onChange={(e) => {
                              const newChecklist = {...formData.checklist};
                              newChecklist[key as keyof typeof formData.checklist][i] = e.target.checked;
                              setFormData({...formData, checklist: newChecklist});
                            }}
                            className="mt-1 w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={4}
                  className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                  placeholder="Additional notes about this setup..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex-1 py-3 rounded-lg font-medium ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'} transition`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-lg font-medium transition"
                >
                  {isSaving ? 'Saving...' : 'Save Setup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard
  const Dashboard = () => {
    const [closingSetup, setClosingSetup] = useState<Setup | null>(null);
    const [closeOutcome, setCloseOutcome] = useState<string>('TP');
    const [closePnL, setClosePnL] = useState<number>(0);

    const filteredSetups = setups.filter(s => 
      (filterPair === 'All' || s.pair === filterPair) &&
      (filterStatus === 'All' || s.status === filterStatus)
    );

    const executedSetups = setups.filter(s => s.status === 'Executed');
    const runningSetups = setups.filter(s => s.status === 'Running');
    const totalPnL = executedSetups.reduce((sum, s) => sum + s.pnl, 0);
    const winningTrades = executedSetups.filter(s => s.pnl > 0).length;
    const winRate = executedSetups.length > 0 ? (winningTrades / executedSetups.length * 100).toFixed(1) : '0.0';
    const avgScore = setups.length > 0 ? (setups.reduce((sum, s) => sum + s.score, 0) / setups.length).toFixed(1) : '0.0';
    const avgRR = executedSetups.length > 0 ? (executedSetups.reduce((sum, s) => sum + s.rrRatio, 0) / executedSetups.length).toFixed(2) : '0.00';

    const handleCloseRunningSetup = async () => {
      if (!closingSetup || !user) return;
      
      let pnl = closePnL;
      
      if (closeOutcome === 'TP') {
        pnl = closingSetup.tpAmount || closingSetup.tpUsd;
      } else if (closeOutcome === 'SL') {
        pnl = -(closingSetup.slAmount || closingSetup.slUsd);
      }

      const updatedData = {
        status: 'Executed',
        outcome: closeOutcome,
        pnl
      };

      try {
        if (closingSetup.id) {
          await updateSetup(user.uid, closingSetup.id, updatedData);
          
          // Reload setups
          const updatedSetups = await getSetups(user.uid);
          setSetups(updatedSetups);
        }
        
        setClosingSetup(null);
        setCloseOutcome('TP');
        setClosePnL(0);
      } catch (error) {
        console.error('Error closing setup:', error);
        alert('Gagal menutup posisi. Silakan coba lagi.');
      }
    };

    const handleLogout = async () => {
      try {
        await signOut();
        setSetups([]);
        setCurrentView('login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <TrendingUp className={`w-8 h-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Trading Journal</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    currentView === 'dashboard'
                      ? 'bg-indigo-600 text-white'
                      : darkMode ?
                      'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-gray-100'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    currentView === 'analytics'
                      ? 'bg-indigo-600 text-white'
                      : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Analytics
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-gray-100 text-slate-600'} hover:opacity-80 transition`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  const data = JSON.stringify(setups, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'trading-journal-backup.json';
                  a.click();
                }}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-gray-100 text-slate-600'} hover:opacity-80 transition`}
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-gray-100 text-slate-600'} hover:opacity-80 transition`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Stats Panel */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-4 shadow-lg`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Setups</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{setups.length}</p>
            </div>
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-4 shadow-lg`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Running</p>
              <p className={`text-2xl font-bold text-blue-500`}>{runningSetups.length}</p>
            </div>
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-4 shadow-lg`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Executed</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{executedSetups.length}</p>
            </div>
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-4 shadow-lg`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Win Rate</p>
              <p className={`text-2xl font-bold ${parseFloat(winRate) >= 50 ? 'text-green-500' : 'text-red-500'}`}>{winRate}%</p>
            </div>
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-4 shadow-lg`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total PnL</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>${totalPnL.toFixed(2)}</p>
            </div>
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-4 shadow-lg`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Avg RR</p>
              <p className={`text-2xl font-bold text-indigo-500`}>{avgRR}</p>
            </div>
          </div>

          {/* Filters & Add Button */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <select
                value={filterPair}
                onChange={(e) => setFilterPair(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none`}
              >
                <option value="All">All Pairs</option>
                {pairs.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none`}
              >
                <option value="All">All Status</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button
              onClick={() => setCurrentView('new')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              New Setup
            </button>
          </div>

          {/* Setup Cards */}
          {filteredSetups.length === 0 ? (
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-12 text-center shadow-lg`}>
              <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No setups yet. Create your first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSetups.map(setup => (
                <div
                  key={setup.id}
                  className={`${darkMode ? 'bg-slate-800 hover:bg-slate-750' : 'bg-white hover:bg-gray-50'} rounded-xl p-6 shadow-lg transition`}
                >
                  <div 
                    onClick={() => {
                      setSelectedSetup(setup);
                      setCurrentView('detail');
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{setup.pair}</h3>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{setup.date}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${setup.direction === 'Buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {setup.direction === 'Buy' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="text-sm font-medium">{setup.direction}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Status:</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                          setup.status === 'Executed' ? darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700' :
                          setup.status === 'Running' ? darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700' :
                          setup.status === 'Skipped' ? darkMode ? 'bg-gray-900/30 text-gray-400' : 'bg-gray-100 text-gray-700' :
                          darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700'
                        }`}>{setup.status}</span>
                      </div>

                      {setup.status === 'Executed' && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>PnL:</span>
                            <span className={`text-sm font-bold ${setup.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ${setup.pnl.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>RR:</span>
                            <span className={`text-sm font-medium text-indigo-500`}>{setup.rrRatio}</span>
                          </div>
                        </>
                      )}

                      {setup.status === 'Running' && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>RR:</span>
                          <span className={`text-sm font-medium text-indigo-500`}>{setup.rrRatio}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Score:</span>
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{setup.score}/15</span>
                      </div>
                    </div>
                  </div>

                  {setup.status === 'Running' && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setClosingSetup(setup);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition text-sm"
                      >
                        Close Position
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Close Position Modal */}
          {closingSetup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setClosingSetup(null)}>
              <div 
                className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Close {closingSetup.pair} {closingSetup.direction}
                </h3>
                
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between mb-2">
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>SL Amount:</span>
                      <span className={`font-bold text-red-500`}>-${(closingSetup.slAmount || closingSetup.slUsd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>TP Amount:</span>
                      <span className={`font-bold text-green-500`}>+${(closingSetup.tpAmount || closingSetup.tpUsd).toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className={`block mb-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Close Method:</label>
                    <div className="space-y-2">
                      {[
                        { value: 'TP', label: 'Take Profit Hit', desc: `+$${(closingSetup.tpAmount || closingSetup.tpUsd).toFixed(2)}`, color: 'green' },
                        { value: 'SL', label: 'Stop Loss Hit', desc: `-$${(closingSetup.slAmount || closingSetup.slUsd).toFixed(2)}`, color: 'red' },
                        { value: 'SL+', label: 'Stop Loss Plus (SL+)', desc: 'Moved to break even or small profit', color: 'orange' },
                        { value: 'Cutloss', label: 'Cut Loss', desc: 'Manual early exit with loss', color: 'rose' },
                        { value: 'Manual', label: 'Manual Close', desc: 'Custom PnL amount', color: 'blue' },
                      ].map((option) => (
                        <label key={option.value} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                          closeOutcome === option.value 
                            ? `bg-${option.color}-500/20 border-2 border-${option.color}-500` 
                            : darkMode ? 'bg-slate-700 border-2 border-slate-600' : 'bg-gray-50 border-2 border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            name="closeOutcome"
                            checked={closeOutcome === option.value}
                            onChange={() => {
                              setCloseOutcome(option.value);
                              if (option.value === 'TP') {
                                setClosePnL(closingSetup.tpAmount || closingSetup.tpUsd);
                              } else if (option.value === 'SL') {
                                setClosePnL(-(closingSetup.slAmount || closingSetup.slUsd));
                              } else {
                                setClosePnL(0);
                              }
                            }}
                            className={`w-5 h-5 text-${option.color}-600`}
                          />
                          <div className="flex-1">
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{option.label}</span>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{option.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {(closeOutcome === 'SL+' || closeOutcome === 'Cutloss' || closeOutcome === 'Manual') && (
                    <div>
                      <label className={`block mb-2 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Final Balance (USD)
                      </label>
                      <input
                        type="number"
                        value={closePnL}
                        onChange={(e) => setClosePnL(parseFloat(e.target.value) || 0)}
                        className={`w-full px-4 py-3 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="0.00"
                      />
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Masukkan saldo akhir dalam USD (positif untuk profit, negatif untuk loss)
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setClosingSetup(null);
                        setCloseOutcome('TP');
                        setClosePnL(0);
                      }}
                      className={`flex-1 py-3 rounded-lg font-medium transition ${
                        darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCloseRunningSetup}
                      className={`flex-1 py-3 rounded-lg font-medium text-white transition ${
                        closeOutcome === 'TP' ? 'bg-green-600 hover:bg-green-700' : 
                        closeOutcome === 'SL' ? 'bg-red-600 hover:bg-red-700' :
                        closeOutcome === 'SL+' ? 'bg-orange-600 hover:bg-orange-700' :
                        closeOutcome === 'Cutloss' ? 'bg-rose-600 hover:bg-rose-700' :
                        'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Confirm Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Analytics View - COMPLETE VERSION
  const AnalyticsView = () => {
    const [selectedDay, setSelectedDay] = useState<string>('all');
    const [timeRange, setTimeRange] = useState({ start: 0, end: 1440 }); // minutes in a day

    const executedSetups = setups.filter(s => s.status === 'Executed');
    const allSetups = setups.filter(s => s.status === 'Executed' || s.status === 'Skipped');
    
    // Setup Win Rate (includes skipped setups)
    const setupWins = allSetups.filter(s => {
      if (s.status === 'Executed') return s.pnl > 0;
      if (s.status === 'Skipped') return s.setupOutcome === 'TP';
      return false;
    }).length;
    const setupWinRate = allSetups.length > 0 ? (setupWins / allSetups.length * 100).toFixed(1) : '0.0';
    
    // Trade Win Rate (only executed)
    const tradeWins = executedSetups.filter(s => s.pnl > 0).length;
    const tradeWinRate = executedSetups.length > 0 ? (tradeWins / executedSetups.length * 100).toFixed(1) : '0.0';

    // Win Rate Pie Chart Data
    const winningTrades = executedSetups.filter(s => s.pnl > 0).length;
    const losingTrades = executedSetups.filter(s => s.pnl < 0).length;
    const breakEvenTrades = executedSetups.filter(s => s.pnl === 0).length;
    
    const pieData = [
      { name: 'Win', value: winningTrades, color: '#10b981' },
      { name: 'Loss', value: losingTrades, color: '#ef4444' },
      { name: 'Break Even', value: breakEvenTrades, color: '#94a3b8' }
    ].filter(d => d.value > 0);

    // Score Consistency Chart
    const scoreData = setups.map((s, idx) => ({
      index: idx + 1,
      score: s.score,
      name: s.pair
    }));

    // Time Distribution with zoom (per minute)
    const getTimeData = () => {
      const minuteData: { [key: number]: number } = {};
      
      const filteredByDay = selectedDay === 'all' 
        ? setups 
        : setups.filter(s => {
            if (!s.time) return false;
            const date = new Date(s.date + 'T' + s.time);
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return dayNames[date.getDay()] === selectedDay;
          });
      
      filteredByDay.forEach(setup => {
        if (setup.time) {
          const [hours, minutes] = setup.time.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes;
          if (totalMinutes >= timeRange.start && totalMinutes <= timeRange.end) {
            minuteData[totalMinutes] = (minuteData[totalMinutes] || 0) + 1;
          }
        }
      });

      const result = [];
      for (let i = timeRange.start; i <= timeRange.end; i += 15) { // 15 minute intervals
        const hour = Math.floor(i / 60);
        const minute = i % 60;
        result.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          trades: minuteData[i] || 0,
          minute: i
        });
      }
      
      return result;
    };
    const timeData = getTimeData();

    // Cumulative PnL Chart
    const pnlData = executedSetups
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T' + (a.time || '00:00')).getTime();
        const dateB = new Date(b.date + 'T' + (b.time || '00:00')).getTime();
        return dateA - dateB;
      })
      .reduce((acc, setup, idx) => {
        const lastPnL = acc.length > 0 ? acc[acc.length - 1].pnl : 0;
        acc.push({
          index: idx + 1,
          pnl: lastPnL + setup.pnl,
          date: setup.date
        });
        return acc;
      }, [] as any[]);

    // Drawdown Chart
    const drawdownData = pnlData.map((point, idx) => {
      const maxPnL = Math.max(...pnlData.slice(0, idx + 1).map(p => p.pnl));
      const drawdown = maxPnL - point.pnl;
      return {
        index: point.index,
        drawdown: -drawdown,
        date: point.date
      };
    });

    // Monthly Contribution (GitHub-style)
    const getMonthData = () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const days = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const daySetups = setups.filter(s => s.date === dateStr);
        days.push({
          date: dateStr,
          day: d.getDate(),
          count: daySetups.length,
          weekday: d.getDay()
        });
      }
      return days;
    };
    const monthData = getMonthData();

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <TrendingUp className={`w-8 h-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Trading Journal</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    currentView === 'dashboard'
                      ? 'bg-indigo-600 text-white'
                      : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-gray-100'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    currentView === 'analytics'
                      ? 'bg-indigo-600 text-white'
                      : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Analytics
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-gray-100 text-slate-600'} hover:opacity-80 transition`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Analytics Dashboard</h2>

          {/* Setup vs Trade Win Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Setup Win Rate</h3>
              <p className={`text-4xl font-bold ${parseFloat(setupWinRate) >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                {setupWinRate}%
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {setupWins} wins out of {allSetups.length} setups (includes skipped)
              </p>
            </div>

            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Trade Win Rate</h3>
              <p className={`text-4xl font-bold ${parseFloat(tradeWinRate) >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                {tradeWinRate}%
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {tradeWins} wins out of {executedSetups.length} executed trades
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate Pie Chart */}
            {pieData.length > 0 && (
              <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
                <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Win Rate Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false} 
                      label={({ name, Percent}) => `${name}: ${(Percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                        border: `1px solid ${darkMode ? '#475569' : '#e5e7eb'}`,
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.name}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Score Consistency */}
            {scoreData.length > 0 && (
              <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
                <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Score Consistency</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e5e7eb'} />
                    <XAxis dataKey="index" stroke={darkMode ? '#94a3b8' : '#64748b'} label={{ value: 'Trade #', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} domain={[0, 15]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                        border: `1px solid ${darkMode ? '#475569' : '#e5e7eb'}`,
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Time Distribution */}
          {timeData.length > 0 && (
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Entry Time Distribution</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-slate-900'} outline-none`}
                  >
                    <option value="all">All Days</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4 flex items-center gap-3">
                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Time Range:</span>
                <input
                  type="range"
                  min="0"
                  max="1440"
                  step="60"
                  value={timeRange.start}
                  onChange={(e) => setTimeRange({ ...timeRange, start: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {Math.floor(timeRange.start / 60).toString().padStart(2, '0')}:00
                </span>
                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>to</span>
                <input
                  type="range"
                  min="0"
                  max="1440"
                  step="60"
                  value={timeRange.end}
                  onChange={(e) => setTimeRange({ ...timeRange, end: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {Math.floor(timeRange.end / 60).toString().padStart(2, '0')}:00
                </span>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="time" 
                    stroke={darkMode ? '#94a3b8' : '#64748b'}
                    tick={{ fontSize: 12 }}
                    interval={Math.floor(timeData.length / 10)}
                  />
                  <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                      border: `1px solid ${darkMode ? '#475569' : '#e5e7eb'}`,
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => `Time: ${value}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trades" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cumulative PnL Chart */}
          {pnlData.length > 0 && (
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Cumulative PnL</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pnlData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e5e7eb'} />
                  <XAxis dataKey="index" stroke={darkMode ? '#94a3b8' : '#64748b'} label={{ value: 'Trade #', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                      border: `1px solid ${darkMode ? '#475569' : '#e5e7eb'}`,
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Drawdown Chart */}
          {drawdownData.length > 0 && (
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Drawdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={drawdownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e5e7eb'} />
                  <XAxis dataKey="index" stroke={darkMode ? '#94a3b8' : '#64748b'} label={{ value: 'Trade #', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                      border: `1px solid ${darkMode ? '#475569' : '#e5e7eb'}`,
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly Activity (GitHub-style) */}
          {monthData.length > 0 && (
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Monthly Activity</h3>
              <div className="overflow-x-auto">
                <div className="inline-grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className={`text-xs text-center ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for alignment */}
                  {Array(monthData[0]?.weekday || 0).fill(0).map((_, idx) => (
                    <div key={`empty-${idx}`} className="w-10 h-10"></div>
                  ))}
                  
                  {monthData.map((day) => (
                    <div
                      key={day.date}
                      className={`w-10 h-10 rounded flex items-center justify-center text-xs font-medium transition-all cursor-pointer ${
                        day.count === 0
                          ? darkMode ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
                          : day.count === 1
                          ? darkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                          : day.count === 2
                          ? darkMode ? 'bg-indigo-700/70 text-indigo-200' : 'bg-indigo-300 text-indigo-900'
                          : darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
                      }`}
                      title={`${day.date}: ${day.count} trade(s)`}
                    >
                      {day.day}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Less</span>
                  <div className={`w-4 h-4 rounded ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}></div>
                  <div className={`w-4 h-4 rounded ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}></div>
                  <div className={`w-4 h-4 rounded ${darkMode ? 'bg-indigo-700/70' : 'bg-indigo-300'}`}></div>
                  <div className={`w-4 h-4 rounded ${darkMode ? 'bg-indigo-600' : 'bg-indigo-600'}`}></div>
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>More</span>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {setups.length === 0 && (
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl p-12 text-center shadow-lg`}>
              <BarChart3 className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                No data yet. Start creating setups to see analytics!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Detail View
  const DetailView = () => {
    if (!selectedSetup) return null;

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} p-4`}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`mb-4 px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-900 hover:bg-gray-50'} transition`}
          >
            ← Back to Dashboard
          </button>

          <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-8 space-y-6`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedSetup.name}</h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{selectedSetup.date} {selectedSetup.time}</p>
              </div>
              <div className={`px-4 py-2 rounded-full ${selectedSetup.direction === 'Buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                <span className="font-medium">{selectedSetup.direction}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Pair</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedSetup.pair}</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Status</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedSetup.status}</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Score</p>
                <p className={`text-lg font-bold text-indigo-500`}>{selectedSetup.score}/15</p>
              </div>
              {selectedSetup.status === 'Executed' && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>PnL</p>
                  <p className={`text-lg font-bold ${selectedSetup.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${selectedSetup.pnl.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {selectedSetup.notes && (
              <div>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Notes</h3>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedSetup.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Loading...</p>
        </div>
      </div>
    );
  }

  // Main Render
  if (!user) return <LoginView />;
  if (currentView === 'new') return <NewSetupForm />;
  if (currentView === 'detail') return <DetailView />;
  if (currentView === 'analytics') return <AnalyticsView />;
  return <Dashboard />;
};

export default TradingJournalApp;