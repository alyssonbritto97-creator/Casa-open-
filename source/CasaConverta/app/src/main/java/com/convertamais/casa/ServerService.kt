package com.convertamais.casa

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.flow.MutableStateFlow
import java.net.Inet4Address
import java.net.NetworkInterface

/** Estado compartilhado entre o serviço e a tela. */
object ServerState {
    /** Endereço que os outros celulares devem abrir (ex.: http://192.168.0.10:8080), ou null se desligado. */
    val address = MutableStateFlow<String?>(null)
    val error = MutableStateFlow<String?>(null)

    const val PORT = 8080

    /** IP do Wi-Fi (ou do ponto de acesso) deste celular. */
    fun localIp(): String? = try {
        NetworkInterface.getNetworkInterfaces().toList()
            .flatMap { it.inetAddresses.toList() }
            .firstOrNull { !it.isLoopbackAddress && it is Inet4Address && it.isSiteLocalAddress }
            ?.hostAddress
    } catch (e: Exception) {
        null
    }
}

/** Mantém o servidor da casa ligado mesmo com a tela apagada. */
class ServerService : Service() {
    private var server: CasaServer? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        startInForeground()
        if (server == null) {
            try {
                val s = CasaServer(applicationContext, ServerState.PORT, Db(applicationContext))
                s.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false)
                server = s
                val ip = ServerState.localIp()
                if (ip == null) {
                    ServerState.error.value = "Conecte este celular ao Wi-Fi para os outros acessarem."
                    ServerState.address.value = null
                } else {
                    ServerState.error.value = null
                    ServerState.address.value = "http://$ip:${ServerState.PORT}"
                }
            } catch (e: Exception) {
                ServerState.error.value = "Não foi possível ligar: ${e.message}"
                ServerState.address.value = null
            }
        }
        return START_STICKY
    }

    private fun startInForeground() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Open House ligado", NotificationManager.IMPORTANCE_LOW))
        val open = android.app.PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
        )
        val n: Notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(applicationInfo.icon)
            .setContentTitle("Open House está ligado")
            .setContentText("The house can now connect over Wi-Fi · A casa já acessa pelo Wi-Fi.")
            .setContentIntent(open)
            .setOngoing(true)
            .build()
        ServiceCompat.startForeground(this, 1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    }

    override fun onDestroy() {
        server?.stop()
        server = null
        ServerState.address.value = null
        super.onDestroy()
    }

    companion object {
        const val CHANNEL = "casa_server"
        const val ACTION_STOP = "com.convertamais.casa.STOP"
    }
}
