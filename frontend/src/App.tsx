import { lazy, Suspense, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./shared/auth/AuthContext";
import { isCrew, isOperator, isSupervisor, ROLE_LABELS } from "./shared/roles";
import { useView, VIEW_HOME, viewFor, type View } from "./shared/viewMode";
import { Button, ButtonLink, Spinner } from "./shared/ui";
import ContactFab from "./shared/ui/ContactFab";
import AuthActionPage from "./pages/AuthActionPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AboutPage from "./pages/AboutPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LocationConsentDialog from "./shared/region/LocationConsentDialog";

// Las vistas del personal van en bundles aparte: el ciudadano no las descarga.
const StaffDashboardPage = lazy(() => import("./pages/staff/StaffDashboardPage"));
const IncidentsQueuePage = lazy(() => import("./pages/staff/IncidentsQueuePage"));
const IncidentDetailPage = lazy(() => import("./pages/staff/IncidentDetailPage"));
const TeamPage = lazy(() => import("./pages/staff/TeamPage"));
const CrewOrdersPage = lazy(() => import("./pages/crew/CrewOrdersPage"));
const CrewOrderPage = lazy(() => import("./pages/crew/CrewOrderPage"));
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

/** Supervisión: cambiar entre la vista de ciudadano, operador o cuadrilla sin cerrar sesión. */
function ViewSwitcher({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const navigate = useNavigate();
  return (
    <label className="flex items-center gap-1.5 text-[12px] text-warm">
      <span className="sr-only sm:not-sr-only">Ver como</span>
      <select
        className="rounded-full border border-line bg-card px-2.5 py-1 text-[13px] text-ink"
        value={view}
        onChange={(e) => {
          const v = e.target.value as View;
          onChange(v);
          navigate(VIEW_HOME[v]);
        }}
        aria-label="Ver como"
      >
        <option value="ciudadano">Ciudadano</option>
        <option value="operador">Operador</option>
        <option value="cuadrilla">Cuadrilla</option>
      </select>
    </label>
  );
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  `flex h-9 items-center rounded-full px-3 text-body transition-colors ${isActive ? "bg-sky font-medium text-ink" : "text-warm hover:bg-card hover:text-ink"}`;

const textLink = "flex h-9 items-center rounded-full px-3 text-body text-warm transition-colors hover:bg-card hover:text-ink";

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { chosen, choose } = useView();
  const view = viewFor(user?.role, chosen);
  const supervisor = isSupervisor(user?.role);
  // "staff" = la vista activa es de personal (en vista ciudadana, supervisión navega como ciudadano)
  const staff = Boolean(user) && view !== "ciudadano";
  const links = (
    <>
      <NavLink to="/" end className={navLink} onClick={() => setOpen(false)}>
        Inicio
      </NavLink>
      {user && view === "cuadrilla" && (
        <NavLink to="/cuadrilla" className={navLink} onClick={() => setOpen(false)}>
          {supervisor ? "Órdenes en campo" : "Mis órdenes"}
        </NavLink>
      )}
      {user && view === "operador" && (
        <>
          <NavLink to="/panel" end className={navLink} onClick={() => setOpen(false)}>
            Panel
          </NavLink>
          <NavLink to="/panel/incidencias" className={navLink} onClick={() => setOpen(false)}>
            Incidencias
          </NavLink>
        </>
      )}
      <NavLink to="/mapa" className={navLink} onClick={() => setOpen(false)}>
        Mapa
      </NavLink>
      {(!user || !staff) && (
        <NavLink to="/mis-reportes" className={navLink} onClick={() => setOpen(false)}>
          Reportes
        </NavLink>
      )}
      {user && !staff && (
        <NavLink to="/tablero" className={navLink} onClick={() => setOpen(false)}>
          Tablero
        </NavLink>
      )}
      <a href="/#indicadores" className={textLink} onClick={() => setOpen(false)}>
        Estadísticas
      </a>
      <NavLink to="/nosotros" className={navLink} onClick={() => setOpen(false)}>
        Sobre nosotros
      </NavLink>
      {supervisor && view === "operador" && (
        <NavLink to="/panel/equipo" className={navLink} onClick={() => setOpen(false)}>
          Equipo
        </NavLink>
      )}
    </>
  );

  return (
    <div className={`flex min-h-screen flex-col ${location.pathname === "/" ? "bg-topographic-water" : ""}`}>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[1300] focus:rounded-full focus:bg-card focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <header className="nav-glass sticky top-0 z-[1000]">
        <nav className="mx-auto flex h-14 max-w-page items-center gap-2 px-4 sm:px-6" aria-label="Principal">
          <Logo />
          <div className="ml-4 hidden items-center lg:flex">{links}</div>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <NavLink to="/perfil" className={navLink} title={ROLE_LABELS[user.role]}>
                  {user.display_name}
                  {user.role !== "CIUDADANO" && <span className="ml-1.5 rounded-full bg-sky px-1.5 text-[10px] font-medium text-cyan-edge">{ROLE_LABELS[user.role]}</span>}
                </NavLink>
                {supervisor && <ViewSwitcher view={view} onChange={(v) => { choose(v); setOpen(false); }} />}
                <button type="button" onClick={() => { choose(null); void logout(); }} className="px-3 text-body text-warm hover:text-ink">
                  Salir
                </button>
                {!staff && (
                  <ButtonLink to="/reportar" variant="primary">
                    Reportar fuga
                  </ButtonLink>
                )}
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
            className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-[#e2e8f0] bg-white text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            <i className={`fa-solid ${open ? "fa-xmark" : "fa-bars"} text-[18px]`} aria-hidden />
          </button>
        </nav>
        {open && (
          <div id="menu-movil" className="border-t border-line bg-canvas px-4 pb-4 pt-2 lg:hidden">
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
                  {supervisor && <ViewSwitcher view={view} onChange={(v) => { choose(v); setOpen(false); }} />}
                  <button type="button" className="px-3 text-warm" onClick={() => { choose(null); void logout(); }}>
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
      <main id="contenido" key={location.pathname} className="anim-page mx-auto w-full max-w-page flex-1 px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
        {children}
      </main>
      <ContactFab />
      <LocationConsentDialog />
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-6 text-[12px] text-warm sm:px-6">
          <p>
            Agua Alerta ·{" "}
            <Link to="/nosotros" className="underline hover:text-ink">
              Sobre nosotros
            </Link>
          </p>
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

/** Rutas por rol: despacho (operador/supervisión), cuadrilla o solo supervisión. */
function StaffRoute({ children, need = "operator" }: { children: React.ReactNode; need?: "operator" | "crew" | "supervisor" }) {
  const { user } = useAuth();
  const { chosen } = useView();
  const sup = isSupervisor(user?.role);
  // Supervisión puede abrir cualquier vista de personal
  const allowed = sup || (need === "crew" ? isCrew(user?.role) : need === "operator" ? isOperator(user?.role) : false);
  return <PrivateRoute>{allowed ? children : <Navigate to={VIEW_HOME[viewFor(user?.role, chosen)]} replace />}</PrivateRoute>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, waking, sessionError, retrySession, logout } = useAuth();
  if (loading) return <Spinner label={waking ? "Despertando el servidor… puede tardar hasta un minuto." : "Cargando…"} />;
  if (!user && sessionError) {
    // Sesión de Firebase válida pero la API no respondió: no expulsar a la persona al login.
    return (
      <div className="mx-auto max-w-md rounded-card border border-line bg-card p-6 text-center shadow-card">
        <h2 className="text-subheading">No pudimos cargar tu cuenta</h2>
        <p className="mt-2 text-body text-warm">
          Tu sesión está abierta, pero el servidor no respondió. Si nadie lo usó en un rato, tarda hasta un minuto en
          despertar.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={() => void retrySession()}>
            Reintentar
          </Button>
          <Button onClick={() => void logout()}>Cerrar sesión</Button>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** El personal entra a su panel; la ciudadanía a su tablero. */
function HomeForRole() {
  const { user } = useAuth();
  const { chosen } = useView();
  const view = viewFor(user?.role, chosen);
  return view === "ciudadano" ? <DashboardPage /> : <Navigate to={VIEW_HOME[view]} replace />;
}

export default function App() {
  const priv = (el: React.ReactNode) => <PrivateRoute>{el}</PrivateRoute>;
  return (
    <Shell>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/nosotros" element={<AboutPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<ForgotPasswordPage />} />
          <Route path="/auth/accion" element={<AuthActionPage />} />
          <Route path="/restablecer" element={<ResetPasswordPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/reportar" element={priv(<ReportPage />)} />
          <Route path="/mis-reportes" element={priv(<MyReportsPage />)} />
          <Route path="/tablero" element={priv(<HomeForRole />)} />
          <Route path="/perfil" element={priv(<ProfilePage />)} />
          <Route path="/panel" element={<StaffRoute><StaffDashboardPage /></StaffRoute>} />
          <Route path="/panel/incidencias" element={<StaffRoute><IncidentsQueuePage /></StaffRoute>} />
          <Route path="/panel/incidencias/:id" element={<StaffRoute><IncidentDetailPage /></StaffRoute>} />
          <Route path="/panel/equipo" element={<StaffRoute need="supervisor"><TeamPage /></StaffRoute>} />
          <Route path="/cuadrilla" element={<StaffRoute need="crew"><CrewOrdersPage /></StaffRoute>} />
          <Route path="/cuadrilla/:id" element={<StaffRoute need="crew"><CrewOrderPage /></StaffRoute>} />
          <Route path="/admin" element={<Navigate to="/panel" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}
