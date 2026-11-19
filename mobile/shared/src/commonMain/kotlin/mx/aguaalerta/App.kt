package mx.aguaalerta

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import mx.aguaalerta.platform.Device
import mx.aguaalerta.platform.PlatformBackHandler
import mx.aguaalerta.platform.rememberDevice
import mx.aguaalerta.ui.AguaIcons
import mx.aguaalerta.ui.AguaTheme
import mx.aguaalerta.ui.LoadingBox
import mx.aguaalerta.ui.Notice
import mx.aguaalerta.ui.PrimaryButton
import mx.aguaalerta.ui.SecondaryButton
import mx.aguaalerta.ui.Tone
import mx.aguaalerta.ui.Water
import mx.aguaalerta.ui.screens.AuthFlow
import mx.aguaalerta.ui.screens.CrewOrderScreen
import mx.aguaalerta.ui.screens.CrewOrdersScreen
import mx.aguaalerta.ui.screens.HomeScreen
import mx.aguaalerta.ui.screens.MyReportsScreen
import mx.aguaalerta.ui.screens.ProfileScreen
import mx.aguaalerta.ui.screens.ReportScreen
import mx.aguaalerta.ui.screens.WebOnlyScreen

@Composable
fun AguaAlertaApp(provided: AppState? = null) {
    AguaTheme {
        val scope = rememberCoroutineScope()
        val state = provided ?: remember { AppState(scope) }
        val device = rememberDevice()
        LaunchedEffect(Unit) { state.boot() }
        PlatformBackHandler(state.canGoBack) { state.back() }

        Surface(Modifier.fillMaxSize(), color = Water.Canvas) {
            AnimatedContent(state.phase, transitionSpec = { fadeIn(tween(260)) togetherWith fadeOut(tween(180)) }, label = "phase") { phase ->
                when (phase) {
                    Phase.Booting -> Splash(state)
                    Phase.SignedOut -> AuthFlow(state)
                    Phase.SessionError -> SessionError(state)
                    Phase.SignedIn -> MainShell(state, device)
                }
            }
        }
    }
}

@Composable
fun Logo(size: Int = 22) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(AguaIcons.DropFilled, null, Modifier.size(size.dp), tint = Water.Deep)
        Spacer(Modifier.width(8.dp))
        Text("Agua Alerta", fontWeight = FontWeight.SemiBold, fontSize = (size * 0.8).sp, color = Water.Ink)
    }
}

@Composable
private fun Splash(state: AppState) {
    val waking by state.api.waking.collectAsState()
    Column(
        Modifier.fillMaxSize().background(Water.Canvas).windowInsetsPadding(WindowInsets.safeDrawing),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Logo(32)
        LoadingBox(if (waking) "Despertando el servidor… puede tardar hasta un minuto." else "Cargando tu cuenta…")
    }
}

@Composable
private fun SessionError(state: AppState) {
    Column(
        Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Logo(28)
        Spacer(Modifier.height(20.dp))
        Notice("Tu sesión está abierta, pero el servidor no respondió. Revisa tu conexión e inténtalo de nuevo.", Tone.Warning)
        Spacer(Modifier.height(16.dp))
        PrimaryButton("Reintentar", { state.boot() }, Modifier.fillMaxWidth())
        Spacer(Modifier.height(10.dp))
        SecondaryButton("Cerrar sesión", { state.logout() }, Modifier.fillMaxWidth())
    }
}

@Composable
private fun MainShell(state: AppState, device: Device) {
    val detail = state.details.lastOrNull()
    if (state.view == MobileView.WebOnly) {
        WebOnlyScreen(state, device)
        return
    }
    Scaffold(
        containerColor = Water.Canvas,
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        when (detail) {
                            is Detail.CrewOrder -> Text("Orden ${detail.publicId}", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                            null -> Logo()
                        }
                    },
                    navigationIcon = {
                        if (detail != null) {
                            IconButton(onClick = { state.back() }) { Icon(AguaIcons.Back, "Regresar") }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Water.Canvas, scrolledContainerColor = Water.Canvas),
                )
                HorizontalDivider(color = Water.Line)
            }
        },
        bottomBar = {
            if (state.tabs.size > 1) {
                Column {
                    HorizontalDivider(color = Water.Line)
                    NavigationBar(containerColor = Water.Card, tonalElevation = 0.dp) {
                        state.tabs.forEach { t ->
                            NavigationBarItem(
                                selected = state.tab == t && detail == null,
                                onClick = { state.selectTab(t) },
                                icon = { Icon(t.icon, null, Modifier.size(24.dp)) },
                                label = { Text(t.label, fontSize = 12.sp) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Water.CyanEdge,
                                    selectedTextColor = Water.CyanEdge,
                                    indicatorColor = Water.Sky,
                                    unselectedIconColor = Water.Warm,
                                    unselectedTextColor = Water.Warm,
                                ),
                            )
                        }
                    }
                }
            }
        },
    ) { padding ->
        val key: Any = detail ?: state.tab
        AnimatedContent(
            key,
            modifier = Modifier.padding(padding).fillMaxSize(),
            transitionSpec = {
                if (targetState is Detail) {
                    (slideInHorizontally(tween(280)) { it / 3 } + fadeIn(tween(220))) togetherWith fadeOut(tween(160))
                } else {
                    fadeIn(tween(220)) togetherWith fadeOut(tween(140))
                }
            },
            label = "screen",
        ) { target ->
            Box(Modifier.fillMaxSize()) {
                when (target) {
                    is Detail.CrewOrder -> CrewOrderScreen(state, device, target.incidentId)
                    Tab.Home -> HomeScreen(state, device)
                    Tab.Report -> ReportScreen(state, device)
                    Tab.Reports -> MyReportsScreen(state)
                    Tab.Orders -> CrewOrdersScreen(state)
                    Tab.Profile -> ProfileScreen(state, device)
                    else -> Unit
                }
            }
        }
    }
}

/** Relleno estándar de las pantallas con desplazamiento. */
val ScreenPadding = PaddingValues(horizontal = 18.dp, vertical = 18.dp)

@Composable
fun ScreenTitle(title: String, lead: String? = null) {
    Column(Modifier.padding(bottom = 16.dp)) {
        Text(title, style = MaterialTheme.typography.headlineMedium)
        if (lead != null) {
            Spacer(Modifier.height(6.dp))
            Text(lead, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
