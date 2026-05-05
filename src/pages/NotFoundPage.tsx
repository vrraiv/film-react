import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Not found</span>
        <h2 className="page__title">We couldn't find that screen.</h2>
        <p className="page__copy">
          Try heading back home and choosing a section from there.
        </p>
        <Link className="button-primary" to="/">
          Go home
        </Link>
      </header>
    </section>
  )
}
