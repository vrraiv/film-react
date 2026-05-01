export function SettingsPage() {
  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Settings</span>
        <h2 className="page__title">Supabase is the source of truth.</h2>
        <p className="page__copy">
          Film diary entries are now stored in Supabase for authenticated users.
          Existing local browser data is preserved and can still be imported from
          the prompt on the Log page when local entries are detected.
        </p>
      </header>
    </section>
  )
}
