package mx.aguaalerta.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import mx.aguaalerta.AppConfig
import mx.aguaalerta.AppState
import mx.aguaalerta.MobileView
import mx.aguaalerta.ScreenPadding
import mx.aguaalerta.isSupervisor
import mx.aguaalerta.platform.Device
import mx.aguaalerta.ui.AguaCard
import mx.aguaalerta.ui.AguaField
import mx.aguaalerta.ui.AguaIcons
import mx.aguaalerta.ui.AnimatedNotice
import mx.aguaalerta.ui.Labels
import mx.aguaalerta.ui.PrimaryButton
import mx.aguaalerta.ui.SecondaryButton
import mx.aguaalerta.ui.SectionTitle
import mx.aguaalerta.ui.StatusChip
import mx.aguaalerta.ui.Tone
import mx.aguaalerta.ui.Water

@Composable
fun ProfileScreen(state: AppState, device: Device) {
    val user = state.user ?: return
    val scope = rememberCoroutineScope()
    var name by remember(user.displayName) { mutableStateOf(user.displayName) }
    var msg by remember { mutableStateOf<Pair<String, Tone>?>(null) }
    var busy by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(ScreenPadding), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AguaCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(54.dp).clip(CircleShape).background(Water.Sky), contentAlignment = Alignment.Center) {
                    Text(user.displayName.take(1).uppercase(), fontSize = 22.sp, fontWeight = FontWeight.SemiBold, color = Water.CyanEdge)
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(user.displayName, style = MaterialTheme.typography.titleMedium)
                    Text(user.email, fontSize = 13.sp, color = Water.Warm)
                    Spacer(Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        StatusChip(Labels.of(Labels.role, user.role), Water.Cyan)
                        if (state.emailVerified) StatusChip("Correo verificado", Water.Ok) else StatusChip("Sin verificar", Water.Medium)
                    }
                }
            }
        }

        if (!state.emailVerified) VerifyEmailNotice(state)

        if (isSupervisor(user.role)) {
            Column {
                SectionTitle("Ver la app como")
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Water.Line).padding(4.dp)) {
                    listOf("ciudadano" to "Ciudadano", "cuadrilla" to "Cuadrilla").forEach { (key, label) ->
                        val selected = (state.view == MobileView.Crew) == (key == "cuadrilla")
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(50)).background(if (selected) Water.Card else Color.Transparent)
                                .clickable { state.chooseView(key) }.padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text(label, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, fontSize = 14.sp) }
                    }
                }
                Text("La vista de operador, el panel y la gestión del equipo están en la web.", fontSize = 12.sp, color = Water.Warm, modifier = Modifier.padding(top = 6.dp, start = 4.dp))
            }
        }

        Column {
            SectionTitle("Tus datos")
            AguaField(name, { name = it }, "Nombre", maxLength = 80)
            AnimatedNotice(msg?.first, msg?.second ?: Tone.Info, Modifier.padding(top = 8.dp))
            Spacer(Modifier.height(10.dp))
            SecondaryButton("Guardar nombre", {
                if (name.trim().length < 2) {
                    msg = "Escribe tu nombre (mínimo 2 letras)." to Tone.Error
                } else {
                    busy = true
                    scope.launch {
                        val err = state.rename(name)
                        msg = (err ?: "Guardado.") to (if (err == null) Tone.Success else Tone.Error)
                        busy = false
                    }
                }
            }, Modifier.fillMaxWidth(), enabled = !busy && name.trim() != user.displayName)
        }

        Column {
            SectionTitle("En la web")
            AguaCard(padding = androidx.compose.foundation.layout.PaddingValues(0.dp)) {
                LinkRow(AguaIcons.Pin, "Mapa de incidencias") { device.openUrl("${AppConfig.WEB_URL}/mapa") }
                HorizontalDivider(color = Water.Line)
                LinkRow(AguaIcons.Globe, "Abrir Agua Alerta en la web") { device.openUrl(AppConfig.WEB_URL) }
                HorizontalDivider(color = Water.Line)
                LinkRow(AguaIcons.Shield, "Aviso legal y privacidad") { device.openUrl("${AppConfig.WEB_URL}/aviso-legal") }
            }
        }

        PrimaryButton("Cerrar sesión", { state.logout() }, Modifier.fillMaxWidth(), icon = AguaIcons.Logout, color = Water.Soot)
        Text("Agua Alerta · versión móvil", fontSize = 12.sp, color = Water.Ash, modifier = Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun LinkRow(icon: ImageVector, text: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 18.dp, vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, Modifier.size(22.dp), tint = Water.Deep)
        Spacer(Modifier.width(14.dp))
        Text(text, fontSize = 15.sp, color = Water.Ink, modifier = Modifier.weight(1f))
        Icon(AguaIcons.Chevron, null, Modifier.size(18.dp), tint = Water.Ash)
    }
}
