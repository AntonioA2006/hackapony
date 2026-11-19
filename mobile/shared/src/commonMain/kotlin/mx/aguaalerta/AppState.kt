package mx.aguaalerta

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.vector.ImageVector
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import com.russhwolf.settings.Settings
import mx.aguaalerta.data.AguaApi
import mx.aguaalerta.data.ApiException
import mx.aguaalerta.data.AuthException
import mx.aguaalerta.data.FirebaseAuthApi
import mx.aguaalerta.data.Session
import mx.aguaalerta.data.User
import mx.aguaalerta.data.createHttpClient
import mx.aguaalerta.ui.AguaIcons

/** Qué ve cada rol en el teléfono. El despacho y la supervisión completa viven en la web. */
enum class MobileView { Citizen, Crew, WebOnly }

enum class Tab(val label: String, val icon: ImageVector) {
    Home("Inicio", AguaIcons.Home),
    Report("Reportar", AguaIcons.Plus),
    Reports("Mis reportes", AguaIcons.List),
    Orders("Órdenes", AguaIcons.Helmet),
    Profile("Perfil", AguaIcons.User),
}

sealed interface Detail {
    data class CrewOrder(val incidentId: String, val publicId: String) : Detail
}

enum class Phase { Booting, SignedOut, SessionError, SignedIn }
enum class AuthScreen { Login, Register, Forgot }

fun isOperator(role: String?) = role in setOf("OPERADOR", "TECNICO", "ADMINISTRADOR", "SUPERADMINISTRADOR")
fun isCrew(role: String?) = role == "CUADRILLA"
fun isSupervisor(role: String?) = role == "SUPERADMINISTRADOR"

class AppState(private val scope: CoroutineScope, settings: Settings = Settings()) {
    private val http = createHttpClient()
    private val firebase = FirebaseAuthApi(http)
    val session = Session(firebase, settings)
    val api = AguaApi(http, session)

    var phase by mutableStateOf(Phase.Booting)
        private set
    var user by mutableStateOf<User?>(null)
        private set
    var emailVerified by mutableStateOf(true)
        private set
    /** Solo supervisión elige vista: "ciudadano" o "cuadrilla". */
    var chosenView by mutableStateOf(session.savedView)
        private set

    var authScreen by mutableStateOf(AuthScreen.Login)
    var tab by mutableStateOf(Tab.Home)
    val details = mutableStateListOf<Detail>()
    /** Se incrementa para que las pantallas vuelvan a cargar (p. ej. tras enviar un reporte). */
    var refreshTick by mutableIntStateOf(0)
        private set

    val view: MobileView
        get() {
            val role = user?.role
            return when {
                isSupervisor(role) -> if (chosenView == "cuadrilla") MobileView.Crew else MobileView.Citizen
                isCrew(role) -> MobileView.Crew
                isOperator(role) -> MobileView.WebOnly
                else -> MobileView.Citizen
            }
        }

    val tabs: List<Tab>
        get() = when (view) {
            MobileView.Citizen -> listOf(Tab.Home, Tab.Report, Tab.Reports, Tab.Profile)
            MobileView.Crew -> listOf(Tab.Orders, Tab.Profile)
            MobileView.WebOnly -> emptyList()
        }

    fun boot() {
        if (phase == Phase.SignedIn) return // ya hay sesión en memoria (p. ej. tras entrar)
        scope.launch { api.ping() } // despierta el servidor gratuito mientras se muestra la portada
        scope.launch {
            if (!session.hasSession) {
                phase = Phase.SignedOut
                return@launch
            }
            phase = Phase.Booting
            try {
                session.token(force = true)
                loadUser()
                phase = Phase.SignedIn
            } catch (e: CancellationException) {
                throw e
            } catch (_: AuthException) {
                session.clear()
                phase = Phase.SignedOut
            } catch (e: ApiException) {
                if (e.status == 401) {
                    session.clear()
                    phase = Phase.SignedOut
                } else phase = Phase.SessionError
            } catch (_: Exception) {
                phase = Phase.SessionError
            }
        }
    }

    private suspend fun loadUser() {
        user = api.me()
        emailVerified = runCatching { firebase.isEmailVerified(session.token()!!) }.getOrDefault(true)
        tab = tabs.firstOrNull() ?: Tab.Home
        details.clear()
    }

