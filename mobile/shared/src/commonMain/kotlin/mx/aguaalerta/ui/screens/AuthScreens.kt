package mx.aguaalerta.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import mx.aguaalerta.AppConfig
import mx.aguaalerta.AppState
import mx.aguaalerta.AuthScreen
import mx.aguaalerta.Logo
import mx.aguaalerta.ui.AguaCard
import mx.aguaalerta.ui.AguaField
import mx.aguaalerta.ui.AguaIcons
import mx.aguaalerta.ui.AnimatedNotice
import mx.aguaalerta.ui.IconBadge
import mx.aguaalerta.ui.PrimaryButton
import mx.aguaalerta.ui.QuietButton
import mx.aguaalerta.ui.Tone
import mx.aguaalerta.ui.Water

private val EMAIL = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

fun validateEmail(v: String) = when {
    v.isBlank() -> "Escribe tu correo."
    !EMAIL.matches(v.trim()) -> "El correo no es válido."
    else -> null
}

@Composable
fun AuthFlow(state: AppState) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Water.Sky, Water.Canvas, Water.Canvas)))
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 22.dp, vertical = 20.dp),
    ) {
        Logo(26)
        Spacer(Modifier.height(28.dp))
        AnimatedContent(
            state.authScreen,
            transitionSpec = { (fadeIn(tween(240)) + slideInVertically(tween(240)) { it / 12 }) togetherWith fadeOut(tween(140)) },
            label = "auth",
        ) { screen ->
            when (screen) {
                AuthScreen.Login -> LoginForm(state)
                AuthScreen.Register -> RegisterForm(state)
                AuthScreen.Forgot -> ForgotForm(state)
            }
        }
    }
}

@Composable
private fun LoginForm(state: AppState) {
    val scope = rememberCoroutineScope()
    var crew by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errors by remember { mutableStateOf(mapOf<String, String>()) }
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun submit() {
        val e = buildMap {
            validateEmail(email)?.let { put("email", it) }
            if (password.isEmpty()) put("password", "Escribe tu contraseña.")
        }
        errors = e
        if (e.isNotEmpty()) return
        busy = true
        message = null
        scope.launch {
            message = state.login(email, password, crew)
            busy = false
        }
    }

    Column {
        Text(if (crew) "Acceso de cuadrilla" else "Qué bueno verte", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(6.dp))
        Text(
            if (crew) "Consulta tus órdenes, llama a quien reportó y cierra la atención con foto."
            else "Reporta fugas en segundos y sigue tu ticket hasta que se resuelva.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(18.dp))
        // Selector de tipo de acceso: ciudadanía o cuadrilla (el operador entra desde la web)
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(50)).background(Water.Line).padding(4.dp)) {
            listOf(false to "Ciudadano", true to "Cuadrilla").forEach { (isCrew, label) ->
                val selected = crew == isCrew
                Box(
                    Modifier.weight(1f).clip(RoundedCornerShape(50))
                        .background(if (selected) Water.Card else androidx.compose.ui.graphics.Color.Transparent)
                        .clickable { crew = isCrew; message = null }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(label, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, color = if (selected) Water.Ink else Water.Warm, fontSize = 14.sp)
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        AguaField(email, { email = it }, "Correo", error = errors["email"], keyboard = KeyboardType.Email)
        Spacer(Modifier.height(12.dp))
        AguaField(password, { password = it }, "Contraseña", error = errors["password"], password = true, ime = ImeAction.Done)
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            QuietButton("¿Olvidaste tu contraseña?", { state.authScreen = AuthScreen.Forgot })
        }
        AnimatedNotice(message, Tone.Error)
        Spacer(Modifier.height(12.dp))
        PrimaryButton("Entrar", ::submit, Modifier.fillMaxWidth(), loading = busy)
        Spacer(Modifier.height(8.dp))
        if (!crew) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Text("¿No tienes cuenta?", color = Water.Warm, fontSize = 14.sp)
                QuietButton("Crear cuenta", { state.authScreen = AuthScreen.Register })
            }
        }
        Spacer(Modifier.height(18.dp))
        AguaCard(color = Water.Card.copy(alpha = 0.7f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconBadge(AguaIcons.Globe, size = 36)
                Spacer(Modifier.width(12.dp))
                Text(
                    "¿Eres operador? La validación y el despacho se hacen desde la web: ${AppConfig.WEB_URL.removePrefix("https://")}",
                    fontSize = 13.sp, color = Water.Warm,
                )
            }
        }
    }
}

