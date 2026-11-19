import { lazy, Suspense, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./shared/auth/AuthContext";
import { ButtonLink, Spinner } from "./shared/ui";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LocationConsentDialog from "./shared/region/LocationConsentDialog";

// El panel administrativo va en un bundle aparte: el ciudadano no lo descarga.
const AdminPage = lazy(() => import("./pages/AdminPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MyReportsPage = lazy(() => import("./pages/MyReportsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-body font-medium text-ink">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 2.5c3.6 4.4 6.5 8 6.5 11.5a6.5 6.5 0 1 1-13 0C5.5 10.5 8.4 6.9 12 2.5Z" fill="#0b84c6" />
        <path d="M9 14.5a3 3 0 0 0 3 3" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Agua Alerta
    </Link>
  );
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  `flex h-8 items-center rounded-full px-3 text-body transition-colors ${isActive ? "text-ink" : "text-warm hover:text-ink"}`;

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const isAdmin = user && (user.role === "ADMINISTRADOR" || user.role === "SUPERADMINISTRADOR");
  const links = (
    <>
      <NavLink to="/mapa" className={navLink} onClick={() => setOpen(false)}>
        Mapa
      </NavLink>
      {user && (
        <>
          <NavLink to="/mis-reportes" className={navLink} onClick={() => setOpen(false)}>
            Mis reportes
          </NavLink>
          <NavLink to="/tablero" className={navLink} onClick={() => setOpen(false)}>
            Tablero
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLink} onClick={() => setOpen(false)}>
              Administración
            </NavLink>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[1000] border-b border-line bg-canvas/90 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-page items-center gap-2 px-4 sm:px-6" aria-label="Principal">
          <Logo />
          <div className="ml-6 hidden items-center md:flex">{links}</div>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <NavLink to="/perfil" className={navLink}>
                  {user.display_name}
                </NavLink>
                <button type="button" onClick={() => void logout()} className="px-3 text-body text-warm hover:text-ink">
                  Salir
                </button>
                <ButtonLink to="/reportar" variant="primary">
                  Reportar fuga
                </ButtonLink>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLink}>
                  Iniciar sesión
                </NavLink>
                <ButtonLink to="/registro" variant="primary">
                  Crear cuenta
                </ButtonLink>
              </>
            )}
          </div>
          <button
            type="button"
            className="ml-auto rounded-full border border-line px-3 py-1.5 text-body md:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen((v) => !v)}
          >
            Menú
          </button>
        </nav>
        {open && (
          <div id="menu-movil" className="border-t border-line bg-canvas px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col">{links}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {user ? (
                <>
                  <ButtonLink to="/reportar" variant="primary" onClick={() => setOpen(false)}>
                    Reportar fuga
                  </ButtonLink>
                  <ButtonLink to="/perfil" onClick={() => setOpen(false)}>
                    Mi perfil
                  </ButtonLink>
                  <button type="button" className="px-3 text-warm" onClick={() => void logout()}>
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <ButtonLink to="/registro" variant="primary" onClick={() => setOpen(false)}>
                    Crear cuenta
                  </ButtonLink>
                  <ButtonLink to="/login" onClick={() => setOpen(false)}>
                    Iniciar sesión
                  </ButtonLink>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6">{children}</main>
      <LocationConsentDialog />
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-6 text-[12px] text-warm sm:px-6">
          <p>Agua Alerta · Reportes ciudadanos de fugas y problemas de agua potable.</p>
          <p>
            Límites territoriales e indicadores de agua:{" "}
            <a className="underline hover:text-ink" href="https://www.inegi.org.mx/temas/agua/" target="_blank" rel="noreferrer">
              INEGI
            </a>
            . Mapa base © Esri · OpenStreetMap.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const priv = (el: React.ReactNode) => <PrivateRoute>{el}</PrivateRoute>;
  return (
    <Shell>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<ForgotPasswordPage />} />
          <Route path="/restablecer" element={<ResetPasswordPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/reportar" element={priv(<ReportPage />)} />
          <Route path="/mis-reportes" element={priv(<MyReportsPage />)} />
          <Route path="/tablero" element={priv(<DashboardPage />)} />
          <Route path="/perfil" element={priv(<ProfilePage />)} />
          <Route path="/admin" element={priv(<AdminPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}
