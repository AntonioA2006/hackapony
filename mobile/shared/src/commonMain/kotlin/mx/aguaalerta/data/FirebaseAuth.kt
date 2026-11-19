package mx.aguaalerta.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.forms.submitForm
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.http.parameters
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import mx.aguaalerta.AppConfig

class AuthException(message: String) : Exception(message)

@Serializable
data class FirebaseTokens(
    val idToken: String,
    val refreshToken: String,
    val expiresIn: String = "3600",
    val localId: String = "",
    val email: String = "",
)

@Serializable
private data class RefreshResponse(
    @SerialName("id_token") val idToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("expires_in") val expiresIn: String = "3600",
)

@Serializable
private data class LookupResponse(val users: List<LookupUser> = emptyList())

@Serializable
private data class LookupUser(val email: String = "", val emailVerified: Boolean = false)

/**
 * Firebase Authentication por su API REST. Es la misma cuenta que usa el sitio web, sin depender de
 * Google Play Services: funciona en cualquier Android (incluidos los que no traen servicios de Google) y en iOS.
 */
class FirebaseAuthApi(private val http: HttpClient) {
    private val key = AppConfig.FIREBASE_API_KEY
    private val base = "https://identitytoolkit.googleapis.com/v1/accounts"

    suspend fun signIn(email: String, password: String): FirebaseTokens =
        call("signInWithPassword", mapOf("email" to email, "password" to password, "returnSecureToken" to true)).body()

    suspend fun signUp(email: String, password: String): FirebaseTokens =
        call("signUp", mapOf("email" to email, "password" to password, "returnSecureToken" to true)).body()

    suspend fun sendVerification(idToken: String) {
        call(
            "sendOobCode",
            mapOf("requestType" to "VERIFY_EMAIL", "idToken" to idToken, "continueUrl" to "${AppConfig.WEB_URL}/tablero?verificado=1"),
        )
    }

    suspend fun sendPasswordReset(email: String) {
        call("sendOobCode", mapOf("requestType" to "PASSWORD_RESET", "email" to email, "continueUrl" to "${AppConfig.WEB_URL}/login"))
    }

    suspend fun isEmailVerified(idToken: String): Boolean =
        call("lookup", mapOf("idToken" to idToken)).body<LookupResponse>().users.firstOrNull()?.emailVerified ?: false

    suspend fun refresh(refreshToken: String): FirebaseTokens {
        val res = http.submitForm(
            url = "https://securetoken.googleapis.com/v1/token?key=$key",
            formParameters = parameters {
                append("grant_type", "refresh_token")
                append("refresh_token", refreshToken)
            },
        )
        if (!res.status.isSuccess()) throw AuthException(errorMessage(res))
        val r = res.body<RefreshResponse>()
        return FirebaseTokens(r.idToken, r.refreshToken, r.expiresIn)
    }

    private suspend fun call(method: String, body: Map<String, Any>): HttpResponse {
        val res = http.post("$base:$method?key=$key") {
            contentType(ContentType.Application.Json)
            setBody(
                kotlinx.serialization.json.buildJsonObject {
                    body.forEach { (k, v) ->
                        when (v) {
                            is Boolean -> put(k, kotlinx.serialization.json.JsonPrimitive(v))
                            else -> put(k, kotlinx.serialization.json.JsonPrimitive(v.toString()))
                        }
                    }
                },
            )
        }
        if (!res.status.isSuccess()) throw AuthException(errorMessage(res))
        return res
    }

    private suspend fun errorMessage(res: HttpResponse): String {
        val code = runCatching {
            val root = AppJson.parseToJsonElement(res.bodyAsText()).jsonObject
            val err = root["error"]
            when {
                err == null -> ""
                err is kotlinx.serialization.json.JsonPrimitive -> err.content
                else -> err.jsonObject["message"]?.jsonPrimitive?.content.orEmpty()
            }
        }.getOrDefault("")
        val key = code.substringBefore(" ").substringBefore(":").uppercase()
        return FIREBASE_ERRORS[key] ?: "No fue posible completar la operación. Inténtalo de nuevo."
    }

    private companion object {
        val FIREBASE_ERRORS = mapOf(
            "INVALID_LOGIN_CREDENTIALS" to "Correo o contraseña incorrectos.",
            "INVALID_PASSWORD" to "Correo o contraseña incorrectos.",
            "EMAIL_NOT_FOUND" to "Correo o contraseña incorrectos.",
            "INVALID_EMAIL" to "El correo no es válido.",
            "USER_DISABLED" to "Esta cuenta está deshabilitada.",
            "EMAIL_EXISTS" to "Ya existe una cuenta con ese correo.",
            "WEAK_PASSWORD" to "La contraseña debe tener al menos 8 caracteres.",
            "TOO_MANY_ATTEMPTS_TRY_LATER" to "Demasiados intentos. Espera unos minutos.",
            "MISSING_PASSWORD" to "Escribe tu contraseña.",
            "TOKEN_EXPIRED" to "Tu sesión expiró. Vuelve a iniciar sesión.",
            "INVALID_REFRESH_TOKEN" to "Tu sesión expiró. Vuelve a iniciar sesión.",
            "USER_NOT_FOUND" to "Tu sesión expiró. Vuelve a iniciar sesión.",
            "INVALID_ID_TOKEN" to "Tu sesión expiró. Vuelve a iniciar sesión.",
        )
    }
}
