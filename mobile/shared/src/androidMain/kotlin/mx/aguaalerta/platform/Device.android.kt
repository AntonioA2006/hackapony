package mx.aguaalerta.platform

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.location.LocationManagerCompat
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import mx.aguaalerta.data.PickedPhoto
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.coroutines.resume
import kotlin.math.max

private val LOCATION_PERMISSIONS = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)

@Composable
actual fun rememberDevice(): Device {
    val context = LocalContext.current
    val pending = remember { mutableStateOf<CompletableDeferred<Boolean>?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        pending.value?.complete(result.values.any { it })
        pending.value = null
    }
    return remember(context) {
        AndroidDevice(context) {
            val deferred = CompletableDeferred<Boolean>()
            pending.value = deferred
            launcher.launch(LOCATION_PERMISSIONS)
            deferred.await()
        }
    }
}

private class AndroidDevice(
    private val context: Context,
    private val requestPermission: suspend () -> Boolean,
) : Device {
    private fun granted() = LOCATION_PERMISSIONS.any {
        ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    override suspend fun location(): LocationResult {
        if (!granted() && !requestPermission()) return LocationResult.Denied
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        if (!LocationManagerCompat.isLocationEnabled(manager)) return LocationResult.Disabled
        // Sin Google Play Services: proveedores del sistema (funciona en cualquier Android)
        val providers = buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) add(LocationManager.FUSED_PROVIDER)
            add(LocationManager.GPS_PROVIDER)
            add(LocationManager.NETWORK_PROVIDER)
        }.filter { runCatching { manager.isProviderEnabled(it) }.getOrDefault(false) }
        for (provider in providers) {
            val loc = withTimeoutOrNull(15_000) { currentLocation(manager, provider) }
            if (loc != null) return loc.toResult()
        }
        val last = providers.mapNotNull { runCatching { manager.getLastKnownLocation(it) }.getOrNull() }
            .maxByOrNull { it.time }
        return last?.toResult() ?: LocationResult.Unavailable
    }

    @SuppressLint("MissingPermission")
    private suspend fun currentLocation(manager: LocationManager, provider: String): Location? =
        suspendCancellableCoroutine { cont ->
            val signal = android.os.CancellationSignal()
            LocationManagerCompat.getCurrentLocation(manager, provider, signal, ContextCompat.getMainExecutor(context)) { loc ->
                if (cont.isActive) cont.resume(loc)
            }
            cont.invokeOnCancellation { signal.cancel() }
        }

    private fun Location.toResult() = LocationResult.Ok(latitude, longitude, if (hasAccuracy()) accuracy else null)

    override fun openUrl(url: String) = start(Intent(Intent.ACTION_VIEW, Uri.parse(url)))

    override fun dial(number: String) = start(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")))

    override fun navigateTo(latitude: Double, longitude: Double) {
        // geo: abre la app de mapas que tenga el teléfono (Google Maps, Waze, Petal Maps…)
        val geo = Intent(Intent.ACTION_VIEW, Uri.parse("geo:$latitude,$longitude?q=$latitude,$longitude(Fuga)"))
        try {
            context.startActivity(geo.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) {
            openUrl("https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude")
        }
    }

    private fun start(intent: Intent) {
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(context, "No hay una app para abrir esto.", Toast.LENGTH_SHORT).show()
        }
    }
}

@Composable
actual fun rememberPhotoPicker(maxItems: Int, onPicked: (List<PickedPhoto>) -> Unit): PhotoPicker {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val cameraUri = remember { mutableStateOf<Uri?>(null) }

    fun deliver(uris: List<Uri>) {
        if (uris.isEmpty()) return
        scope.launch {
            val photos = withContext(Dispatchers.IO) { uris.take(maxItems).mapNotNull { compress(context, it) } }
            if (photos.isNotEmpty()) onPicked(photos)
            else Toast.makeText(context, "No se pudo leer la imagen.", Toast.LENGTH_SHORT).show()
        }
    }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        if (ok) cameraUri.value?.let { deliver(listOf(it)) }
    }
    val single = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        deliver(listOfNotNull(uri))
    }
    val multiple = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(max(2, maxItems))) { uris ->
        deliver(uris)
    }

    return remember(maxItems) {
        object : PhotoPicker {
            override fun takePhoto() {
                val dir = File(context.cacheDir, "camera").apply { mkdirs() }
                val file = File(dir, "foto_${System.currentTimeMillis()}.jpg")
                val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
                cameraUri.value = uri
                try {
                    camera.launch(uri)
                } catch (_: ActivityNotFoundException) {
                    Toast.makeText(context, "No hay app de cámara.", Toast.LENGTH_SHORT).show()
                }
            }

            override fun pickFromGallery() {
                val request = PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                if (maxItems > 1) multiple.launch(request) else single.launch(request)
            }
        }
    }
}

/** Reduce la foto (máx. 1600 px), respeta la orientación EXIF y la guarda como JPEG. */
private fun compress(context: Context, uri: Uri): PickedPhoto? = runCatching {
    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= 1600) sample *= 2
    val decoded = resolver.openInputStream(uri)?.use {
        BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: return null
    val rotation = resolver.openInputStream(uri)?.use {
        when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> 0f
        }
    } ?: 0f
    val longest = max(decoded.width, decoded.height)
    val scale = if (longest > 1600) 1600f / longest else 1f
    val matrix = Matrix().apply {
        if (scale < 1f) postScale(scale, scale)
        if (rotation != 0f) postRotate(rotation)
    }
    val bitmap = if (scale < 1f || rotation != 0f) {
        Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
    } else decoded
    val out = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
    PickedPhoto(out.toByteArray(), "image/jpeg")
}.getOrNull()

@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) = BackHandler(enabled, onBack)