@Composable
private fun RegisterForm(state: AppState) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var terms by remember { mutableStateOf(false) }
    var errors by remember { mutableStateOf(mapOf<String, String>()) }
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    val checks = listOf(
        "8 caracteres o más" to (password.length >= 8),
        "Una letra" to password.any { it.isLetter() },
        "Un número" to password.any { it.isDigit() },
    )

    fun submit() {
        val e = buildMap {
            if (name.trim().length < 2) put("name", "Escribe tu nombre (mínimo 2 letras).")
            validateEmail(email)?.let { put("email", it) }
            if (!checks.all { it.second }) put("password", "La contraseña no cumple los requisitos.")
            if (confirm != password) put("confirm", "Las contraseñas no coinciden.")
            if (!terms) put("terms", "Debes aceptar el aviso de privacidad.")
        }
        errors = e
        if (e.isNotEmpty()) return
        busy = true
        message = null
        scope.launch {
            message = state.register(name, email, password)
            busy = false
        }
    }

    Column {
        Text("Crea tu cuenta", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(6.dp))
        Text("Te enviaremos un correo para verificarla. Necesitas verificarla para reportar y subir fotos.", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(18.dp))
        AguaField(name, { name = it }, "Nombre", error = errors["name"], maxLength = 80)
        Spacer(Modifier.height(12.dp))
        AguaField(email, { email = it }, "Correo", error = errors["email"], keyboard = KeyboardType.Email)
        Spacer(Modifier.height(12.dp))
        AguaField(password, { password = it }, "Contraseña", error = errors["password"], password = true)
        Row(Modifier.padding(top = 6.dp, start = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            checks.forEach { (text, ok) ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (ok) AguaIcons.Check else AguaIcons.Drop, null, Modifier.size(13.dp), tint = if (ok) Water.Ok else Water.Ash)
                    Spacer(Modifier.width(3.dp))
                    Text(text, fontSize = 12.sp, color = if (ok) Water.Ok else Water.Warm)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        AguaField(confirm, { confirm = it }, "Confirma la contraseña", error = errors["confirm"], password = true, ime = ImeAction.Done)
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { terms = !terms }) {
            Checkbox(terms, { terms = it }, colors = CheckboxDefaults.colors(checkedColor = Water.Cyan))
            Text("Acepto el aviso de privacidad de Agua Alerta.", fontSize = 14.sp, color = Water.Ink)
        }
        errors["terms"]?.let { Text(it, color = Water.Critical, fontSize = 12.sp, modifier = Modifier.padding(start = 12.dp)) }
        AnimatedNotice(message, Tone.Error, Modifier.padding(top = 8.dp))
        Spacer(Modifier.height(14.dp))
        PrimaryButton("Crear cuenta", ::submit, Modifier.fillMaxWidth(), loading = busy)
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text("¿Ya tienes cuenta?", color = Water.Warm, fontSize = 14.sp)
            QuietButton("Entrar", { state.authScreen = AuthScreen.Login })
        }
    }
}

@Composable
private fun ForgotForm(state: AppState) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var sent by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    Column {
        Text("Recupera tu acceso", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(6.dp))
        Text("Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(18.dp))
        AguaField(email, { email = it }, "Correo", error = error, keyboard = KeyboardType.Email, ime = ImeAction.Done)
        AnimatedNotice(if (sent) "Si el correo está registrado, te llegará el enlace en unos minutos (revisa spam)." else null, Tone.Success, Modifier.padding(top = 10.dp))
        Spacer(Modifier.height(14.dp))
        PrimaryButton("Enviar enlace", {
            error = validateEmail(email)
            if (error == null) {
                busy = true
                scope.launch {
                    error = state.sendPasswordReset(email)
                    sent = error == null
                    busy = false
                }
            }
        }, Modifier.fillMaxWidth(), loading = busy)
        Spacer(Modifier.height(6.dp))
        QuietButton("Volver a entrar", { state.authScreen = AuthScreen.Login }, Modifier.fillMaxWidth())
    }
}
