@file:OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)

package mx.aguaalerta.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.useContents
import kotlinx.cinterop.usePinned
import kotlinx.coroutines.suspendCancellableCoroutine
import mx.aguaalerta.data.PickedPhoto
import platform.CoreLocation.CLLocation
import platform.CoreLocation.CLLocationManager
import platform.CoreLocation.CLLocationManagerDelegateProtocol
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedAlways
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedWhenInUse
import platform.CoreLocation.kCLAuthorizationStatusDenied
import platform.CoreLocation.kCLAuthorizationStatusNotDetermined
import platform.CoreLocation.kCLAuthorizationStatusRestricted
import platform.CoreLocation.kCLLocationAccuracyBest
import platform.Foundation.NSData
import platform.Foundation.NSError
import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.UIKit.UIImage
import platform.UIKit.UIImageJPEGRepresentation
import platform.UIKit.UIImagePickerController
import platform.UIKit.UIImagePickerControllerDelegateProtocol
import platform.UIKit.UIImagePickerControllerOriginalImage
import platform.UIKit.UIImagePickerControllerSourceType
import platform.UIKit.UINavigationControllerDelegateProtocol
import platform.UIKit.UIViewController
import platform.darwin.NSObject
import platform.posix.memcpy
import kotlin.coroutines.resume

@Composable
actual fun rememberDevice(): Device = remember { IosDevice() }

private class IosDevice : Device {
    private val manager = CLLocationManager()
    private var delegate: LocationDelegate? = null

    override suspend fun location(): LocationResult = suspendCancellableCoroutine { cont ->
        val d = LocationDelegate { result ->
            if (cont.isActive) cont.resume(result)
            delegate = null
        }
        delegate = d
        manager.delegate = d
        manager.desiredAccuracy = kCLLocationAccuracyBest
        when (manager.authorizationStatus) {
            kCLAuthorizationStatusNotDetermined -> manager.requestWhenInUseAuthorization()
            kCLAuthorizationStatusDenied, kCLAuthorizationStatusRestricted -> d.finish(LocationResult.Denied)
            else -> manager.requestLocation()
        }
        cont.invokeOnCancellation { manager.stopUpdatingLocation() }
    }

    override fun openUrl(url: String) {
        val nsUrl = NSURL.URLWithString(url) ?: return
        UIApplication.sharedApplication.openURL(nsUrl, emptyMap<Any?, Any?>(), null)
    }

    override fun dial(number: String) = openUrl("tel:$number")

    override fun navigateTo(latitude: Double, longitude: Double) =
        openUrl("https://maps.apple.com/?daddr=$latitude,$longitude")
}

private class LocationDelegate(private val onResult: (LocationResult) -> Unit) : NSObject(), CLLocationManagerDelegateProtocol {
    private var done = false

    fun finish(result: LocationResult) {
        if (done) return
        done = true
        onResult(result)
    }

    override fun locationManager(manager: CLLocationManager, didUpdateLocations: List<*>) {
        val loc = didUpdateLocations.lastOrNull() as? CLLocation ?: return
        val acc = loc.horizontalAccuracy.toFloat()
        loc.coordinate.useContents { finish(LocationResult.Ok(latitude, longitude, acc)) }
    }

    override fun locationManager(manager: CLLocationManager, didFailWithError: NSError) {
        finish(LocationResult.Unavailable)
    }

    override fun locationManagerDidChangeAuthorization(manager: CLLocationManager) {
        when (manager.authorizationStatus) {
            kCLAuthorizationStatusAuthorizedWhenInUse, kCLAuthorizationStatusAuthorizedAlways -> manager.requestLocation()
            kCLAuthorizationStatusDenied, kCLAuthorizationStatusRestricted -> finish(LocationResult.Denied)
            else -> Unit
        }
    }
}

@Composable
actual fun rememberPhotoPicker(maxItems: Int, onPicked: (List<PickedPhoto>) -> Unit): PhotoPicker =
    remember(maxItems) { IosPhotoPicker(onPicked) }

private class IosPhotoPicker(private val onPicked: (List<PickedPhoto>) -> Unit) : PhotoPicker {
    private var delegate: PickerDelegate? = null

    override fun takePhoto() = present(UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypeCamera)

    override fun pickFromGallery() = present(UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypePhotoLibrary)

    private fun present(source: UIImagePickerControllerSourceType) {
        if (!UIImagePickerController.isSourceTypeAvailable(source)) return
        val picker = UIImagePickerController()
        picker.sourceType = source
        val d = PickerDelegate { photo ->
            delegate = null
            photo?.let { onPicked(listOf(it)) }
        }
        delegate = d
        picker.delegate = d
        topController()?.presentViewController(picker, animated = true, completion = null)
    }

    private fun topController(): UIViewController? {
        var vc = UIApplication.sharedApplication.keyWindow?.rootViewController
        while (vc?.presentedViewController != null) vc = vc.presentedViewController
        return vc
    }
}

private class PickerDelegate(private val onDone: (PickedPhoto?) -> Unit) :
    NSObject(), UIImagePickerControllerDelegateProtocol, UINavigationControllerDelegateProtocol {

    override fun imagePickerController(picker: UIImagePickerController, didFinishPickingMediaWithInfo: Map<Any?, *>) {
        val image = didFinishPickingMediaWithInfo[UIImagePickerControllerOriginalImage] as? UIImage
        picker.dismissViewControllerAnimated(true, completion = null)
        onDone(image?.let { UIImageJPEGRepresentation(it, 0.6)?.toPhoto() })
    }

    override fun imagePickerControllerDidCancel(picker: UIImagePickerController) {
        picker.dismissViewControllerAnimated(true, completion = null)
        onDone(null)
    }
}

private fun NSData.toPhoto(): PickedPhoto {
    val bytes = ByteArray(length.toInt())
    if (bytes.isNotEmpty()) bytes.usePinned { memcpy(it.addressOf(0), this.bytes, length) }
    return PickedPhoto(bytes, "image/jpeg")
}

@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) = Unit
