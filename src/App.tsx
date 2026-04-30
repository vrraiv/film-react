import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { FilmDetailPage } from './pages/FilmDetailPage'
import { HomePage } from './pages/HomePage'
import { InsightsPage } from './pages/InsightsPage'
import { LogPage } from './pages/LogPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { PublicPreviewPage } from './pages/PublicPreviewPage'
import { SignInPage } from './pages/auth/SignInPage'

function App() {
  return (
    <Routes>
      <Route path="sign-in" element={<SignInPage />} />
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route
          path="log"
          element={(
            <ProtectedRoute>
              <LogPage />
            </ProtectedRoute>
          )}
        />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="preview-public" element={<PublicPreviewPage />} />
        <Route path="v/:userId" element={<PublicProfilePage />} />
        <Route path="film/:filmId" element={<FilmDetailPage />} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
