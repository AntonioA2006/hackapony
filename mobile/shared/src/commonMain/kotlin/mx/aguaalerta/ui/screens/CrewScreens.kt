package mx.aguaalerta.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch
import mx.aguaalerta.AppState
import mx.aguaalerta.Detail
import mx.aguaalerta.ScreenPadding
import mx.aguaalerta.ScreenTitle
import mx.aguaalerta.data.ApiException
import mx.aguaalerta.data.DetailReport
import mx.aguaalerta.data.Incident
import mx.aguaalerta.data.PickedPhoto
import mx.aguaalerta.isSupervisor
import mx.aguaalerta.load
import mx.aguaalerta.platform.Device
import mx.aguaalerta.platform.rememberPhotoPicker
import mx.aguaalerta.ui.AguaCard
import mx.aguaalerta.ui.AguaField
import mx.aguaalerta.ui.AguaIcons
import mx.aguaalerta.ui.AnimatedNotice
import mx.aguaalerta.ui.EmptyState
import mx.aguaalerta.ui.ErrorBox
import mx.aguaalerta.ui.IconBadge
import mx.aguaalerta.ui.Labels
import mx.aguaalerta.ui.LoadingBox
import mx.aguaalerta.ui.Notice
import mx.aguaalerta.ui.PrimaryButton
import mx.aguaalerta.ui.SecondaryButton
import mx.aguaalerta.ui.SectionTitle
import mx.aguaalerta.ui.StatusChip
import mx.aguaalerta.ui.Tone
import mx.aguaalerta.ui.Water
import org.jetbrains.compose.resources.decodeToImageBitmap

@Composable
fun CrewOrdersScreen(state: AppState) {
    val sup = isSupervisor(state.user?.role)
    val orders = state.load(sup) { state.api.crewOrders(sup) }
    PullToRefreshBox(isRefreshing = orders.loading && orders.data != null, onRefresh = { state.refresh() }, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(ScreenPadding), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ScreenTitle(
                if (sup) "Órdenes en campo" else "Mis órdenes",
                "Toca una orden para ver cómo llegar, llamar a quien reportó y cerrarla con foto.",
            )
            val data = orders.data
            when {
                data == null && orders.error != null -> ErrorBox(orders.error!!, orders::reload)
                data == null -> LoadingBox()
                data.items.isEmpty() -> EmptyState(AguaIcons.Helmet, "Sin órdenes por ahora", "Cuando el operador te envíe una incidencia aparecerá aquí. Desliza hacia abajo para actualizar.")
                else -> data.items.forEach { inc ->
                    OrderRow(inc, showCrew = sup) { state.open(Detail.CrewOrder(inc.id, inc.publicId)) }
                }
            }
        }
    }
}

@Composable
private fun OrderRow(inc: Incident, showCrew: Boolean, onClick: () -> Unit) {
    AguaCard(onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(10.dp).clip(RoundedCornerShape(50)).background(Labels.bandColor(inc.priorityBand)))
            Spacer(Modifier.width(8.dp))
            Text(Labels.of(Labels.category, inc.primaryCategory), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f), maxLines = 1)
            Icon(AguaIcons.Chevron, null, Modifier.size(18.dp), tint = Water.Ash)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            listOfNotNull(inc.publicId, inc.municipalityName ?: inc.stateName, inc.leakFlow?.let { Labels.of(Labels.flow, it) }).joinToString(" · "),
            fontSize = 13.sp, color = Water.Warm,
        )
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            StatusChip("Prioridad ${Labels.of(Labels.severity, inc.priorityBand).lowercase()}", Labels.bandColor(inc.priorityBand))
            StatusChip(Labels.of(Labels.incidentStatus, inc.status), Labels.statusColor(inc.status))
        }
        if (showCrew) {
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(AguaIcons.Helmet, null, Modifier.size(15.dp), tint = Water.Warm)
                Spacer(Modifier.width(5.dp))
                Text(inc.assignedTo?.displayName ?: "Sin cuadrilla", fontSize = 12.sp, color = Water.Warm)
            }
        }
    }
}

