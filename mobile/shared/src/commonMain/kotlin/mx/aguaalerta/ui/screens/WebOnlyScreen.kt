package mx.aguaalerta.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import mx.aguaalerta.AppConfig
import mx.aguaalerta.AppState
import mx.aguaalerta.Logo
import mx.aguaalerta.platform.Device
import mx.aguaalerta.ui.AguaIcons
import mx.aguaalerta.ui.IconBadge
import mx.aguaalerta.ui.PrimaryButton
import mx.aguaalerta.ui.SecondaryButton

/** Operador: validar, despachar, ver gráficas y gestionar al equipo se hace en pantalla grande. */
@Composable
fun WebOnlyScreen(state: AppState, device: Device) {
    Column(
        Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Logo(26)
        Spacer(Modifier.height(28.dp))
        IconBadge(AguaIcons.Globe, size = 72)
        Spacer(Modifier.height(18.dp))
        Text("El panel de operación está en la web", style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(
            "Validar incidencias, enviarlas a las cuadrillas, ver las gráficas y gestionar al equipo se hace desde una computadora para tener toda la información a la vista.",
            style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        PrimaryButton("Abrir el panel en la web", { device.openUrl("${AppConfig.WEB_URL}/panel") }, Modifier.fillMaxWidth(), icon = AguaIcons.Globe)
        Spacer(Modifier.height(10.dp))
        SecondaryButton("Cerrar sesión", { state.logout() }, Modifier.fillMaxWidth(), AguaIcons.Logout)
    }
}
