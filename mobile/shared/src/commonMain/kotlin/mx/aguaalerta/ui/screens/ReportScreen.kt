package mx.aguaalerta.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import mx.aguaalerta.AppConfig
import mx.aguaalerta.AppState
import mx.aguaalerta.ScreenPadding
import mx.aguaalerta.ScreenTitle
import mx.aguaalerta.Tab
import mx.aguaalerta.data.ApiException
import mx.aguaalerta.data.PickedPhoto
import mx.aguaalerta.data.ReportCreate
import mx.aguaalerta.load
import mx.aguaalerta.platform.Device
import mx.aguaalerta.platform.LocationResult
import mx.aguaalerta.platform.rememberPhotoPicker
import mx.aguaalerta.ui.AguaCard
import mx.aguaalerta.ui.AguaField
import mx.aguaalerta.ui.AguaIcons
import mx.aguaalerta.ui.AnimatedNotice
import mx.aguaalerta.ui.CallButtons
import mx.aguaalerta.ui.ErrorBox
import mx.aguaalerta.ui.IconBadge
import mx.aguaalerta.ui.Labels
import mx.aguaalerta.ui.LoadingBox
import mx.aguaalerta.ui.Notice
import mx.aguaalerta.ui.PrimaryButton
import mx.aguaalerta.ui.QuietButton
import mx.aguaalerta.ui.SecondaryButton
import mx.aguaalerta.ui.SectionTitle
import mx.aguaalerta.ui.Tone
import mx.aguaalerta.ui.Water
import mx.aguaalerta.ui.pressScale
import org.jetbrains.compose.resources.decodeToImageBitmap
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

private data class FlowOption(val key: String, val title: String, val hint: String, val icon: ImageVector, val severity: String)

private val FLOWS = listOf(
    FlowOption("goteo", "Goteo", "Gotas constantes", AguaIcons.Drop, "low"),
    FlowOption("chorro", "Chorro", "Sale con fuerza", AguaIcons.Faucet, "high"),
    FlowOption("inundacion", "Inundación", "Calle anegada", AguaIcons.Waves, "critical"),
)

/** Distancia en metros entre dos puntos (haversine), igual que la API. */
fun metersBetween(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val r = 6_371_000.0
    val dLat = (lat2 - lat1) * PI / 180
    val dLon = (lon2 - lon1) * PI / 180
    val a = sin(dLat / 2) * sin(dLat / 2) + cos(lat1 * PI / 180) * cos(lat2 * PI / 180) * sin(dLon / 2) * sin(dLon / 2)
    return 2 * r * atan2(sqrt(a), sqrt(1 - a))
}

private fun fmt(v: Double) = ((v * 1_000_000).roundToInt() / 1_000_000.0).toString()

