package mx.aguaalerta.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    @SerialName("display_name") val displayName: String,
    val role: String,
)

@Serializable
data class Page<T>(val items: List<T> = emptyList(), val total: Int = 0)

@Serializable
data class ActiveReportResponse(
    @SerialName("email_verified") val emailVerified: Boolean = false,
    val active: ActiveTicket? = null,
)

@Serializable
data class ActiveTicket(
    @SerialName("public_id") val publicId: String,
    val title: String,
    val status: String,
    @SerialName("incident_public_id") val incidentPublicId: String? = null,
    @SerialName("incident_status") val incidentStatus: String? = null,
    val stage: Int = 1,
    val dispatched: Boolean = false,
    @SerialName("crew_name") val crewName: String? = null,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class CitizenStats(
    @SerialName("total_reports") val totalReports: Int = 0,
    val pending: Int = 0,
    @SerialName("in_progress") val inProgress: Int = 0,
    val resolved: Int = 0,
)

@Serializable
data class AppNotification(
    val id: String,
    val title: String,
    val body: String,
    @SerialName("read_at") val readAt: String? = null,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class Report(
    val id: String,
    @SerialName("public_id") val publicId: String,
    val status: String,
    val title: String,
    val description: String = "",
    val category: String,
    val severity: String = "medium",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    @SerialName("address_reference") val addressReference: String? = null,
    @SerialName("incident_id") val incidentId: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("leak_flow") val leakFlow: String? = null,
    @SerialName("incident_status") val incidentStatus: String? = null,
)

@Serializable
data class ReportCreate(
    val title: String,
    val description: String,
    val category: String,
    val severity: String,
    val latitude: Double,
    val longitude: Double,
    @SerialName("device_latitude") val deviceLatitude: Double,
    @SerialName("device_longitude") val deviceLongitude: Double,
    @SerialName("leak_flow") val leakFlow: String? = null,
    @SerialName("address_reference") val addressReference: String? = null,
    @SerialName("contact_phone") val contactPhone: String? = null,
)

@Serializable
data class Assignee(val id: String, @SerialName("display_name") val displayName: String)

@Serializable
data class Incident(
    val id: String,
    @SerialName("public_id") val publicId: String,
    @SerialName("primary_category") val primaryCategory: String,
    val status: String,
    @SerialName("urgency_score") val urgencyScore: Double = 0.0,
    @SerialName("priority_band") val priorityBand: String = "low",
    val latitude: Double,
    val longitude: Double,
    @SerialName("report_count") val reportCount: Int = 1,
    @SerialName("leak_flow") val leakFlow: String? = null,
    @SerialName("state_name") val stateName: String? = null,
    @SerialName("municipality_name") val municipalityName: String? = null,
    @SerialName("opened_at") val openedAt: String? = null,
    @SerialName("assigned_to") val assignedTo: Assignee? = null,
)

@Serializable
data class PhotoRef(val id: String, @SerialName("mime_type") val mimeType: String = "image/jpeg")

@Serializable
data class DetailReport(
    val id: String,
    @SerialName("public_id") val publicId: String,
    val title: String,
    val description: String = "",
    val category: String,
    val severity: String = "medium",
    @SerialName("leak_flow") val leakFlow: String? = null,
    val status: String,
    @SerialName("address_reference") val addressReference: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    val reporter: String = "",
    @SerialName("contact_phone") val contactPhone: String? = null,
    val photos: List<PhotoRef> = emptyList(),
)

@Serializable
data class Resolution(
    val description: String,
    @SerialName("minutes_spent") val minutesSpent: Int,
    @SerialName("submitted_at") val submittedAt: String = "",
    @SerialName("verified_at") val verifiedAt: String? = null,
)

@Serializable
data class IncidentDetail(
    val incident: Incident,
    val reports: List<DetailReport> = emptyList(),
    @SerialName("photos_purged_at") val photosPurgedAt: String? = null,
    val resolution: Resolution? = null,
)

@Serializable
data class ProfileUpdate(@SerialName("display_name") val displayName: String)

@Serializable
data class SatisfactionIn(val score: Int)

/** Foto ya comprimida en el dispositivo, lista para subir. */
class PickedPhoto(val bytes: ByteArray, val mime: String = "image/jpeg")
