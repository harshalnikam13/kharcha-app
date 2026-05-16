'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (error) { setError(error.message); setLoading(false); return }
      setSuccess('Account created! You can now sign in.')
      setMode('login')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💰</div>
          <span className="auth-logo-text">Kharcha</span>
        </div>

        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-sub">{mode === 'login' ? 'Sign in to your account' : 'Track your income & expenses'}</p>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" type="text" placeholder="Harshal Nikam" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don&apos;t have an account? <a href="#" onClick={e => { e.preventDefault(); setMode('signup'); setError('') }}>Sign up</a></>
          ) : (
            <>Already have an account? <a href="#" onClick={e => { e.preventDefault(); setMode('login'); setError('') }}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  )
}
