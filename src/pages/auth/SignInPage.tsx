import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function SignInPage() {
  const { user, signIn, isConfigured } = useAuth()
  const location = useLocation()
  const redirectPath = (location.state as { from?: string } | null)?.from ?? '/log'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to={redirectPath} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const maybeError = await signIn(email, password)
    setIsSubmitting(false)
    setError(maybeError)
  }

  return (
    <section className="panel">
      <h2 className="panel__title">Sign in</h2>
      <p className="meta">Use your Supabase auth account to access your log.</p>
      {!isConfigured ? (
        <p className="status-banner status-banner--error">
          Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
        </p>
      ) : null}
      {error ? <p className="status-banner status-banner--error">{error}</p> : null}
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button className="button-primary" type="submit" disabled={isSubmitting || !isConfigured}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}
