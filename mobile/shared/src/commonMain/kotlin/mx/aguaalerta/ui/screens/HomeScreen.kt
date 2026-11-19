package mx.aguaalerta.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import mx.aguaalerta.AppState
import mx.aguaalerta.ScreenPadding
import mx.aguaalerta.Tab
import mx.aguaalerta.data.ActiveTicket
import mx.aguaalerta.load
import mx.aguaalerta.platform.Device
import mx.aguaalerta.ui.AguaCard
import mx.aguaalerta.ui.AguaIcons
import mx.aguaalerta.ui.CallButtons
import mx.aguaalerta.ui.IconBadge
import mx.aguaalerta.ui.Labels
import mx.aguaalerta.ui.Notice
import mx.aguaalerta.ui.PrimaryButton
import mx.aguaalerta.ui.QuietButton
import mx.aguaalerta.ui.SectionTitle
import mx.aguaalerta.ui.StatTile
import mx.aguaalerta.ui.StatusChip
import mx.aguaalerta.ui.TicketTracker
import mx.aguaalerta.ui.Tone
import mx.aguaalerta.ui.Water

@Composable
fun HomeScreen(state: AppState, device: Device) {
    val active = state.load { state.api.activeReport() }
    val stats = state.load { state.api.citizenStats() }
    val notifications = state.load { state.api.notifications() }
    val scope = rememberCoroutineScope()
    val first = state.user?.displayName?.trim()?.split(" ")?.firstOrNull().orEmpty()

    PullToRefreshBox(isRefreshing = active.loading && active.data != null, onRefresh = { state.refresh() }, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(ScreenPadding), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Column {
                Text("Hola${if (first.isNotEmpty()) ", $first" else ""}", style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(4.dp))
                Text("Gracias por cuidar el agua de tu comunidad.", style = MaterialTheme.typography.bodyMedium)
            }

            if (!state.emailVerified) VerifyEmailNotice(state)

            val ticket = active.data?.active
            when {
                ticket != null -> ActiveTicketCard(ticket)
                active.data != null || active.error != null -> ReportCta { state.selectTab(Tab.Report) }
            }
            active.error?.let { Notice(it, Tone.Error) { QuietButton("Reintentar", active::reload) } }

            stats.data?.let { s ->
                Column {
                    SectionTitle("Tus reportes")
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatTile("Enviados", s.totalReports, Modifier.weight(1f), Water.Cyan)
                        StatTile("En atención", s.inProgress + s.pending, Modifier.weight(1f), Water.Medium)
                        StatTile("Resueltos", s.resolved, Modifier.weight(1f), Water.Ok)
                    }
                }
            }

            val items = notifications.data?.items.orEmpty()
            if (items.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionTitle("Avisos")
                    items.forEach { n ->
                        AguaCard {
                            Row(verticalAlignment = Alignment.Top) {
                                IconBadge(AguaIcons.Bell, size = 36)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(n.title, fontWeight = FontWeight.SemiBold, color = Water.Ink, fontSize = 15.sp)
                                    Text(n.body, fontSize = 14.sp, color = Water.Warm)
                                }
                            }
                            QuietButton("Marcar como leído", {
                                scope.launch {
                                    runCatching { state.api.markRead(n.id) }
                                    notifications.reload()
                                }
                            }, Modifier.align(Alignment.End))
                        }
                    }
                }
            }

            Column {
                SectionTitle("¿Necesitas ayuda ya?")
                CallButtons(device::dial)
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun VerifyEmailNotice(state: AppState) {
    val scope = rememberCoroutineScope()
    var msg by remember { mutableStateOf<Pair<String, Tone>?>(null) }
    Notice(
        msg?.first ?: "Verifica tu correo con el enlace que te enviamos (revisa spam). Sin verificarlo no puedes reportar ni subir fotos.",
        msg?.second ?: Tone.Warning,
    ) {
        QuietButton("Reenviar", {
            scope.launch {
                val err = state.resendVerification()
                msg = (err ?: "Te enviamos un nuevo enlace.") to (if (err == null) Tone.Info else Tone.Error)
            }
        })
        QuietButton("Ya lo verifiqué", {
            scope.launch {
                val ok = state.checkEmailVerified()
                if (!ok) msg = "Aún no aparece verificado. Abre el enlace del correo e inténtalo de nuevo." to Tone.Warning
            }
        })
    }
}

@Composable
fun ActiveTicketCard(ticket: ActiveTicket) {
    AguaCard(border = Water.Cyan.copy(alpha = 0.35f)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("TU REPORTE ACTIVO", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp, color = Water.CyanEdge)
                Spacer(Modifier.height(2.dp))
                Text(ticket.title, style = MaterialTheme.typography.titleMedium, maxLines = 2)
                Text("Folio ${ticket.publicId} · ${Labels.date(ticket.createdAt)}", fontSize = 13.sp, color = Water.Warm)
            }
            StatusChip(Labels.of(Labels.reportStatus, ticket.status), Labels.statusColor(ticket.status))
        }
        Spacer(Modifier.height(16.dp))
        TicketTracker(ticket.stage, ticket.crewName)
    }
}

@Composable
private fun ReportCta(onClick: () -> Unit) {
    Surface(shape = RoundedCornerShape(24.dp), color = Color.Transparent, modifier = Modifier.fillMaxWidth()) {
        Column(
            Modifier.background(Brush.linearGradient(listOf(Water.Cyan, Water.Deep, Water.Tide))).padding(22.dp),
        ) {
            Icon(AguaIcons.Drop, null, Modifier.size(34.dp), tint = Color.White)
            Spacer(Modifier.height(12.dp))
            Text("¿Viste una fuga?", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(4.dp))
            Text("Repórtala en menos de un minuto. Usamos tu ubicación para que la cuadrilla llegue directo.", color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
            Spacer(Modifier.height(16.dp))
            PrimaryButton("Reportar ahora", onClick, Modifier.fillMaxWidth(), icon = AguaIcons.Plus, color = Water.Soot)
        }
    }
}
