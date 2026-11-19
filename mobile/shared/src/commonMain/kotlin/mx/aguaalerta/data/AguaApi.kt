package mx.aguaalerta.data

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.get
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.client.statement.readRawBytes
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import mx.aguaalerta.AppConfig

class ApiException(val status: Int, message: String) : Exception(message)

/** Cliente de la API de Agua Alerta (la misma que usa el sitio web). */
class AguaApi(private val http: HttpClient, private val session: Session) {
    private val _waking = MutableStateFlow(false)
    /** true mientras el servidor gratuito "despierta" (primera petición tras un rato sin uso). */
    val waking: StateFlow<Boolean> = _waking


    suspend fun ping() = runCatching { http.get("${AppConfig.API_ROOT}/health") }

    suspend fun me(): User = send(HttpMethod.Get, "/users/me").body()
    suspend fun updateName(name: String): User = send(HttpMethod.Patch, "/users/me", ProfileUpdate(name)).body()
    suspend fun activeReport(): ActiveReportResponse = send(HttpMethod.Get, "/users/me/active-report").body()
    suspend fun citizenStats(): CitizenStats = send(HttpMethod.Get, "/statistics/citizen-dashboard").body()
    suspend fun notifications(): Page<AppNotification> =
        send(HttpMethod.Get, "/users/me/notifications?unread_only=true&page_size=10").body()
    suspend fun markRead(id: String) { send(HttpMethod.Patch, "/users/me/notifications/$id/read") }
    suspend fun myReports(): Page<Report> = send(HttpMethod.Get, "/users/me/reports?page_size=50").body()
    suspend fun createReport(payload: ReportCreate): Report = send(HttpMethod.Post, "/reports", payload).body()
    suspend fun rate(incidentId: String, score: Int) { send(HttpMethod.Post, "/incidents/$incidentId/satisfaction", SatisfactionIn(score)) }

    /** Devuelve cuántas fotos fallaron. */
    suspend fun uploadPhotos(reportId: String, photos: List<PickedPhoto>): Int {
        var failed = 0
        photos.forEachIndexed { i, p ->
            val ok = runCatching {
                send(HttpMethod.Post, "/reports/$reportId/photos", multipart("file", "foto-${i + 1}.jpg", p, emptyMap()))
            }.isSuccess
            if (!ok) failed++
        }
        return failed
    }

    suspend fun crewOrders(supervisor: Boolean): Page<Incident> =
        send(HttpMethod.Get, "/incidents?status=${if (supervisor) "in_progress" else "active"}&page_size=50").body()
    suspend fun incidentDetail(id: String): IncidentDetail = send(HttpMethod.Get, "/incidents/$id/detail").body()
    suspend fun reportPhoto(reportId: String, photoId: String): ByteArray =
        send(HttpMethod.Get, "/reports/$reportId/photos/$photoId/content").readRawBytes()

    suspend fun submitResolution(incidentId: String, description: String, minutes: Int, photo: PickedPhoto) {
        send(
            HttpMethod.Post,
            "/incidents/$incidentId/resolution",
            multipart("file", "cierre.jpg", photo, mapOf("description" to description, "minutes_spent" to minutes.toString())),
        )
    }

    private fun multipart(field: String, name: String, photo: PickedPhoto, extra: Map<String, String>) =
        MultiPartFormDataContent(
            formData {
                extra.forEach { (k, v) -> append(k, v) }
                append(
                    field,
                    photo.bytes,
                    Headers.build {
                        append(HttpHeaders.ContentType, photo.mime)
                        append(HttpHeaders.ContentDisposition, "filename=\"$name\"")
                    },
                )
            },
        )

    private suspend fun send(method: HttpMethod, path: String, body: Any? = null): HttpResponse {
        var attempt = 0
        while (true) {
            val token = session.token()
            val res = runCatching {
                http.request(AppConfig.API_BASE + path) {
                    this.method = method
                    token?.let { bearerAuth(it) }
                    applyBody(body)
                }
            }
            val response = res.getOrNull()
            // Servidor dormido o red intermitente: reintentar unas veces antes de rendirse
            val retriable = response == null || response.status.value in setOf(502, 503, 504)
            if (retriable && attempt < 4) {
                attempt++
                _waking.value = true
                delay(6_000L * attempt)
                continue
            }
            _waking.value = false
            if (response == null) throw ApiException(0, "Sin conexión. Revisa tu red e inténtalo de nuevo.")
            if (!response.status.isSuccess()) throw ApiException(response.status.value, detail(response))
            return response
        }
    }

    private fun HttpRequestBuilder.applyBody(body: Any?) {
        when (body) {
            null -> Unit
            is MultiPartFormDataContent -> setBody(body)
            is ProfileUpdate -> { contentType(ContentType.Application.Json); setBody(body) }
            is ReportCreate -> { contentType(ContentType.Application.Json); setBody(body) }
            is SatisfactionIn -> { contentType(ContentType.Application.Json); setBody(body) }
            else -> error("Cuerpo no soportado: ${body::class}")
        }
    }

    private suspend fun detail(res: HttpResponse): String {
        val text = runCatching { res.bodyAsText() }.getOrDefault("")
        val parsed = runCatching {
            when (val d = AppJson.parseToJsonElement(text).jsonObject["detail"]) {
                is JsonPrimitive -> d.content
                is JsonArray -> d.firstOrNull()?.jsonObject?.get("msg")?.jsonPrimitive?.content
                    ?.removePrefix("Value error, ")
                else -> null
            }
        }.getOrNull()
        return parsed ?: when (res.status.value) {
            401 -> "Tu sesión expiró. Vuelve a iniciar sesión."
            403 -> "Tu cuenta no tiene permiso para esta acción."
            404 -> "No encontrado."
            else -> "Ocurrió un error (${res.status.value}). Inténtalo de nuevo."
        }
    }
}
