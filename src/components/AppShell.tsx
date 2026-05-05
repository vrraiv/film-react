import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { appConfig } from '../config/env'

const publicNavItems = [
  { to: '/', label: 'Film Diary' },
  { to: '/insights', label: 'Insights' },
  { to: '/taste', label: 'Shared Picks' },
]

const authenticatedNavItems = [
  { to: '/home', label: 'Home' },
  { to: '/log', label: 'Log' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/insights', label: 'Insights' },
  { to: '/taste', label: 'Shared Picks' },
  { to: '/', label: 'Film Diary' },
]

const settingsNavItems = [{ to: '/settings', label: 'Settings' }]

export function AppShell() {
  const { user, signOut } = useAuth()
  const contentNavItems = user ? authenticatedNavItems : publicNavItems

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <span className="eyebrow">{appConfig.appTitle}</span>
          <h1 className="app-shell__title">A film diary for recent watches and good recommendations.</h1>
          <p className="app-shell__subtitle">
            Browse ratings and notes, then sign in when it is time to update the log.
          </p>
        </div>

        <div className="app-shell__nav-stack">
          <nav className="app-shell__nav" aria-label="Content pages">
            {contentNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'app-shell__nav-link',
                    isActive ? 'app-shell__nav-link--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="auth-actions">
            {user ? (
              <button className="button-secondary" type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            ) : (
              <NavLink className="button-secondary" to="/login">
                Sign in
              </NavLink>
            )}
          </div>
          {user ? (
            <nav className="app-shell__nav app-shell__nav--settings" aria-label="Settings">
              {settingsNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'app-shell__nav-link',
                      'app-shell__nav-link--settings',
                      isActive ? 'app-shell__nav-link--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </div>
      </header>

      <main className="app-shell__main">
        <Outlet />
      </main>

      <footer className="app-shell__footer" aria-label="TMDB attribution">
        <img className="app-shell__tmdb-logo" src="/tmdb-logo.svg" alt="The Movie DB logo" />
        <p className="app-shell__tmdb-note">
          Thanks to TMDB for providing access to their database for movie posters and movie data.
        </p>
      </footer>
    </div>
  )
}