@Composable
fun ReportScreen(state: AppState, device: Device) {
    val active = state.load { state.api.activeReport() }
    var sent by remember { mutableStateOf<Pair<String, Int>?>(null) }

    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(ScreenPadding)) {
        val data = active.data
        val ticket = data?.active
        when {
            sent != null -> SentCard(sent!!.first, sent!!.second) {
                sent = null
                state.refresh()
                state.selectTab(Tab.Home)
            }
            data == null && active.error != null -> ErrorBox(active.error!!, active::reload)
            data == null -> LoadingBox()
            ticket != null -> {
                ScreenTitle("Ya tienes un reporte activo", "Podrás crear otro cuando se resuelva. Así el equipo atiende a todos más rápido.")
                ActiveTicketCard(ticket)
                Spacer(Modifier.height(20.dp))
                SectionTitle("¿Es una emergencia?")
                CallButtons(device::dial)
            }
            !state.emailVerified && !data.emailVerified -> {
                ScreenTitle("Verifica tu correo", "Para evitar reportes falsos, solo las cuentas verificadas pueden reportar y subir fotos.")
                VerifyEmailNotice(state)
            }
            else -> ReportForm(state, device) { folio, failed -> sent = folio to failed }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReportForm(state: AppState, device: Device, onSent: (String, Int) -> Unit) {
    val scope = rememberCoroutineScope()
    var flow by remember { mutableStateOf<String?>(null) }
    var category by remember { mutableStateOf("leak_public_road") }
    var severity by remember { mutableStateOf("medium") }
    var severityTouched by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var reference by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    // Ubicación: el GPS es obligatorio (la API solo acepta reportes a ≤250 m de donde estás)
    var device0 by remember { mutableStateOf<LocationResult.Ok?>(null) }
    var locating by remember { mutableStateOf(false) }
    var locError by remember { mutableStateOf<String?>(null) }
    var adjust by remember { mutableStateOf(false) }
    var latText by remember { mutableStateOf("") }
    var lonText by remember { mutableStateOf("") }
    val photos = remember { mutableStateListOf<PickedPhoto>() }
    var errors by remember { mutableStateOf(mapOf<String, String>()) }
    var submitError by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    val picker = rememberPhotoPicker(AppConfig.MAX_PHOTOS) { picked ->
        photos.addAll(picked.take(AppConfig.MAX_PHOTOS - photos.size))
    }

    fun locate() {
        locating = true
        locError = null
        scope.launch {
            when (val r = device.location()) {
                is LocationResult.Ok -> {
                    device0 = r
                    latText = fmt(r.latitude)
                    lonText = fmt(r.longitude)
                    errors = errors - "location"
                }
                LocationResult.Denied -> locError = "Permite el acceso a tu ubicación en los ajustes del teléfono para poder reportar."
                LocationResult.Disabled -> locError = "Activa la ubicación (GPS) del teléfono e inténtalo de nuevo."
                LocationResult.Unavailable -> locError = "No pudimos obtener tu ubicación. Sal a un lugar abierto e inténtalo de nuevo."
            }
            locating = false
        }
    }

    fun submit() {
        val here = device0
        val lat = latText.replace(",", ".").toDoubleOrNull()
        val lon = lonText.replace(",", ".").toDoubleOrNull()
        val finalTitle = title.trim().ifEmpty { Labels.of(Labels.category, category) + (flow?.let { " · " + Labels.of(Labels.flow, it).lowercase() } ?: "") }
        val e = buildMap {
            if (flow == null) put("flow", "Elige qué tan grande es la fuga.")
            if (here == null) put("location", "Toca \"Usar mi ubicación\" para continuar.")
            else if (lat == null || lon == null || lat !in 14.0..33.5 || lon !in -118.5..-86.5) put("location", "Las coordenadas deben estar dentro de México.")
            else if (metersBetween(here.latitude, here.longitude, lat, lon) > AppConfig.MAX_REPORT_DISTANCE_M) {
                put("location", "Ese punto está a más de 250 m de ti. Solo puedes reportar cerca de donde estás.")
            }
            if (finalTitle.length !in 5..120) put("title", "El título debe tener entre 5 y 120 caracteres.")
            if (description.trim().length < 10) put("description", "Cuéntanos un poco más (mínimo 10 caracteres).")
            val digits = phone.filter { it.isDigit() }
            if (digits.isNotEmpty() && digits.length != 10) put("phone", "El teléfono debe tener 10 dígitos.")
        }
        errors = e
        if (e.isNotEmpty() || here == null || lat == null || lon == null) {
            submitError = "Revisa los campos marcados."
            return
        }
        busy = true
        submitError = null
        scope.launch {
            try {
                val created = state.api.createReport(
                    ReportCreate(
                        title = finalTitle,
                        description = description.trim(),
                        category = category,
                        severity = severity,
                        latitude = lat,
                        longitude = lon,
                        deviceLatitude = here.latitude,
                        deviceLongitude = here.longitude,
                        leakFlow = flow,
                        addressReference = reference.trim().ifEmpty { null },
                        contactPhone = phone.filter { it.isDigit() }.ifEmpty { null },
                    ),
                )
                val failed = if (photos.isEmpty()) 0 else state.api.uploadPhotos(created.id, photos.toList())
                onSent(created.publicId, failed)
            } catch (ex: ApiException) {
                if (ex.status == 401) state.expire() else submitError = ex.message
            } catch (ex: Exception) {
                submitError = "Sin conexión. Revisa tu red e inténtalo de nuevo."
            } finally {
                busy = false
            }
        }
    }

    ScreenTitle("Reportar una fuga", "Tres pasos: qué tan grande es, dónde está y una foto si puedes.")

    // 1 · Tamaño de la fuga
    StepTitle(1, "¿Qué tan grande es?")
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        FLOWS.forEach { o ->
            FlowCard(o, selected = flow == o.key, modifier = Modifier.weight(1f)) {
                flow = o.key
                if (!severityTouched) severity = o.severity
                errors = errors - "flow"
            }
        }
    }
    errors["flow"]?.let { FieldError(it) }

    // 2 · Ubicación
    Spacer(Modifier.height(22.dp))
    StepTitle(2, "¿Dónde está?")
    val here = device0
    if (here == null) {
        PrimaryButton(if (locating) "Buscando tu ubicación…" else "Usar mi ubicación", ::locate, Modifier.fillMaxWidth(), loading = locating, icon = AguaIcons.Target)
        Text("Debes estar a menos de 250 m de la fuga.", fontSize = 12.sp, color = Water.Warm, modifier = Modifier.padding(top = 6.dp, start = 4.dp))
    } else {
        AguaCard(border = Water.Ok.copy(alpha = 0.4f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconBadge(AguaIcons.Pin, tint = Water.Ok, bg = Water.Ok.copy(alpha = 0.12f))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Ubicación lista", fontWeight = FontWeight.SemiBold, color = Water.Ink)
                    Text(
                        "$latText, $lonText" + (here.accuracyM?.let { " · ±${it.roundToInt()} m" } ?: ""),
                        fontSize = 13.sp, color = Water.Warm,
                    )
                }
            }
            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.End) {
                QuietButton("Ver en mapa", { device.navigateTo(latText.toDoubleOrNull() ?: here.latitude, lonText.toDoubleOrNull() ?: here.longitude) })
                QuietButton(if (adjust) "Listo" else "Ajustar", { adjust = !adjust })
                QuietButton("Actualizar", ::locate)
            }
            AnimatedVisibility(adjust, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
                Column {
                    Text("Corrige el punto si la fuga está unos metros más allá (máx. 250 m).", fontSize = 12.sp, color = Water.Warm)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        AguaField(latText, { latText = it }, "Latitud", Modifier.weight(1f), keyboard = KeyboardType.Decimal)
                        AguaField(lonText, { lonText = it }, "Longitud", Modifier.weight(1f), keyboard = KeyboardType.Decimal)
                    }
                }
            }
        }
    }
    AnimatedNotice(locError, Tone.Warning, Modifier.padding(top = 8.dp))
    errors["location"]?.let { FieldError(it) }
    Spacer(Modifier.height(12.dp))
    AguaField(reference, { reference = it }, "Referencia (opcional)", hint = "Ej. frente a la tienda, esquina con Juárez", maxLength = 500)

    // 3 · Detalles
    Spacer(Modifier.height(22.dp))
    StepTitle(3, "Cuéntanos qué pasa")
    Text("Tipo de problema", fontSize = 13.sp, color = Water.Warm, modifier = Modifier.padding(bottom = 6.dp))
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Labels.category.forEach { (k, v) ->
            FilterChip(
                selected = category == k,
                onClick = { category = k },
                label = { Text(v, fontSize = 13.sp) },
                shape = RoundedCornerShape(50),
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Water.Sky, selectedLabelColor = Water.CyanEdge, containerColor = Water.Card),
                border = FilterChipDefaults.filterChipBorder(true, category == k, borderColor = Water.Line, selectedBorderColor = Water.Cyan.copy(alpha = 0.5f)),
            )
        }
    }
    Spacer(Modifier.height(14.dp))
    Text("Gravedad", fontSize = 13.sp, color = Water.Warm, modifier = Modifier.padding(bottom = 6.dp))
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Water.Line).padding(3.dp)) {
        Labels.severity.forEach { (k, v) ->
            val selected = severity == k
            val bg by animateColorAsState(if (selected) Labels.bandColor(k) else Color.Transparent, label = "sev")
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(50)).background(bg).clickable { severity = k; severityTouched = true }.padding(vertical = 9.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(v, fontSize = 13.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, color = if (selected) Color.White else Water.Warm)
            }
        }
    }
    Spacer(Modifier.height(14.dp))
    AguaField(title, { title = it }, "Título (opcional)", error = errors["title"], hint = "Si lo dejas vacío usamos el tipo de problema.", maxLength = 120)
    Spacer(Modifier.height(12.dp))
    AguaField(description, { description = it }, "Descripción", error = errors["description"], singleLine = false, minLines = 3, maxLength = 2000, ime = ImeAction.Default)
    Spacer(Modifier.height(12.dp))
    AguaField(phone, { phone = it.filter { c -> c.isDigit() || c == ' ' } }, "Teléfono (opcional)", error = errors["phone"], hint = "Solo lo ve el personal, por si necesitan llamarte.", keyboard = KeyboardType.Phone, maxLength = 14)

    // Fotos
    Spacer(Modifier.height(22.dp))
    SectionTitle("Fotos (opcional, hasta ${AppConfig.MAX_PHOTOS})")
    PhotoStrip(photos, onRemove = { photos.remove(it) })
    if (photos.size < AppConfig.MAX_PHOTOS) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SecondaryButton("Cámara", picker::takePhoto, Modifier.weight(1f), AguaIcons.Camera)
            SecondaryButton("Galería", picker::pickFromGallery, Modifier.weight(1f), AguaIcons.Image)
        }
    }
    Text("Las fotos se borran automáticamente cuando el caso se cierra.", fontSize = 12.sp, color = Water.Warm, modifier = Modifier.padding(top = 6.dp, start = 4.dp))

    Spacer(Modifier.height(22.dp))
    AnimatedNotice(submitError, Tone.Error, Modifier.padding(bottom = 10.dp))
    PrimaryButton("Enviar reporte", ::submit, Modifier.fillMaxWidth(), loading = busy, icon = AguaIcons.Check)
    Spacer(Modifier.height(24.dp))
}

