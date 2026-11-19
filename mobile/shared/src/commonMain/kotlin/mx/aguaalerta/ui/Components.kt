package mx.aguaalerta.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Escala sutil al presionar (la misma sensación que `.press` en el sitio). */
@Composable
fun Modifier.pressScale(source: MutableInteractionSource): Modifier {
    val pressed by source.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) 0.97f else 1f, tween(120), label = "press")
    return this.scale(s)
}

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: ImageVector? = null,
    color: Color = Water.Cyan,
) {
    val source = remember { MutableInteractionSource() }
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        interactionSource = source,
        modifier = modifier.heightIn(min = 52.dp).pressScale(source),
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(containerColor = color, disabledContainerColor = color.copy(alpha = 0.45f), disabledContentColor = Color.White),
        contentPadding = PaddingValues(horizontal = 22.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
            Spacer(Modifier.width(10.dp))
        } else if (icon != null) {
            Icon(icon, null, Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, icon: ImageVector? = null, enabled: Boolean = true) {
    val source = remember { MutableInteractionSource() }
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        interactionSource = source,
        modifier = modifier.heightIn(min = 52.dp).pressScale(source),
        shape = RoundedCornerShape(50),
        border = BorderStroke(1.dp, Water.Line),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = Water.Card, contentColor = Water.Ink),
        contentPadding = PaddingValues(horizontal = 20.dp),
    ) {
        if (icon != null) {
            Icon(icon, null, Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun QuietButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    TextButton(onClick = onClick, modifier = modifier.heightIn(min = 44.dp)) {
        Text(text, color = Water.CyanEdge, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun AguaField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    hint: String? = null,
    keyboard: KeyboardType = KeyboardType.Text,
    ime: ImeAction = ImeAction.Next,
    password: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
    maxLength: Int? = null,
) {
    var visible by remember { mutableStateOf(false) }
    Column(modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = value,
            onValueChange = { v -> onValueChange(if (maxLength != null) v.take(maxLength) else v) },
            label = { Text(label) },
            isError = error != null,
            singleLine = singleLine,
            minLines = minLines,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else keyboard, imeAction = ime),
            visualTransformation = if (password && !visible) PasswordVisualTransformation() else VisualTransformation.None,
            trailingIcon = if (password) {
                {
                    IconButton(onClick = { visible = !visible }) {
                        Icon(if (visible) AguaIcons.EyeOff else AguaIcons.Eye, if (visible) "Ocultar contraseña" else "Mostrar contraseña", tint = Water.Warm)
                    }
                }
            } else null,
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Water.Line,
                focusedBorderColor = Water.Cyan,
                unfocusedContainerColor = Water.Card,
                focusedContainerColor = Water.Card,
            ),
        )
        val below = error ?: hint
        val counter = if (maxLength != null && !singleLine) "${value.length}/$maxLength" else null
        if (below != null || counter != null) {
            Row(Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, top = 4.dp)) {
                Text(
                    below.orEmpty(),
                    color = if (error != null) Water.Critical else Water.Warm,
                    fontSize = 12.sp,
                    modifier = Modifier.weight(1f),
                )
                if (counter != null) Text(counter, color = Water.Ash, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun AguaCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    color: Color = Water.Card,
    border: Color = Water.Line,
    padding: PaddingValues = PaddingValues(18.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    Surface(
        modifier = modifier.fillMaxWidth().then(if (onClick != null) Modifier.pressScale(source) else Modifier),
        shape = RoundedCornerShape(20.dp),
        color = color,
        border = BorderStroke(1.dp, border),
    ) {
        Column(
            Modifier
                .then(if (onClick != null) Modifier.clickable(interactionSource = source, indication = androidx.compose.material3.ripple(), onClick = onClick) else Modifier)
                .padding(padding),
            content = content,
        )
    }
}

enum class Tone { Info, Success, Warning, Error }

@Composable
fun Notice(text: String, tone: Tone = Tone.Info, modifier: Modifier = Modifier, action: (@Composable RowScope.() -> Unit)? = null) {
    val (bg, fg, icon) = when (tone) {
        Tone.Info -> Triple(Water.Sky, Water.CyanEdge, AguaIcons.Drop)
        Tone.Success -> Triple(Color(0xFFE6F6F0), Color(0xFF13694F), AguaIcons.Check)
        Tone.Warning -> Triple(Color(0xFFFFF5DD), Color(0xFF7A5300), AguaIcons.Alert)
        Tone.Error -> Triple(Color(0xFFFCE9E9), Color(0xFF9B2323), AguaIcons.Alert)
    }
    Surface(modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), color = bg) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Icon(icon, null, Modifier.size(20.dp).padding(top = 1.dp), tint = fg)
                Spacer(Modifier.width(10.dp))
                Text(text, color = fg, fontSize = 14.sp, lineHeight = 20.sp)
            }
            if (action != null) {
                Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End), content = action)
            }
        }
    }
}

/** Aviso que aparece/desaparece con animación. */
@Composable
fun AnimatedNotice(text: String?, tone: Tone, modifier: Modifier = Modifier) {
    AnimatedVisibility(text != null, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
        Notice(text.orEmpty(), tone, modifier)
    }
}

