package mx.aguaalerta.data

import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

val AppJson = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    isLenient = true
    coerceInputValues = true
}

/** Motor HTTP de cada plataforma (OkHttp en Android, NSURLSession en iOS). */
expect fun platformHttpClient(config: io.ktor.client.HttpClientConfig<*>.() -> Unit): HttpClient

/** Solo pruebas: sustituye el motor HTTP (p. ej. MockEngine) para simular la API. */
object HttpOverrides {
    var engine: io.ktor.client.engine.HttpClientEngine? = null
}

fun createHttpClient(): HttpClient = HttpOverrides.engine?.let { HttpClient(it) { baseConfig() } } ?: platformHttpClient { baseConfig() }

private fun io.ktor.client.HttpClientConfig<*>.baseConfig() {
    expectSuccess = false
    install(ContentNegotiation) { json(AppJson) }
    install(HttpTimeout) {
        // El servidor gratuito se duerme: la primera petición puede tardar ~1 minuto
        requestTimeoutMillis = 90_000
        connectTimeoutMillis = 30_000
        socketTimeoutMillis = 90_000
    }
}