@Composable
private fun StepTitle(n: Int, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 10.dp)) {
        Box(Modifier.size(24.dp).clip(CircleShape).background(Water.Soot), contentAlignment = Alignment.Center) {
            Text("$n", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.width(10.dp))
        Text(text, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun FieldError(text: String) =
    Text(text, color = Water.Critical, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp, start = 4.dp))

@Composable
private fun FlowCard(o: FlowOption, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val source = remember { MutableInteractionSource() }
    val border by animateColorAsState(if (selected) Water.Cyan else Water.Line, label = "flow-border")
    val bg by animateColorAsState(if (selected) Water.Sky else Water.Card, label = "flow-bg")
    // El ícono "cobra vida" al elegirlo, como en la web
    val pulse = rememberInfiniteTransition(label = "flow")
    val bob by pulse.animateFloat(1f, 1.08f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "bob")
    Surface(
        modifier = modifier.pressScale(source),
        shape = RoundedCornerShape(18.dp),
        color = bg,
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, border),
    ) {
        Column(
            Modifier.clickable(interactionSource = source, indication = androidx.compose.material3.ripple(), onClick = onClick).padding(vertical = 14.dp, horizontal = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.size(44.dp).clip(CircleShape).background(if (selected) Water.Card else Water.Canvas), contentAlignment = Alignment.Center) {
                Icon(o.icon, null, Modifier.size(24.dp).scale(if (selected) bob else 1f), tint = if (selected) Water.Deep else Water.Warm)
            }
            Spacer(Modifier.height(8.dp))
            Text(o.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Water.Ink)
            Text(o.hint, fontSize = 11.sp, color = Water.Warm, textAlign = TextAlign.Center)
        }
    }
}

@Composable
fun PhotoStrip(photos: List<PickedPhoto>, onRemove: (PickedPhoto) -> Unit) {
    if (photos.isEmpty()) return
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(bottom = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        photos.forEach { p ->
            val bitmap: ImageBitmap? = remember(p) { runCatching { p.bytes.decodeToImageBitmap() }.getOrNull() }
            Box(Modifier.size(92.dp).clip(RoundedCornerShape(14.dp)).border(1.dp, Water.Line, RoundedCornerShape(14.dp))) {
                if (bitmap != null) Image(bitmap, "Foto", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                Box(
                    Modifier.align(Alignment.TopEnd).padding(4.dp).size(26.dp).clip(CircleShape).background(Water.Soot.copy(alpha = 0.7f)).clickable { onRemove(p) },
                    contentAlignment = Alignment.Center,
                ) { Icon(AguaIcons.Close, "Quitar foto", Modifier.size(14.dp), tint = Color.White) }
            }
        }
    }
}

@Composable
private fun SentCard(folio: String, failedPhotos: Int, onDone: () -> Unit) {
    val appear = rememberInfiniteTransition(label = "sent")
    val s by appear.animateFloat(0.96f, 1.04f, infiniteRepeatable(tween(1100), RepeatMode.Reverse), label = "s")
    Column(Modifier.fillMaxWidth().padding(top = 30.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(84.dp).scale(s).clip(CircleShape).background(Water.Ok.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) {
            Icon(AguaIcons.Check, null, Modifier.size(40.dp), tint = Water.Ok)
        }
        Spacer(Modifier.height(18.dp))
        Text("¡Reporte enviado!", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(6.dp))
        Text("Tu folio es $folio. Un operador lo validará y lo enviará a una cuadrilla.", style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
        if (failedPhotos > 0) {
            Spacer(Modifier.height(12.dp))
            Notice("$failedPhotos foto(s) no se pudieron subir. El reporte sí quedó registrado.", Tone.Warning)
        }
        Spacer(Modifier.height(22.dp))
        PrimaryButton("Seguir mi ticket", onDone, Modifier.fillMaxWidth())
    }
}
