import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { appConfig } from './config/env'
import { FilmDetailPage } from './pages/FilmDetailPage'
import { HomePage } from './pages/HomePage'
import { InsightsPage } from './pages/InsightsPage'
import { LogPage } from './pages/LogPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { PublicPreviewPage } from './pages/PublicPreviewPage'
import { LoginPage } from './pages/auth/LoginPage'

const LetterboxdImportPage = lazy(() =>
  import('./features/letterboxdImport/LetterboxdImportPage').then((module) => ({
    default: module.LetterboxdImportPage,
  })),
)

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="sign-in" element={<Navigate to="/login" replace />} />
      <Route element={<AppShell />}>
        <Route index element={<PublicPreviewPage />} />
        <Route
          path="home"
          element={(
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="log"
          element={(
            <ProtectedRoute>
              <LogPage />
            </ProtectedRoute>
          )}
        />
        <Route path="insights" element={<InsightsPage />} />
        <Route
          path="settings"
          element={(
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          )}
        />
        <Route path="preview-public" element={<PublicPreviewPage />} />
        <Route path="v/:userId" element={<PublicProfilePage />} />
        <Route path="film/:filmId" element={<FilmDetailPage />} />
        <Route
          path="admin/import/letterboxd"
          element={appConfig.enableLetterboxdImport ? (
            <ProtectedRoute redirectTo="/login" preserveDestination>
              <Suspense fallback={<p className="empty-state">Loading import tool...</p>}>
                <LetterboxdImportPage />
              </Suspense>
            </ProtectedRoute>
          ) : (
            <NotFoundPage />
          )}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
