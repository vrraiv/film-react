import { NavLink, Outlet } from 'react-router-dom'
import { appConfig } from '../config/env'

const contentNavItems = [
  { to: '/', label: 'Home' },
  { to: '/log', label: 'Log' },
  { to: '/insights', label: 'Insights' },
  { to: '/preview-public', label: 'Public preview' },
]

const settingsNavItems = [{ to: '/settings', label: 'Settings' }]

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <span className="eyebrow">{appConfig.appTitle}</span>
          <h1 className="app-shell__title">A private cinema notebook for your actual taste.</h1>
          <p className="app-shell__subtitle">
            Start local, log quickly, and keep the architecture simple enough to
            move to a hosted backend later.
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
        </div>
      </header>

      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  )
}
