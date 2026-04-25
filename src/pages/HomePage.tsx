export function HomePage() {
  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Home</span>
        <h2 className="page__title">Recommendations and taste summaries will live here.</h2>
        <p className="page__copy">
          For now, this route is just a shell. The next pass can add your mood
          picker, recommendation results, and a generated taste profile.
        </p>
      </header>

      <div className="shell-grid">
        <section className="shell-card">
          <h3>Recommendation prompt</h3>
          <p className="page__copy">
            Future home for the watch-next flow and deterministic scoring output.
          </p>
        </section>
        <section className="shell-card">
          <h3>Taste profile</h3>
          <p className="page__copy">
            Future home for a short summary of what your log says about your taste.
          </p>
        </section>
      </div>
    </section>
  )
}
