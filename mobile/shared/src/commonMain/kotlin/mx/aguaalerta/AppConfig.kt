package mx.aguaalerta

/**
 * Configuración pública de la app. La clave web de Firebase identifica al proyecto (no concede acceso;
 * es la misma que publica el sitio en frontend/.env.production). Los permisos los decide la API.
 */
object AppConfig {
    const val API_BASE = "https://agua-alerta-api.onrender.com/api/v1"
    const val API_ROOT = "https://agua-alerta-api.onrender.com"
    const val WEB_URL = "https://agua-alerta-mx.web.app"
    const val FIREBASE_API_KEY = "AIzaSyDowiWCUZZGxNUvqXk4ix7U3D4EA2a94V8"

    /** Teléfono del organismo operador del agua (vacío = solo se muestra el 911). */
    const val UTILITY_PHONE = ""
    const val UTILITY_NAME = "organismo operador del agua"
    const val EMERGENCY_PHONE = "911"

    /** Debe coincidir con MAX_REPORT_DISTANCE_M de la API. */
    const val MAX_REPORT_DISTANCE_M = 250.0
    const val MAX_PHOTOS = 5
}