@Composable
fun CrewOrderScreen(state: AppState, device: Device, incidentId: String) {
    val detail = state.load(incidentId) { state.api.incidentDetail(incidentId) }
    var viewer by remember { mutableStateOf<ImageBitmap?>(null) }

    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(ScreenPadding), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        val d = detail.data
        when {
            d == null && detail.error != null -> ErrorBox(detail.error!!, detail::reload)
            d == null -> LoadingBox()
            else -> {
                val inc = d.incident
                AguaCard {
                    Text(Labels.of(Labels.category, inc.primaryCategory), style = MaterialTheme.typography.titleLarge)
                    Text(
                        listOfNotNull(inc.municipalityName, inc.stateName).joinToString(", ").ifEmpty { "Ubicación por coordenadas" },
                        fontSize = 14.sp, color = Water.Warm,
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        StatusChip("Prioridad ${Labels.of(Labels.severity, inc.priorityBand).lowercase()}", Labels.bandColor(inc.priorityBand))
                        StatusChip(Labels.of(Labels.incidentStatus, inc.status), Labels.statusColor(inc.status))
                    }
                    Spacer(Modifier.height(14.dp))
                    PrimaryButton("Cómo llegar", { device.navigateTo(inc.latitude, inc.longitude) }, Modifier.fillMaxWidth(), icon = AguaIcons.Navigate)
                    val phone = d.reports.firstNotNullOfOrNull { it.contactPhone }
                    if (phone != null) {
                        Spacer(Modifier.height(10.dp))
                        SecondaryButton("Llamar a quien reportó", { device.dial("+52$phone") }, Modifier.fillMaxWidth(), AguaIcons.Phone)
                    }
                }

                SectionTitle("Lo que reportaron (${d.reports.size})")
                if (d.photosPurgedAt != null) Notice("Las fotos de este caso ya se borraron porque se cerró.", Tone.Info)
                d.reports.forEach { r -> ReportCard(state, r) { viewer = it } }

                when (inc.status) {
                    "in_progress" -> CloseOrderForm(state, incidentId) {
                        detail.reload()
                        state.refresh()
                    }
                    "pending_verification" -> Notice("Enviaste el cierre. El operador lo está verificando; quien reportó ya lo ve resuelto.", Tone.Success)
                    "resolved" -> Notice("Caso cerrado. ¡Buen trabajo!", Tone.Success)
                    else -> Notice("Esta orden no está en atención; no se puede cerrar desde aquí.", Tone.Info)
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }

    viewer?.let { img ->
        Dialog(onDismissRequest = { viewer = null }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.92f)).clickable { viewer = null }, contentAlignment = Alignment.Center) {
                Image(img, "Foto del reporte", Modifier.fillMaxWidth(), contentScale = ContentScale.Fit)
                Box(Modifier.align(Alignment.TopEnd).padding(20.dp).size(40.dp).clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Icon(AguaIcons.Close, "Cerrar", tint = Color.White)
                }
            }
        }
    }
}

@Composable
private fun ReportCard(state: AppState, r: DetailReport, onOpen: (ImageBitmap) -> Unit) {
    AguaCard {
        Text(r.title, style = MaterialTheme.typography.titleMedium)
        Text(
            listOfNotNull(r.publicId, Labels.date(r.createdAt, withTime = true), r.leakFlow?.let { Labels.of(Labels.flow, it) }).joinToString(" · "),
            fontSize = 12.sp, color = Water.Warm,
        )
        Spacer(Modifier.height(8.dp))
        Text(r.description, fontSize = 14.sp, color = Water.Ink)
        r.addressReference?.let {
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.Top) {
                Icon(AguaIcons.Pin, null, Modifier.size(16.dp), tint = Water.Warm)
                Spacer(Modifier.width(6.dp))
                Text(it, fontSize = 13.sp, color = Water.Warm)
            }
        }
        if (r.reporter.isNotBlank()) Text("Reportó: ${r.reporter}", fontSize = 12.sp, color = Water.Ash, modifier = Modifier.padding(top = 6.dp))
        if (r.photos.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                r.photos.forEach { p -> RemotePhoto(state, r.id, p.id, onOpen) }
            }
        }
    }
}

