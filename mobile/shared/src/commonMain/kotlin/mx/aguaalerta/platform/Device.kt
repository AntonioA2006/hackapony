package mx.aguaalerta.platform

import androidx.compose.runtime.Composable
import mx.aguaalerta.data.PickedPhoto

sealed interface LocationResult {
    data class Ok(val latitude: Double, val longitude: Double, val accuracyM: Float?) : LocationResult
    data object Denied : LocationResult
    data object Disabled : LocationResult
    data object Unavailable : LocationResult
}

/** Capacidades del teléfono que la app necesita. */
interface Device {
    /** Pide permiso si hace falta y devuelve la ubicación actual. */
    suspend fun location(): LocationResult
    fun openUrl(url: String)
    /** Abre el marcador con el número (no llama sola). */
    fun dial(number: String)
    /** Abre la app de mapas con indicaciones hasta el punto. */
    fun navigateTo(latitude: Double, longitude: Double)
}

interface PhotoPicker {
    fun takePhoto()
    fun pickFromGallery()
}

@Composable
expect fun rememberDevice(): Device

/** Cámara y galería; las fotos llegan ya reducidas (máx. ~1600 px, JPEG). */
@Composable
expect fun rememberPhotoPicker(maxItems: Int, onPicked: (List<PickedPhoto>) -> Unit): PhotoPicker

/** Botón "atrás" del sistema (Android). En iOS no hace nada: se usan los botones de la app. */
@Composable
expect fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit)
