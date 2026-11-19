package mx.aguaalerta

import com.russhwolf.settings.MapSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import mx.aguaalerta.data.ApiException
import mx.aguaalerta.data.AppJson
import mx.aguaalerta.data.HttpOverrides
import mx.aguaalerta.data.PickedPhoto
import mx.aguaalerta.data.ReportCreate
import mx.aguaalerta.ui.Labels
import mx.aguaalerta.ui.screens.metersBetween
import mx.aguaalerta.ui.screens.validateEmail
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AppFlowTest {
    private lateinit var backend: FakeBackend
    private lateinit var settings: MapSettings

    @BeforeTest
    fun setUp() {
        backend = FakeBackend()
        HttpOverrides.engine = backend.engine
        settings = MapSettings()
    }

    @AfterTest
    fun tearDown() {
        HttpOverrides.engine = null
    }

    private fun app() = AppState(CoroutineScope(Dispatchers.Default), settings)

    @Test
    fun citizenLogsInAndSeesCitizenTabs() = runBlocking {
        val app = app()
        assertNull(app.login("ciudadano@example.com", "Correcta123", crewEntry = false))
        assertEquals(Phase.SignedIn, app.phase)
        assertEquals(MobileView.Citizen, app.view)
        assertEquals(listOf(Tab.Home, Tab.Report, Tab.Reports, Tab.Profile), app.tabs)
        assertEquals("María López", app.user?.displayName)
        assertTrue(app.emailVerified)
        assertTrue(app.session.hasSession, "la sesión se guarda para la próxima vez")
    }

    @Test
    fun wrongPasswordShowsFriendlyMessage() = runBlocking {
        val app = app()
        assertEquals("Correo o contraseña incorrectos.", app.login("ciudadano@example.com", "mala", crewEntry = false))
        assertFalse(app.session.hasSession)
    }

    @Test
    fun citizenCannotEnterAsCrew() = runBlocking {
        val app = app()
        val msg = app.login("ciudadano@example.com", "Correcta123", crewEntry = true)
        assertNotNull(msg)
        assertTrue("cuadrilla" in msg)
        assertFalse(app.session.hasSession, "no deja la sesión abierta")
    }

    @Test
    fun crewGetsOrdersAndOperatorIsSentToWeb() = runBlocking {
        val crew = app()
        assertNull(crew.login("cuadrilla@example.com", "Correcta123", crewEntry = true))
        assertEquals(MobileView.Crew, crew.view)
        assertEquals(listOf(Tab.Orders, Tab.Profile), crew.tabs)
        assertEquals(Tab.Orders, crew.tab)

        settings.clear()
        val op = app()
        assertNull(op.login("operador@example.com", "Correcta123", crewEntry = false))
        assertEquals(MobileView.WebOnly, op.view, "el despacho solo está en la web")
        assertTrue(op.tabs.isEmpty())
    }

    @Test
    fun supervisorChoosesCitizenOrCrewButNeverOperatorView() = runBlocking {
        val app = app()
        assertNull(app.login("super@example.com", "Correcta123", crewEntry = true))
        assertEquals(MobileView.Crew, app.view)
        app.chooseView("ciudadano")
        assertEquals(MobileView.Citizen, app.view)
        assertEquals(Tab.Home, app.tab)
    }

    @Test
    fun sessionIsRestoredOnNextLaunch() = runBlocking {
        assertNull(app().login("cuadrilla@example.com", "Correcta123", crewEntry = true))
        val again = app()
        again.boot()
        withTimeout(5_000) { while (again.phase == Phase.Booting) delay(20) }
        assertEquals(Phase.SignedIn, again.phase)
        assertEquals(MobileView.Crew, again.view)
    }

    @Test
    fun logoutClearsSession() = runBlocking {
        val app = app()
        app.login("ciudadano@example.com", "Correcta123", crewEntry = false)
        app.logout()
        assertEquals(Phase.SignedOut, app.phase)
        assertFalse(app.session.hasSession)
    }

    @Test
    fun registerSendsVerificationAndSavesName() = runBlocking {
        val app = app()
        assertNull(app.register("Pedro Nuevo", "nuevo@example.com", "Segura123"))
        assertFalse(app.emailVerified, "la cuenta nueva aún no está verificada")
        assertTrue(backend.requests.any { it.first.endsWith(":sendOobCode") && "VERIFY_EMAIL" in it.second })
        val patch = backend.requests.first { it.first == "PATCH /api/v1/users/me" }
        assertEquals("Pedro Nuevo", AppJson.parseToJsonElement(patch.second).jsonObject["display_name"]!!.jsonPrimitive.content)
    }

    @Test
    fun reportPayloadMatchesApiContract() = runBlocking {
        val app = app()
        app.login("ciudadano@example.com", "Correcta123", crewEntry = false)
        val created = app.api.createReport(
            ReportCreate("Fuga en vía pública", "Sale agua con fuerza", "leak_public_road", "high", 19.4326, -99.1332, 19.4327, -99.1331, leakFlow = "chorro"),
        )
        assertEquals("AA-2099", created.publicId)
        val sent = AppJson.parseToJsonElement(backend.requests.first { it.first == "POST /api/v1/reports" }.second).jsonObject
        assertEquals("19.4327", sent["device_latitude"]!!.jsonPrimitive.content)
        assertEquals("chorro", sent["leak_flow"]!!.jsonPrimitive.content)
        assertFalse("contact_phone" in sent, "los campos vacíos no se envían")
        assertEquals(0, app.api.uploadPhotos(created.id, listOf(PickedPhoto(byteArrayOf(1, 2, 3)))))
    }

    @Test
    fun validationErrorFromApiIsReadable() = runBlocking {
        val app = app()
        app.login("ciudadano@example.com", "Correcta123", crewEntry = false)
        backend.reportStatus = 422
        val e = runCatching {
            app.api.createReport(ReportCreate("Fuga", "Descripción larga", "leak_public_road", "high", 19.4, -99.1, 19.4, -99.1, contactPhone = "123"))
        }.exceptionOrNull()
        assertTrue(e is ApiException)
        assertEquals("El teléfono debe tener 10 dígitos", e.message)
    }

    @Test
    fun crewDetailParsesAndClosesWithPhoto() = runBlocking {
        val app = app()
        app.login("cuadrilla@example.com", "Correcta123", crewEntry = true)
        val orders = app.api.crewOrders(supervisor = false)
        assertEquals(2, orders.items.size)
        assertEquals("Cuadrilla Norte 3", orders.items.first().assignedTo?.displayName)
        val d = app.api.incidentDetail("i1")
        assertEquals("5512345678", d.reports.single().contactPhone)
        app.api.submitResolution("i1", "Se cambió el tramo de tubo dañado", 40, PickedPhoto(byteArrayOf(9)))
        assertTrue(backend.requests.any { it.first == "POST /api/v1/incidents/i1/resolution" })
    }

    @Test
    fun helpers() {
        // ~111 m por milésima de grado de latitud
        assertEquals(111.2, metersBetween(19.0, -99.0, 19.001, -99.0), 0.5)
        assertEquals("18/11/2026 16:20", Labels.date("2026-11-18T16:20:00Z", withTime = true))
        assertEquals("—", Labels.date(null))
        assertNull(validateEmail("ana@correo.mx"))
        assertNotNull(validateEmail("ana@correo"))
    }
}
