package mx.aguaalerta.data

import com.russhwolf.settings.Settings
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeMark
import kotlin.time.TimeSource

/** Guarda la sesión de Firebase y entrega siempre un token vigente (lo renueva antes de que caduque). */
class Session(private val auth: FirebaseAuthApi, private val settings: Settings = Settings()) {
    private val mutex = Mutex()
    private var idToken: String? = null
    private var expiresAt: TimeMark? = null

    val hasSession: Boolean get() = settings.getStringOrNull(KEY_REFRESH) != null

    fun store(tokens: FirebaseTokens) {
        idToken = tokens.idToken
        expiresAt = TimeSource.Monotonic.markNow() + (tokens.expiresIn.toLongOrNull() ?: 3600L).seconds
        settings.putString(KEY_REFRESH, tokens.refreshToken)
    }

    /** Token vigente; con `force` se renueva aunque no haya caducado (p. ej. tras verificar el correo). */
    suspend fun token(force: Boolean = false): String? = mutex.withLock {
        val current = idToken
        val exp = expiresAt
        if (!force && current != null && exp != null && (exp - 60.seconds).hasNotPassedNow()) return current
        val refresh = settings.getStringOrNull(KEY_REFRESH) ?: return null
        store(auth.refresh(refresh))
        idToken
    }

    fun clear() {
        idToken = null
        expiresAt = null
        settings.remove(KEY_REFRESH)
    }

    var savedView: String?
        get() = settings.getStringOrNull(KEY_VIEW)
        set(value) = if (value == null) settings.remove(KEY_VIEW) else settings.putString(KEY_VIEW, value)

    private companion object {
        const val KEY_REFRESH = "aa_refresh_token"
        const val KEY_VIEW = "aa_view"
    }
}
