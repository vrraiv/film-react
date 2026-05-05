export function HomePage() {
  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Home</span>
        <h2 className="page__title">Welcome back—this is where your next-watch ideas will appear.</h2>
        <p className="page__copy">
          This area is being prepared for personalized suggestions and quick summaries of what you enjoy.
        </p>
      </header>

      <div className="shell-grid">
        <section className="shell-card">
          <h3>What to watch next</h3>
          <p className="page__copy">
            Soon you will be able to get friendly watch suggestions based on your recent ratings.
          </p>
        </section>
        <section className="shell-card">
          <h3>Taste profile</h3>
          <p className="page__copy">
            Soon you will also see a simple snapshot of your movie tastes.
          </p>
        </section>
      </div>
    </section>
  )
}
