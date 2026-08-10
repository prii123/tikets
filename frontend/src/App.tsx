import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { TicketsListPage } from './pages/TicketsListPage'
import { NewTicketPage } from './pages/NewTicketPage'
import { TicketDetailPage } from './pages/TicketDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<TicketsListPage />} />
            <Route path="/tickets/nuevo" element={<NewTicketPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
