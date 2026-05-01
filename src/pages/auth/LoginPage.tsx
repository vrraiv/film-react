import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function LoginPage() {
  const { user, loading, signIn } = useAuth()
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

    if (maybeError) {
      setError(maybeError)
    }
  }

  return (
    <section className="panel auth-panel" aria-labelledby="login-title">
      <div className="panel__header">
        <h2 className="panel__title" id="login-title">Sign in</h2>
        <p className="meta">Use your Supabase email and password to access your log.</p>
      </div>

      {error ? <p className="status-message status-message--error">{error}</p> : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="button-primary" type="submit" disabled={isSubmitting || loading}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}
