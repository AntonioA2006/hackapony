package mx.aguaalerta.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import mx.aguaalerta.AppState
import mx.aguaalerta.ScreenPadding
import mx.aguaalerta.ScreenTitle
import mx.aguaalerta.Tab
import mx.aguaalerta.data.Report
import mx.aguaalerta.load
import mx.aguaalerta.ui.AguaCard
import mx.aguaalerta.ui.AguaIcons
import mx.aguaalerta.ui.EmptyState
import mx.aguaalerta.ui.ErrorBox
import mx.aguaalerta.ui.Labels
import mx.aguaalerta.ui.LoadingBox
import mx.aguaalerta.ui.PrimaryButton
import mx.aguaalerta.ui.StatusChip
import mx.aguaalerta.ui.Water

@Composable
fun MyReportsScreen(state: AppState) {
    val reports = state.load { state.api.myReports() }
    // Calificación local por incidencia: null = sin calificar, texto = resultado
    val rated = remember { mutableStateMapOf<String, String>() }
    val scope = rememberCoroutineScope()

    PullToRefreshBox(isRefreshing = reports.loading && reports.data != null, onRefresh = { state.refresh() }, modifier = Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = ScreenPadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { ScreenTitle("Mis reportes", "Desliza hacia abajo para actualizar.") }
            val data = reports.data
            when {
                data == null && reports.error != null -> item { ErrorBox(reports.error!!, reports::reload) }
                data == null -> item { LoadingBox() }
                data.items.isEmpty() -> item {
                    EmptyState(AguaIcons.Drop, "Aún no has reportado", "Cuando veas una fuga, repórtala y aquí podrás seguirla.") {
                        PrimaryButton("Reportar una fuga", { state.selectTab(Tab.Report) })
                    }
                }
                else -> items(data.items, key = { it.id }) { r ->
                    ReportRow(r, rated[r.incidentId]) { score ->
                        val id = r.incidentId ?: return@ReportRow
                        rated[id] = "Enviando…"
                        scope.launch {
                            rated[id] = runCatching { state.api.rate(id, score) }
                                .fold({ "¡Gracias por calificar!" }, { it.message ?: "No se pudo enviar." })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReportRow(r: Report, ratedMessage: String?, onRate: (Int) -> Unit) {
    AguaCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(r.title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f), maxLines = 2)
            StatusChip(Labels.of(Labels.reportStatus, r.status), Labels.statusColor(r.status))
        }
        Spacer(Modifier.height(4.dp))
        Text(
            listOfNotNull("Folio ${r.publicId}", Labels.date(r.createdAt), r.leakFlow?.let { Labels.of(Labels.flow, it) }).joinToString(" · "),
            fontSize = 13.sp, color = Water.Warm,
        )
        Text(Labels.of(Labels.category, r.category), fontSize = 13.sp, color = Water.Warm)
        val closed = r.status == "resolved" || r.incidentStatus == "resolved" || r.incidentStatus == "pending_verification"
        if (closed && r.incidentId != null) {
            Spacer(Modifier.height(12.dp))
            if (ratedMessage != null) {
                Text(ratedMessage, fontSize = 13.sp, color = Water.Ok, fontWeight = FontWeight.Medium)
            } else {
                Text("¿Cómo te atendieron?", fontSize = 13.sp, color = Water.Ink, fontWeight = FontWeight.Medium)
                Row(Modifier.padding(top = 4.dp)) {
                    (1..5).forEach { n ->
                        Icon(
                            AguaIcons.Star, "$n estrellas",
                            Modifier.size(36.dp).padding(4.dp).clickable { onRate(n) },
                            tint = Water.Medium,
                        )
                    }
                }
            }
        }
    }
}
