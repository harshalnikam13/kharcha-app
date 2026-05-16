'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type TxType = 'income' | 'expense'
interface Transaction {
  id: string
  type: TxType
  amount: number
  description: string
  date: string
  category: string
}

type Period = 'month' | '3month' | '6month' | 'year'
type Tab = 'dashboard' | 'add' | 'sms'

const CATEGORIES = {
  income: ['💼 Salary', '🏪 Business', '📈 Investment', '🎁 Other income'],
  expense: ['🛒 Groceries', '🏠 Rent', '⚡ Utilities', '🚗 Transport', '🍽 Food', '🏥 Health', '📱 Subscriptions', '🎉 Entertainment', '📦 Shopping', '💸 Transfer', '❓ Other']
}

function fmt(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function getStartDate(period: Period) {
  const now = new Date()
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === '3month') return new Date(now.getFullYear(), now.getMonth() - 2, 1)
  if (period === '6month') return new Date(now.getFullYear(), now.getMonth() - 5, 1)
  return new Date(now.getFullYear(), 0, 1)
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<unknown>(null)

  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [toast, setToast] = useState('')

  // Add form
  const [addType, setAddType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState(CATEGORIES.expense[0])
  const [addLoading, setAddLoading] = useState(false)

  // SMS
  const [smsText, setSmsText] = useState('')
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsResult, setSmsResult] = useState<Transaction | null>(null)
  const [smsError, setSmsError] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadTransactions = useCallback(async (userId: string) => {
    const start = getStartDate(period)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start.toISOString().slice(0, 10))
      .order('date', { ascending: false })
    setTransactions(data || [])
  }, [period, supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      loadTransactions(session.user.id)
    })
  }, [router, supabase.auth, loadTransactions])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadTransactions(session.user.id)
    })
  }, [period, loadTransactions, supabase.auth])

  // Chart
  useEffect(() => {
    if (tab !== 'dashboard' || !chartRef.current) return
    import('chart.js/auto').then(({ default: Chart }) => {
      if (chartInstance.current) (chartInstance.current as { destroy: () => void }).destroy()
      const now = new Date()
      const months = period === 'year' ? 12 : period === '6month' ? 6 : period === '3month' ? 3 : 1
      const labels: string[] = []
      const incomeData: number[] = []
      const expenseData: number[] = []

      if (months === 1) {
        const weekLabels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4']
        labels.push(...weekLabels)
        incomeData.push(0, 0, 0, 0)
        expenseData.push(0, 0, 0, 0)
        transactions.forEach(t => {
          const d = new Date(t.date).getDate()
          const w = Math.min(Math.floor((d - 1) / 7), 3)
          if (t.type === 'income') incomeData[w] += t.amount
          else expenseData[w] += t.amount
        })
      } else {
        for (let i = months - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          labels.push(d.toLocaleString('default', { month: 'short' }))
          const mo = d.getMonth(), yr = d.getFullYear()
          const mTx = transactions.filter(t => { const td = new Date(t.date); return td.getMonth() === mo && td.getFullYear() === yr })
          incomeData.push(mTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
          expenseData.push(mTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
        }
      }

      chartInstance.current = new Chart(chartRef.current!, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Income', data: incomeData, backgroundColor: '#5DCAA5', borderRadius: 4, maxBarThickness: 26 },
            { label: 'Expense', data: expenseData, backgroundColor: '#F0997B', borderRadius: 4, maxBarThickness: 26 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw as number) } } },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#9ca3af' } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#9ca3af', callback: (v) => '₹' + (Number(v) >= 1000 ? Math.round(Number(v) / 1000) + 'k' : v) }, beginAtZero: true }
          }
        }
      })
    })
  }, [tab, transactions, period])

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !description) return
    setAddLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('transactions').insert({
      user_id: session.user.id,
      type: addType, amount: parseFloat(amount), description, date, category
    })
    setAmount(''); setDescription('')
    await loadTransactions(session.user.id)
    showToast('✓ Transaction added')
    setAddLoading(false)
    setTab('dashboard')
  }

  async function deleteTx(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) loadTransactions(session.user.id)
  }

  async function parseSMS() {
    if (!smsText.trim()) return
    setSmsLoading(true); setSmsResult(null); setSmsError('')
    const res = await fetch('/api/parse-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sms: smsText }) })
    const data = await res.json()
    setSmsLoading(false)
    if (data.error) { setSmsError('Could not parse. Try a different SMS.'); return }
    setSmsResult(data)
  }

  async function confirmSMS() {
    if (!smsResult) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('transactions').insert({ user_id: session.user.id, ...smsResult })
    setSmsText(''); setSmsResult(null)
    await loadTransactions(session.user.id)
    showToast('✓ Transaction added from SMS')
    setTab('dashboard')
  }

  const initials = user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || user?.email?.[0].toUpperCase() || '?'

  return (
    <div className="dashboard">
      {toast && <div className="toast">{toast}</div>}

      <div className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">💰</div>
          <span className="topbar-title">Kharcha</span>
        </div>
        <div className="topbar-right">
          <div className="user-avatar" title={user?.email}>{initials}</div>
          <button className="signout-btn" onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))}>Sign out</button>
        </div>
      </div>

      {/* DASHBOARD TAB */}
      {tab === 'dashboard' && (<>
        <div className="period-bar">
          {(['month', '3month', '6month', 'year'] as Period[]).map(p => (
            <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'month' ? 'This month' : p === '3month' ? '3 months' : p === '6month' ? '6 months' : 'This year'}
            </button>
          ))}
        </div>

        <div className="summary">
          <div className="metric"><div className="metric-label">Income</div><div className="metric-value income">{fmt(income)}</div></div>
          <div className="metric"><div className="metric-label">Expenses</div><div className="metric-value expense">{fmt(expense)}</div></div>
          <div className="metric"><div className="metric-label">Balance</div><div className={`metric-value ${balance >= 0 ? 'pos' : 'neg'}`}>{fmt(balance)}</div></div>
        </div>

        <div className="chart-wrap">
          <div className="chart-header">
            <span className="chart-title">Income vs Expenses</span>
            <div className="legend">
              <div className="legend-item"><div className="legend-dot" style={{ background: '#5DCAA5' }}></div>Income</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#F0997B' }}></div>Expense</div>
            </div>
          </div>
          <div style={{ position: 'relative', width: '100%', height: 170 }}>
            <canvas ref={chartRef} role="img" aria-label="Bar chart showing income and expenses"></canvas>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <span className="section-title">Transactions</span>
            <span className="section-count">{transactions.length} entries</span>
          </div>
          {transactions.length === 0 ? (
            <div className="empty"><span className="empty-icon">📭</span>No transactions yet.<br />Tap + to add one.</div>
          ) : (
            <div className="tx-list">
              {transactions.map(t => (
                <div className="tx-item" key={t.id}>
                  <div className="tx-icon" style={{ background: t.type === 'income' ? '#E1F5EE' : '#FAECE7' }}>{t.category.split(' ')[0]}</div>
                  <div className="tx-info">
                    <div className="tx-name">{t.description}</div>
                    <div className="tx-meta">{t.category.split(' ').slice(1).join(' ')} · {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <span className={`tx-amount ${t.type === 'income' ? 'cr' : 'dr'}`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</span>
                  <button className="tx-del" onClick={() => deleteTx(t.id)} aria-label="Delete">🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </>)}

      {/* ADD TAB */}
      {tab === 'add' && (
        <div className="add-section">
          <div className="card">
            <div className="card-title">Add transaction</div>
            <form onSubmit={handleAdd}>
              <div className="type-toggle">
                <button type="button" className={`type-btn ${addType === 'income' ? 'income' : ''}`} onClick={() => { setAddType('income'); setCategory(CATEGORIES.income[0]) }}>↓ Income</button>
                <button type="button" className={`type-btn ${addType === 'expense' ? 'expense' : ''}`} onClick={() => { setAddType('expense'); setCategory(CATEGORIES.expense[0]) }}>↑ Expense</button>
              </div>
              <div className="form-row">
                <div className="form-group-inner">
                  <label className="form-label">Amount (₹)</label>
                  <input className="add-input" type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} min="1" required />
                </div>
                <div className="form-group-inner">
                  <label className="form-label">Date</label>
                  <input className="add-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
              </div>
              <div className="form-group-inner" style={{ marginBottom: 12 }}>
                <label className="form-label">Description</label>
                <input className="add-input" type="text" placeholder="Salary, Rent, Groceries…" value={description} onChange={e => setDescription(e.target.value)} required />
              </div>
              <div className="form-group-inner" style={{ marginBottom: 4 }}>
                <label className="form-label">Category</label>
                <select className="add-input" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES[addType].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button className="add-btn" type="submit" disabled={addLoading}>{addLoading ? 'Saving…' : 'Add transaction'}</button>
            </form>
          </div>
        </div>
      )}

      {/* SMS TAB */}
      {tab === 'sms' && (
        <div className="add-section">
          <div className="card">
            <div className="card-title">Parse SMS with AI</div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Paste a bank or UPI SMS — AI will extract the transaction details automatically.</p>
            <textarea className="sms-textarea" value={smsText} onChange={e => setSmsText(e.target.value)}
              placeholder={'Paste SMS here e.g.\nYour a/c XX1234 is credited with INR 50,000.00 on 14-May-25 by NEFT from RAHUL SHARMA. Avl Bal INR 1,23,456.78 -HDFC Bank'} />
            <button className="add-btn" style={{ marginTop: 10 }} onClick={parseSMS} disabled={smsLoading || !smsText.trim()}>
              {smsLoading ? <><span className="spinner"></span>Analyzing…</> : '✨ Parse with AI'}
            </button>

            {smsError && <div className="error-msg" style={{ marginTop: 12 }}>{smsError}</div>}

            {smsResult && (
              <div className="ai-result">
                <div className="parsed-grid">
                  <div className="parsed-field"><div className="key">Type</div><div className="val" style={{ color: smsResult.type === 'income' ? '#0F6E56' : '#993C1D' }}>{smsResult.type === 'income' ? '↓ Income' : '↑ Expense'}</div></div>
                  <div className="parsed-field"><div className="key">Amount</div><div className="val">{fmt(smsResult.amount)}</div></div>
                  <div className="parsed-field"><div className="key">Description</div><div className="val">{smsResult.description}</div></div>
                  <div className="parsed-field"><div className="key">Date</div><div className="val">{smsResult.date}</div></div>
                  <div className="parsed-field"><div className="key">Category</div><div className="val">{smsResult.category}</div></div>
                </div>
                <button className="add-btn" onClick={confirmSMS}>✓ Add this transaction</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button className={`nav-item ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
          <span className="nav-icon">📊</span>Dashboard
        </button>
        <button className={`nav-item ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          <span className="nav-icon">➕</span>Add
        </button>
        <button className={`nav-item ${tab === 'sms' ? 'active' : ''}`} onClick={() => setTab('sms')}>
          <span className="nav-icon">💬</span>From SMS
        </button>
      </div>
    </div>
  )
}