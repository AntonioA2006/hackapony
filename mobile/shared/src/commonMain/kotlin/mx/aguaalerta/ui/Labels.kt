package mx.aguaalerta.ui

import androidx.compose.ui.graphics.Color

/** Mismas etiquetas que frontend/src/shared/labels.ts. */
object Labels {
    val category = linkedMapOf(
        "leak_public_road" to "Fuga en vía pública",
        "broken_pipe" to "Tubería rota",
        "public_infra_leak" to "Fuga en infraestructura pública",
        "flood_from_leak" to "Encharcamiento por fuga",
        "supply_issue" to "Falta de suministro",
        "other_water" to "Otro problema de agua",
    )
    val severity = linkedMapOf("low" to "Baja", "medium" to "Media", "high" to "Alta", "critical" to "Crítica")
    val reportStatus = mapOf(
        "received" to "Recibido", "under_review" to "En revisión", "validated" to "Validado",
        "rejected" to "Rechazado", "in_progress" to "En atención", "resolved" to "Resuelto",
    )
    val incidentStatus = mapOf(
        "open" to "Abierta", "triaged" to "Clasificada", "in_progress" to "En atención",
        "pending_verification" to "Por verificar", "resolved" to "Resuelta", "dismissed" to "Descartada",
    )
    val flow = mapOf("goteo" to "Goteo", "chorro" to "Chorro", "inundacion" to "Inundación")
    val role = mapOf(
        "CIUDADANO" to "Ciudadano", "OPERADOR" to "Operador", "CUADRILLA" to "Cuadrilla",
        "TECNICO" to "Operador", "ADMINISTRADOR" to "Operador", "SUPERADMINISTRADOR" to "Supervisión",
    )

    fun of(map: Map<String, String>, key: String?) = key?.let { map[it] ?: it } ?: "—"

    fun bandColor(band: String?): Color = when (band) {
        "critical" -> Water.Critical
        "high" -> Water.High
        "medium" -> Water.Medium
        else -> Water.Low
    }

    fun statusColor(status: String?): Color = when (status) {
        "resolved", "pending_verification" -> Water.Ok
        "rejected", "dismissed" -> Water.Critical
        "in_progress", "validated" -> Water.Cyan
        else -> Water.Warm
    }

    /** "2026-11-19T21:02:41Z" → "19/11/2026 21:02". */
    fun date(iso: String?, withTime: Boolean = false): String {
        if (iso.isNullOrBlank() || iso.length < 10) return "—"
        val (y, m, d) = iso.substring(0, 10).split("-").let { Triple(it[0], it[1], it[2]) }
        val time = if (withTime && iso.length >= 16) " " + iso.substring(11, 16) else ""
        return "$d/$m/$y$time"
    }
}