@Composable
fun StatusChip(text: String, color: Color) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).background(color.copy(alpha = 0.12f)).padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(7.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(6.dp))
        Text(text, color = Water.Ink, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun IconBadge(icon: ImageVector, tint: Color = Water.Deep, bg: Color = Water.Sky, size: Int = 44) {
    Box(Modifier.size(size.dp).clip(CircleShape).background(bg), contentAlignment = Alignment.Center) {
        Icon(icon, null, Modifier.size((size * 0.5).dp), tint = tint)
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text.uppercase(), style = Eyebrow, modifier = modifier.padding(bottom = 8.dp))
}

@Composable
fun StatTile(label: String, value: Int, modifier: Modifier = Modifier, accent: Color = Water.Cyan) {
    AguaCard(modifier, padding = PaddingValues(14.dp)) {
        Text(value.toString(), fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = Water.Ink)
        Spacer(Modifier.height(2.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(6.dp).clip(CircleShape).background(accent))
            Spacer(Modifier.width(6.dp))
            Text(label, fontSize = 12.sp, color = Water.Warm)
        }
    }
}

@Composable
fun LoadingBox(text: String = "Cargando…", modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(vertical = 40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        CircularProgressIndicator(color = Water.Cyan, strokeWidth = 3.dp)
        Spacer(Modifier.height(14.dp))
        Text(text, color = Water.Warm, textAlign = TextAlign.Center, fontSize = 14.sp)
    }
}

@Composable
fun ErrorBox(message: String, onRetry: () -> Unit) {
    Notice(message, Tone.Error) { QuietButton("Reintentar", onRetry) }
}

@Composable
fun EmptyState(icon: ImageVector, title: String, body: String, action: (@Composable () -> Unit)? = null) {
    Column(Modifier.fillMaxWidth().padding(vertical = 36.dp, horizontal = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        IconBadge(icon, size = 64)
        Spacer(Modifier.height(14.dp))
        Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(body, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
        if (action != null) {
            Spacer(Modifier.height(18.dp))
            action()
        }
    }
}

private val STAGES = listOf("Emitido", "Validado", "Atendido")

/** Las 3 etapas del ticket (emitido → validado por operador → atendido por cuadrilla). */
@Composable
fun TicketTracker(stage: Int, crew: String?) {
    Column {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            STAGES.forEachIndexed { i, _ ->
                val n = i + 1
                val done = n < stage || n == 1
                val current = n == stage && n > 1
                val color = when {
                    done -> Water.Ok
                    current -> Water.Cyan
                    else -> Water.Muted
                }
                Box(
                    Modifier.size(30.dp).clip(CircleShape).background(if (done || current) color else Water.Card)
                        .border(1.5.dp, color, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    if (done) Icon(AguaIcons.Check, null, Modifier.size(16.dp), tint = Color.White)
                    else Text("$n", color = if (current) Color.White else Water.Ash, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
                if (i < STAGES.lastIndex) {
                    val filled = n < stage
                    Box(Modifier.weight(1f).height(3.dp).padding(horizontal = 4.dp).clip(RoundedCornerShape(2.dp)).background(if (filled) Water.Ok else Water.Line))
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth()) {
            STAGES.forEachIndexed { i, label ->
                Text(
                    label,
                    fontSize = 12.sp,
                    color = if (i + 1 <= stage) Water.Ink else Water.Ash,
                    fontWeight = if (i + 1 == stage) FontWeight.SemiBold else FontWeight.Normal,
                    modifier = Modifier.weight(1f),
                    textAlign = when (i) { 0 -> TextAlign.Start; STAGES.lastIndex -> TextAlign.End; else -> TextAlign.Center },
                )
            }
        }
        if (crew != null && stage >= 2) {
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(AguaIcons.Helmet, null, Modifier.size(16.dp), tint = Water.Warm)
                Spacer(Modifier.width(6.dp))
                Text("Cuadrilla: $crew", fontSize = 13.sp, color = Water.Warm)
            }
        }
    }
}

/** Llamar al organismo operador (si está configurado) o al 911 en emergencias. */
@Composable
fun CallButtons(onDial: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (mx.aguaalerta.AppConfig.UTILITY_PHONE.isNotBlank()) {
            SecondaryButton("Llamar al ${mx.aguaalerta.AppConfig.UTILITY_NAME}", { onDial(mx.aguaalerta.AppConfig.UTILITY_PHONE) }, Modifier.fillMaxWidth(), AguaIcons.Phone)
        }
        PrimaryButton(
            "Emergencia 911",
            { onDial(mx.aguaalerta.AppConfig.EMERGENCY_PHONE) },
            Modifier.fillMaxWidth(),
            icon = AguaIcons.Alert,
            color = Water.Critical,
        )
        Text(
            "Usa el 911 solo si hay riesgo inmediato: inundación, socavón o cables expuestos.",
            fontSize = 12.sp, color = Water.Warm, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth(),
        )
    }
}
