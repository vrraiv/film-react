export function InsightsPage() {
  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Insights</span>
        <h2 className="page__title">Stats and tag-level patterns will land here next.</h2>
        <p className="page__copy">
          This shell is ready for averages, tag breakdowns, and common patterns
          once we add tagging and the insights engine.
        </p>
      </header>

      <div className="shell-grid">
        <section className="shell-card">
          <h3>Overall averages</h3>
          <p className="page__copy">
            Placeholder for overall rating trends and watch-volume summaries.
          </p>
        </section>
        <section className="shell-card">
          <h3>Tag breakdowns</h3>
          <p className="page__copy">
            Placeholder for your most common tags and strongest affinities.
          </p>
        </section>
      </div>
    </section>
  )
}