/** Las fotos son privadas: se descargan con el token y se muestran en miniatura. */
@Composable
private fun RemotePhoto(state: AppState, reportId: String, photoId: String, onOpen: (ImageBitmap) -> Unit) {
    var bitmap by remember(photoId) { mutableStateOf<ImageBitmap?>(null) }
    var failed by remember(photoId) { mutableStateOf(false) }
    LaunchedEffect(photoId) {
        runCatching { state.api.reportPhoto(reportId, photoId).decodeToImageBitmap() }
            .onSuccess { bitmap = it }.onFailure { failed = true }
    }
    Box(
        Modifier.size(96.dp).clip(RoundedCornerShape(14.dp)).background(Water.Canvas).clickable(enabled = bitmap != null) { bitmap?.let(onOpen) },
        contentAlignment = Alignment.Center,
    ) {
        val b = bitmap
        when {
            b != null -> Image(b, "Foto", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            failed -> Icon(AguaIcons.Image, "Foto no disponible", tint = Water.Ash)
            else -> CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Water.Cyan)
        }
    }
}

@Composable
private fun CloseOrderForm(state: AppState, incidentId: String, onDone: () -> Unit) {
    val scope = rememberCoroutineScope()
    var note by remember { mutableStateOf("") }
    var minutes by remember { mutableStateOf("") }
    var photo by remember { mutableStateOf<PickedPhoto?>(null) }
    var errors by remember { mutableStateOf(mapOf<String, String>()) }
    var message by remember { mutableStateOf<Pair<String, Tone>?>(null) }
    var busy by remember { mutableStateOf(false) }
    val picker = rememberPhotoPicker(1) { photo = it.firstOrNull() }

    AguaCard(border = Water.Ok.copy(alpha = 0.35f)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(AguaIcons.Check, tint = Water.Ok, bg = Water.Ok.copy(alpha = 0.12f), size = 38)
            Spacer(Modifier.width(10.dp))
            Text("Cerrar la orden", style = MaterialTheme.typography.titleMedium)
        }
        Text("Al enviarlo, quien reportó lo verá resuelto y el operador confirmará el cierre. Las fotos del caso se borran al confirmarse.", fontSize = 13.sp, color = Water.Warm, modifier = Modifier.padding(top = 6.dp))
        Spacer(Modifier.height(12.dp))
        AguaField(note, { note = it }, "¿Qué se hizo?", error = errors["note"], singleLine = false, minLines = 3, maxLength = 2000, ime = ImeAction.Default)
        Spacer(Modifier.height(10.dp))
        AguaField(minutes, { minutes = it.filter(Char::isDigit) }, "Minutos de trabajo", error = errors["minutes"], keyboard = KeyboardType.Number, maxLength = 5)
        Spacer(Modifier.height(12.dp))
        Text("Foto de la reparación (obligatoria)", fontSize = 13.sp, color = Water.Warm)
        Spacer(Modifier.height(8.dp))
        PhotoStrip(listOfNotNull(photo)) { photo = null }
        if (photo == null) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SecondaryButton("Cámara", picker::takePhoto, Modifier.weight(1f), AguaIcons.Camera)
                SecondaryButton("Galería", picker::pickFromGallery, Modifier.weight(1f), AguaIcons.Image)
            }
        }
        errors["photo"]?.let { Text(it, color = Water.Critical, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp)) }
        AnimatedNotice(message?.first, message?.second ?: Tone.Info, Modifier.padding(top = 10.dp))
        Spacer(Modifier.height(14.dp))
        PrimaryButton("Enviar cierre", {
            val m = minutes.toIntOrNull()
            errors = buildMap {
                if (note.trim().length < 10) put("note", "Explica el trabajo (mínimo 10 caracteres).")
                if (m == null || m !in 1..10080) put("minutes", "Entre 1 minuto y 7 días (10080).")
                if (photo == null) put("photo", "Toma una foto de la reparación.")
            }
            val p = photo
            if (errors.isEmpty() && m != null && p != null) {
                busy = true
                message = null
                scope.launch {
                    try {
                        state.api.submitResolution(incidentId, note.trim(), m, p)
                        message = "Enviado al operador. Quien reportó ya lo ve resuelto." to Tone.Success
                        onDone()
                    } catch (e: ApiException) {
                        if (e.status == 401) state.expire() else message = (e.message ?: "No se pudo enviar.") to Tone.Error
                    } catch (e: Exception) {
                        message = "Sin conexión. Revisa tu red e inténtalo de nuevo." to Tone.Error
                    } finally {
                        busy = false
                    }
                }
            }
        }, Modifier.fillMaxWidth(), loading = busy, color = Water.Ok, icon = AguaIcons.Check)
    }
}
