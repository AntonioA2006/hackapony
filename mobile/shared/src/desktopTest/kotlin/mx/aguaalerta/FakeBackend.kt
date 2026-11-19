package mx.aguaalerta

import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.http.headersOf
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import mx.aguaalerta.data.AppJson

/**
 * Simula Firebase Auth (REST) y la API de Agua Alerta con las mismas formas de respuesta que producción.
 * Cuentas: ciudadano@, cuadrilla@, operador@, super@ y nuevo@ (sin verificar); contraseña "Correcta123".
 */
class FakeBackend {
    val requests = mutableListOf<Pair<String, String>>() // método+ruta → cuerpo
    var activeTicket = true
    var reportStatus = 201

    private val roles = mapOf(
        "ciudadano" to "CIUDADANO", "cuadrilla" to "CUADRILLA", "operador" to "OPERADOR",
        "super" to "SUPERADMINISTRADOR", "nuevo" to "CIUDADANO",
    )
    private val names = mapOf(
        "ciudadano" to "María López", "cuadrilla" to "Cuadrilla Norte 3", "operador" to "Luis Operador",
        "super" to "Ana Supervisión", "nuevo" to "Pedro Nuevo",
    )

    val engine = MockEngine { req -> handle(req) }

    private fun MockRequestHandleScope.json(body: String, status: HttpStatusCode = HttpStatusCode.OK): HttpResponseData =
        respond(body, status, headersOf(HttpHeaders.ContentType, "application/json"))

    private fun bodyOf(req: HttpRequestData): String = when (val b = req.body) {
        is OutgoingContent.ByteArrayContent -> b.bytes().decodeToString()
        is OutgoingContent.WriteChannelContent, is OutgoingContent.ReadChannelContent -> "<stream>"
        else -> ""
    }

    private fun who(req: HttpRequestData): String =
        req.headers[HttpHeaders.Authorization]?.removePrefix("Bearer id-") ?: ""

