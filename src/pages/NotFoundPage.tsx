import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Missing page</span>
        <h2 className="page__title">This route is not part of the tracker yet.</h2>
        <p className="page__copy">
          Head back to the main routes while we keep building out the app.
        </p>
        <Link className="button-primary" to="/">
          Go home
        </Link>
      </header>
    </section>
  )
}
