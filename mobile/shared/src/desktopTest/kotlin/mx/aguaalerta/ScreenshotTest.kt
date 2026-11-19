package mx.aguaalerta

import androidx.compose.ui.ImageComposeScene
import androidx.compose.ui.unit.Density
import com.russhwolf.settings.MapSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import mx.aguaalerta.data.HttpOverrides
import org.jetbrains.skia.EncodedImageFormat
import java.io.File
import kotlin.test.Test

/**
 * Renderiza la app real (mismas pantallas que en el teléfono) contra la API simulada y guarda PNG en
 * shared/build/screenshots. Tamaño de un teléfono típico: 412×892 dp.
 */
class ScreenshotTest {
    private val out = File("build/screenshots").apply { mkdirs() }

    private fun shoot(name: String, noTicket: Boolean = false, frames: Int = 70, prepare: suspend (AppState) -> Unit) {
        val backend = FakeBackend().apply { activeTicket = !noTicket }
        HttpOverrides.engine = backend.engine
        val app = AppState(CoroutineScope(Dispatchers.Default), MapSettings())
        runBlocking { prepare(app) }
        val density = 2f
        val scene = ImageComposeScene((412 * density).toInt(), (892 * density).toInt(), Density(density)) {
            AguaAlertaApp(app)
        }
        var t = 0L
        repeat(frames) {
            scene.render(t)
            t += 50_000_000L
            Thread.sleep(25)
        }
        val png = scene.render(t).encodeToData(EncodedImageFormat.PNG)!!.bytes
        File(out, "$name.png").writeBytes(png)
        scene.close()
        HttpOverrides.engine = null
    }

    private suspend fun login(app: AppState, who: String, crew: Boolean = false) {
        check(app.login("$who@example.com", "Correcta123", crew) == null)
    }

    @Test
    fun screens() {
        shoot("01-login") { }
        shoot("02-registro") { it.authScreen = AuthScreen.Register }
        shoot("03-inicio-ciudadano") { login(it, "ciudadano") }
        shoot("04-reportar", noTicket = true) { app ->
            login(app, "ciudadano")
            app.tab = Tab.Report
        }
        shoot("05-mis-reportes") { app ->
            login(app, "ciudadano")
            app.tab = Tab.Reports
        }
        shoot("06-perfil-supervision") { app ->
            login(app, "super")
            app.tab = Tab.Profile
        }
        shoot("07-ordenes-cuadrilla") { login(it, "cuadrilla", crew = true) }
        shoot("08-orden-detalle") { app ->
            login(app, "cuadrilla", crew = true)
            app.open(Detail.CrewOrder("i1", "INC-88"))
        }
        shoot("09-operador-web") { login(it, "operador") }
        shoot("10-inicio-sin-ticket", noTicket = true) { login(it, "nuevo") }
    }
}