    /** Devuelve un mensaje de error o null si entró. */
    suspend fun login(email: String, password: String, crewEntry: Boolean): String? = guard {
        session.store(firebase.signIn(email.trim(), password))
        val me = api.me()
        if (crewEntry && !isCrew(me.role) && !isSupervisor(me.role)) {
            session.clear()
            return@guard "Tu cuenta no pertenece a una cuadrilla. Pide a supervisión que te asigne ese rol."
        }
        if (isSupervisor(me.role)) chooseView(if (crewEntry) "cuadrilla" else "ciudadano", reset = false)
        loadUser()
        phase = Phase.SignedIn
        null
    }

    suspend fun register(name: String, email: String, password: String): String? = guard {
        session.store(firebase.signUp(email.trim(), password))
        runCatching { firebase.sendVerification(session.token()!!) }
        api.updateName(name.trim())
        loadUser()
        phase = Phase.SignedIn
        null
    }

    suspend fun sendPasswordReset(email: String): String? = guard {
        firebase.sendPasswordReset(email.trim())
        null
    }

    /** Tras abrir el enlace del correo: renueva el token para que la API vea el correo verificado. */
    suspend fun checkEmailVerified(): Boolean {
        val token = runCatching { session.token(force = true) }.getOrNull() ?: return false
        emailVerified = runCatching { firebase.isEmailVerified(token) }.getOrDefault(false)
        if (emailVerified) refresh()
        return emailVerified
    }

    suspend fun resendVerification(): String? = guard {
        firebase.sendVerification(session.token()!!)
        null
    }

    suspend fun rename(name: String): String? = guard {
        user = api.updateName(name.trim())
        null
    }

    fun chooseView(v: String, reset: Boolean = true) {
        chosenView = v
        session.savedView = v
        if (reset) {
            details.clear()
            tab = tabs.first()
        }
    }

    fun logout() {
        session.clear()
        session.savedView = null
        chosenView = null
        user = null
        details.clear()
        authScreen = AuthScreen.Login
        phase = Phase.SignedOut
    }

    /** La API respondió 401: la sesión ya no es válida. */
    fun expire() {
        if (phase == Phase.SignedIn) logout()
    }

    fun refresh() {
        refreshTick++
    }

    fun open(detail: Detail) = details.add(detail)

    fun selectTab(t: Tab) {
        details.clear()
        tab = t
    }

    val canGoBack: Boolean
        get() = when (phase) {
            Phase.SignedIn -> details.isNotEmpty() || (tabs.isNotEmpty() && tab != tabs.first())
            Phase.SignedOut -> authScreen != AuthScreen.Login
            else -> false
        }

    fun back() {
        when {
            phase == Phase.SignedOut -> authScreen = AuthScreen.Login
            details.isNotEmpty() -> details.removeAt(details.lastIndex)
            tabs.isNotEmpty() -> tab = tabs.first()
        }
    }

    private suspend fun guard(block: suspend () -> String?): String? = try {
        block()
    } catch (e: CancellationException) {
        throw e
    } catch (e: AuthException) {
        e.message
    } catch (e: ApiException) {
        e.message
    } catch (e: Exception) {
        "Sin conexión. Revisa tu red e inténtalo de nuevo."
    }
}

/** Carga de datos con estado (cargando / error / datos) y recarga manual o por `refreshTick`. */
class Loader<T>(private val scope: CoroutineScope, private val app: AppState, private val block: suspend () -> T) {
    var data by mutableStateOf<T?>(null)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var loading by mutableStateOf(false)
        private set

    fun reload() {
        scope.launch {
            loading = true
            error = null
            try {
                data = block()
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                if (e.status == 401) app.expire() else error = e.message
            } catch (e: AuthException) {
                app.expire()
            } catch (e: Exception) {
                error = e.message ?: "Ocurrió un error."
            } finally {
                loading = false
            }
        }
    }
}

@Composable
fun <T> AppState.load(vararg keys: Any?, block: suspend () -> T): Loader<T> {
    val scope = rememberCoroutineScope()
    val loader = remember(*keys) { Loader(scope, this, block) }
    LaunchedEffect(loader, refreshTick) { loader.reload() }
    return loader
}
