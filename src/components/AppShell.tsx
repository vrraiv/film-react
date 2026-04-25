import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/log', label: 'Log' },
  { to: '/insights', label: 'Insights' },
]

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <span className="eyebrow">Film tracker</span>
          <h1 className="app-shell__title">A private cinema notebook for your actual taste.</h1>
          <p className="app-shell__subtitle">
            Start local, log quickly, and keep the architecture simple enough to
            move to a hosted backend later.
          </p>
        </div>

        <nav className="app-shell__nav" aria-label="Primary">
          {navItems.map((item) => (
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
      </header>

      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  )
}
