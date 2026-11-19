package mx.aguaalerta.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/** Íconos de línea (24×24, trazo 1.75) idénticos a los del sitio: frontend/src/shared/ui/icons.tsx. */
object AguaIcons {
    private fun line(name: String, vararg paths: String, fill: Boolean = false): ImageVector =
        ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
            paths.forEach { d ->
                addPath(
                    pathData = addPathNodes(d),
                    fill = if (fill) SolidColor(Color.Black) else null,
                    stroke = SolidColor(Color.Black),
                    strokeLineWidth = 1.75f,
                    strokeLineCap = StrokeCap.Round,
                    strokeLineJoin = StrokeJoin.Round,
                )
            }
        }.build()

    val Drop = line("drop", "M12 2.8c3.7 4.4 6.6 8 6.6 11.6a6.6 6.6 0 0 1-13.2 0c0-3.6 2.9-7.2 6.6-11.6Z", "M8.9 14.6a3.2 3.2 0 0 0 2.7 3")
    val DropFilled = line("drop-filled", "M12 2.8c3.7 4.4 6.6 8 6.6 11.6a6.6 6.6 0 0 1-13.2 0c0-3.6 2.9-7.2 6.6-11.6Z", fill = true)
    val Faucet = line("faucet", "M3 8.5v6", "M3 10.5h9.5a4.5 4.5 0 0 1 4.5 4.5v1", "M3 14.5h7", "M8 10.5V6.5M5.5 6.5h5", "M17 18.5v3")
    val Waves = line(
        "waves",
        "M2.5 7.5q2.4-2.6 4.75 0t4.75 0 4.75 0 4.75 0",
        "M2.5 12.5q2.4-2.6 4.75 0t4.75 0 4.75 0 4.75 0",
        "M2.5 17.5q2.4-2.6 4.75 0t4.75 0 4.75 0 4.75 0",
    )
    val Phone = line("phone", "M5 4.5h3l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7l1.3-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5Z")
    val Alert = line("alert", "M10.3 4.2 3 17.5A2 2 0 0 0 4.7 20.5h14.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z", "M12 9.5v4M12 17h.01")
    val Helmet = line("helmet", "M5 16v-2.5a7 7 0 0 1 14 0V16", "M10 6.8V11M14 6.8V11", "M2.5 16h19v1.2a1.8 1.8 0 0 1-1.8 1.8H4.3a1.8 1.8 0 0 1-1.8-1.8V16Z")
    val Pin = line("pin", "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z", "M12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z")
    val Check = line("check", "M5 12.5 10 17.5 19 7.5")
    val Home = line("home", "M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19Z")
    val List = line("list", "M9 6.5h11M9 12h11M9 17.5h11", "M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01")
    val User = line("user", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4.5 20a7.5 7.5 0 0 1 15 0")
    val Plus = line("plus", "M12 5v14M5 12h14")
    val Camera = line(
        "camera",
        "M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 5h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z",
        "M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    )
    val Image = line(
        "image",
        "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z",
        "M4.5 16l4-4 4 4 2.5-2.5 4.5 4.5",
        "M15.5 9.5h.01",
    )
    val Navigate = line("navigate", "M3.5 11 20.5 3.5 13 20.5l-2-7.5Z")
    val Target = line("target", "M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3", "M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z")
    val Refresh = line("refresh", "M19.5 12a7.5 7.5 0 1 1-2.2-5.3", "M19.5 4.5v4.5H15")
    val Logout = line("logout", "M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15", "M10 16l-4-4 4-4M6 12h10")
    val Globe = line("globe", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3 12h18", "M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z")
    val Back = line("back", "M15 5l-7 7 7 7")
    val Close = line("close", "M6 6l12 12M18 6 6 18")
    val Star = line("star", "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z")
    val StarFilled = line("star-filled", "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z", fill = true)
    val Eye = line("eye", "M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z", "M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z")
    val EyeOff = line("eye-off", "M4 4l16 16", "M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.6 3.3M6.6 7.4C3.9 9.1 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9 9 0 0 0 4.3-1.1")
    val Mail = line("mail", "M4 6.5h16v11H4Z", "M4.5 7.5 12 13l7.5-5.5")
    val Clock = line("clock", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7.5V12l3 2")
    val Bell = line("bell", "M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5Z", "M10 20.5a2 2 0 0 0 4 0")
    val Chevron = line("chevron", "M9 5l7 7-7 7")
    val Shield = line("shield", "M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6Z", "M9 12l2 2 4-4")
}
