import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./shared/auth/AuthContext";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import MyReportsPage from "./pages/MyReportsPage";
import RegisterPage from "./pages/RegisterPage";
import ReportPage from "./pages/ReportPage";

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 text-sm">
          <Link to="/" className="text-lg font-semibold text-primary-600">
            Agua Alerta
          </Link>
          <Link to="/mapa">Mapa</Link>
          {user ? (
            <>
              <Link to="/reportar">Reportar</Link>
              <Link to="/mis-reportes">Mis reportes</Link>
              <Link to="/tablero">Tablero</Link>
              {(user.role === "ADMINISTRADOR" || user.role === "SUPERADMINISTRADOR") && (
                <Link to="/admin">Admin</Link>
              )}
              <span className="ml-auto text-slate-600">{user.display_name}</span>
              <button type="button" onClick={logout} className="rounded bg-slate-200 px-3 py-1">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ml-auto">
                Iniciar sesión
              </Link>
              <Link to="/registro">Registrarse</Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route
          path="/reportar"
          element={
            <PrivateRoute>
              <ReportPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-reportes"
          element={
            <PrivateRoute>
              <MyReportsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/tablero"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Shell>
  );
}