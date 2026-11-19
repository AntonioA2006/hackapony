package mx.aguaalerta.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Paleta "agua" del sitio (frontend/tailwind.config.js). */
object Water {
    val Canvas = Color(0xFFF7FAFC)
    val Card = Color(0xFFFFFFFF)
    val Line = Color(0xFFE4EBF2)
    val Muted = Color(0xFFC5D2DF)
    val Ash = Color(0xFF8EA0B3)
    val Warm = Color(0xFF526277)
    val Ink = Color(0xFF142235)
    val Soot = Color(0xFF0B1F33)
    val Sky = Color(0xFFE7F2FC)
    val Tide = Color(0xFF14B8A6)
    val Mist = Color(0xFF38BDF8)
    val Cyan = Color(0xFF1479E8)
    val CyanEdge = Color(0xFF0E5FBE)
    val Deep = Color(0xFF0B84C6)
    val Critical = Color(0xFFD03B3B)
    val High = Color(0xFFEC835A)
    val Medium = Color(0xFFFAB219)
    val Low = Color(0xFF94A3B4)
    val Ok = Color(0xFF1E9E78)
}

private val colors = lightColorScheme(
    primary = Water.Cyan,
    onPrimary = Color.White,
    primaryContainer = Water.Sky,
    onPrimaryContainer = Water.CyanEdge,
    secondary = Water.Tide,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE0F7F4),
    onSecondaryContainer = Color(0xFF0B6E63),
    tertiary = Water.Deep,
    background = Water.Canvas,
    onBackground = Water.Ink,
    surface = Water.Card,
    onSurface = Water.Ink,
    surfaceVariant = Water.Canvas,
    onSurfaceVariant = Water.Warm,
    surfaceContainer = Water.Card,
    surfaceContainerLow = Water.Card,
    surfaceContainerHigh = Water.Sky,
    outline = Water.Muted,
    outlineVariant = Water.Line,
    error = Water.Critical,
    onError = Color.White,
)

private val base = Typography()
private val type = Typography(
    headlineMedium = base.headlineMedium.copy(fontWeight = FontWeight.SemiBold, fontSize = 26.sp, lineHeight = 32.sp, letterSpacing = (-0.4).sp),
    headlineSmall = base.headlineSmall.copy(fontWeight = FontWeight.SemiBold, fontSize = 22.sp, letterSpacing = (-0.2).sp),
    titleLarge = base.titleLarge.copy(fontWeight = FontWeight.SemiBold, fontSize = 19.sp),
    titleMedium = base.titleMedium.copy(fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    bodyLarge = base.bodyLarge.copy(fontSize = 16.sp, lineHeight = 23.sp),
    bodyMedium = base.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp, color = Water.Warm),
    labelLarge = base.labelLarge.copy(fontWeight = FontWeight.SemiBold, fontSize = 15.sp),
    labelMedium = base.labelMedium.copy(fontSize = 12.sp, letterSpacing = 0.3.sp),
)

private val shapes = Shapes(
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

val Eyebrow = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp, color = Water.Warm)

@Composable
fun AguaTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = colors, typography = type, shapes = shapes, content = content)
