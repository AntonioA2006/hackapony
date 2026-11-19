package mx.aguaalerta.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import mx.aguaalerta.data.PickedPhoto

/** Destino de pruebas en computadora: ubicación fija (CDMX) y sin cámara. */
var desktopLocation: LocationResult = LocationResult.Ok(19.4326, -99.1332, 12f)
val desktopOpened = mutableListOf<String>()

@Composable
actual fun rememberDevice(): Device = remember {
    object : Device {
        override suspend fun location() = desktopLocation
        override fun openUrl(url: String) { desktopOpened += url }
        override fun dial(number: String) { desktopOpened += "tel:$number" }
        override fun navigateTo(latitude: Double, longitude: Double) { desktopOpened += "geo:$latitude,$longitude" }
    }
}

@Composable
actual fun rememberPhotoPicker(maxItems: Int, onPicked: (List<PickedPhoto>) -> Unit): PhotoPicker = remember {
    object : PhotoPicker {
        override fun takePhoto() = Unit
        override fun pickFromGallery() = Unit
    }
}

@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) = Unit
