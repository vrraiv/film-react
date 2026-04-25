import { useParams } from 'react-router-dom'

export function PublicProfilePage() {
  const { userId } = useParams()

  return (
    <section className="page">
      <header className="page__hero">
        <span className="eyebrow">Public view</span>
        <h2 className="page__title">This route is reserved for a shareable profile.</h2>
        <p className="page__copy">
          Right now, the app is local-only, so <code>/v/{userId ?? 'user'}</code>
          is just a shell. Once you move to Supabase or another hosted backend,
          this can load public films safely from the server.
        </p>
      </header>
    </section>
  )
}