    private fun MockRequestHandleScope.handle(req: HttpRequestData): HttpResponseData {
        val url = req.url
        val path = url.encodedPath
        val body = bodyOf(req)
        requests += "${req.method.value} $path" to body

        if (url.host == "identitytoolkit.googleapis.com") {
            val fields = runCatching { AppJson.parseToJsonElement(body).jsonObject }.getOrNull()
            return when {
                path.endsWith(":signInWithPassword") -> {
                    val email = fields?.get("email")?.jsonPrimitive?.content.orEmpty()
                    val pw = fields?.get("password")?.jsonPrimitive?.content.orEmpty()
                    val user = email.substringBefore("@")
                    if (pw != "Correcta123" || user !in roles) {
                        json("""{"error":{"code":400,"message":"INVALID_LOGIN_CREDENTIALS"}}""", HttpStatusCode.BadRequest)
                    } else json("""{"idToken":"id-$user","refreshToken":"rt-$user","expiresIn":"3600","localId":"u-$user","email":"$email"}""")
                }
                path.endsWith(":signUp") -> json("""{"idToken":"id-nuevo","refreshToken":"rt-nuevo","expiresIn":"3600","localId":"u-nuevo"}""")
                path.endsWith(":sendOobCode") -> json("""{"email":"x@example.com"}""")
                path.endsWith(":lookup") -> {
                    val token = fields?.get("idToken")?.jsonPrimitive?.content.orEmpty()
                    json("""{"users":[{"email":"x@example.com","emailVerified":${token != "id-nuevo"}}]}""")
                }
                else -> json("""{"error":{"message":"UNKNOWN"}}""", HttpStatusCode.BadRequest)
            }
        }
        if (url.host == "securetoken.googleapis.com") {
            val rt = body.substringAfter("refresh_token=").substringBefore("&")
            val user = rt.removePrefix("rt-")
            return json("""{"id_token":"id-$user","refresh_token":"$rt","expires_in":"3600"}""")
        }
        if (path == "/health") return json("""{"status":"ok"}""")

        val user = who(req)
        if (user !in roles) return json("""{"detail":"No autenticado"}""", HttpStatusCode.Unauthorized)
        val api = path.removePrefix("/api/v1")
        return when {
            api == "/users/me" && req.method == HttpMethod.Patch -> {
                val n = AppJson.parseToJsonElement(body).jsonObject["display_name"]!!.jsonPrimitive.content
                json("""{"id":"u-$user","email":"$user@example.com","display_name":"$n","role":"${roles[user]}"}""")
            }
            api == "/users/me" -> json("""{"id":"u-$user","email":"$user@example.com","display_name":"${names[user]}","role":"${roles[user]}"}""")
            api == "/users/me/active-report" -> json(
                if (activeTicket) """{"email_verified":true,"active":{"public_id":"AA-2041","title":"Fuga en vía pública · chorro","status":"validated","incident_public_id":"INC-88","incident_status":"in_progress","urgency_score":71.5,"stage":2,"dispatched":true,"crew_name":"Cuadrilla Norte 3","created_at":"2026-11-18T16:20:00Z"}}"""
                else """{"email_verified":${user != "nuevo"},"active":null}""",
            )
            api == "/statistics/citizen-dashboard" -> json("""{"total_reports":4,"pending":0,"in_progress":1,"resolved":3}""")
            api.startsWith("/users/me/notifications") && req.method == HttpMethod.Get ->
                json("""{"items":[{"id":"n1","title":"Tu reporte fue validado","body":"Un operador confirmó la fuga AA-2041 y la envió a una cuadrilla.","read_at":null,"created_at":"2026-11-18T17:00:00Z"}],"total":1,"page":1,"page_size":10}""")
            api == "/users/me/reports" || api.startsWith("/users/me/reports?") -> json(
                """{"items":[
                {"id":"r1","public_id":"AA-2041","status":"validated","title":"Fuga en vía pública · chorro","description":"Sale agua con fuerza junto a la banqueta","category":"leak_public_road","severity":"high","latitude":19.43,"longitude":-99.13,"address_reference":null,"incident_id":"i1","created_at":"2026-11-18T16:20:00Z","reported_at":null,"leak_flow":"chorro","incident_status":"in_progress","nearby_suggestions":[]},
                {"id":"r0","public_id":"AA-1980","status":"resolved","title":"Tubería rota en el parque","description":"Tubo roto","category":"broken_pipe","severity":"medium","latitude":19.42,"longitude":-99.12,"address_reference":"Parque Hundido","incident_id":"i0","created_at":"2026-10-02T09:10:00Z","reported_at":null,"leak_flow":"goteo","incident_status":"resolved","nearby_suggestions":[]}
                ],"total":2,"page":1,"page_size":50}""",
            )
            api == "/reports" && req.method == HttpMethod.Post -> if (reportStatus == 201) json(
                """{"id":"r9","public_id":"AA-2099","status":"received","title":"t","description":"d","category":"leak_public_road","severity":"high","latitude":19.4326,"longitude":-99.1332,"address_reference":null,"incident_id":"i9","created_at":"2026-11-19T10:00:00Z","reported_at":null,"leak_flow":"chorro","nearby_suggestions":[]}""",
                HttpStatusCode.Created,
            ) else json("""{"detail":[{"type":"value_error","loc":["body","contact_phone"],"msg":"Value error, El teléfono debe tener 10 dígitos","input":"123"}]}""", HttpStatusCode.UnprocessableEntity)
            api.matches(Regex("/reports/[^/]+/photos")) -> json("""{"id":"p1","mime_type":"image/jpeg","size_bytes":1000,"created_at":"2026-11-19T10:00:00Z"}""", HttpStatusCode.Created)
            api == "/incidents" -> json(
                """{"items":[
                {"id":"i1","public_id":"INC-88","primary_category":"leak_public_road","status":"in_progress","urgency_score":71.5,"priority_band":"high","latitude":19.4326,"longitude":-99.1332,"report_count":2,"confirmation_count":1,"validated":true,"awaiting_validation":false,"leak_flow":"chorro","state_name":"Ciudad de México","municipality_name":"Cuauhtémoc","opened_at":"2026-11-18T16:20:00Z","updated_at":"2026-11-18T18:00:00Z","aggregated_severity":"high","assigned_to":{"id":"u-cuadrilla","display_name":"Cuadrilla Norte 3"}},
                {"id":"i2","public_id":"INC-91","primary_category":"flood_from_leak","status":"in_progress","urgency_score":88.0,"priority_band":"critical","latitude":19.40,"longitude":-99.15,"report_count":4,"confirmation_count":3,"validated":true,"awaiting_validation":false,"leak_flow":"inundacion","state_name":"Ciudad de México","municipality_name":"Benito Juárez","opened_at":"2026-11-19T07:45:00Z","updated_at":"2026-11-19T08:00:00Z","aggregated_severity":"critical","assigned_to":{"id":"u-cuadrilla","display_name":"Cuadrilla Norte 3"}}
                ],"total":2,"page":1,"page_size":50}""",
            )
            api == "/incidents/i1/detail" -> json(
                """{"incident":{"id":"i1","public_id":"INC-88","primary_category":"leak_public_road","status":"in_progress","urgency_score":71.5,"priority_band":"high","latitude":19.4326,"longitude":-99.1332,"report_count":2,"confirmation_count":1,"leak_flow":"chorro","state_name":"Ciudad de México","municipality_name":"Cuauhtémoc","opened_at":"2026-11-18T16:20:00Z","updated_at":"2026-11-18T18:00:00Z","aggregated_severity":"high","assigned_to":{"id":"u-cuadrilla","display_name":"Cuadrilla Norte 3"}},
                "reports":[{"id":"r1","public_id":"AA-2041","title":"Fuga en vía pública · chorro","description":"Sale agua con fuerza junto a la banqueta, ya hay charco hasta la esquina.","category":"leak_public_road","severity":"high","leak_flow":"chorro","status":"validated","address_reference":"Frente a la papelería, esquina con Juárez","created_at":"2026-11-18T16:20:00Z","lat":19.4326,"lon":-99.1332,"reporter":"María López","contact_phone":"5512345678","photos":[]}],
                "history":[],"photos_purged_at":null,"resolution":null}""",
            )
            api.matches(Regex("/incidents/[^/]+/resolution")) -> json("""{"status":"pending_verification","resolution":{"description":"x","minutes_spent":40,"has_photo":true,"submitted_at":"2026-11-19T12:00:00Z","verified_at":null}}""")
            api.matches(Regex("/incidents/[^/]+/satisfaction")) -> json("""{"score":5,"satisfaction_avg":4.5}""")
            else -> json("""{"detail":"No encontrado"}""", HttpStatusCode.NotFound)
        }
    }
}
