package com.convertamais.casa

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private fun tr(pt: String, es: String): String =
    if (java.util.Locale.getDefault().language == "es") es else pt

private val Navy = Color(0xFF0B1D4D)
private val Green = Color(0xFF9BC53D)
private val Muted = Color(0xFF5C6A8A)
private val Line = Color(0xFFD9DEEA)

/** Open House © Jose Brito · Converta+. Todos os direitos reservados. */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Navy, background = Color(0xFFF3F5FA), surface = Color.White, onSurface = Navy)) {
                Surface(Modifier.fillMaxSize(), color = Color(0xFFF3F5FA)) { Control() }
            }
        }
    }
}

@Composable
private fun Control() {
    val ctx = LocalContext.current
    val address by ServerState.address.collectAsState()
    val error by ServerState.error.collectAsState()
    val running = address != null

    val notif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33) notif.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    fun start() = ctx.startForegroundService(Intent(ctx, ServerService::class.java))
    fun stop() = ctx.startService(Intent(ctx, ServerService::class.java).setAction(ServerService.ACTION_STOP))

    Column(
        Modifier.fillMaxSize().padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Spacer(Modifier.height(10.dp))
        Image(
            painterResource(R.drawable.logo_converta), contentDescription = "Converta+",
            contentScale = ContentScale.Fit, modifier = Modifier.height(96.dp)
        )
        Text("Open House", color = Navy, fontSize = 30.sp, fontWeight = FontWeight.Black)
        Text(tr("Better home · Prosperous home", "Better home · Prosperous home"), color = Muted, fontSize = 14.sp)
        Text(tr("Casa, comida, contas e colaboração", "Casa, comida, cuentas y colaboración"), color = Muted, fontSize = 13.sp)

        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White)
                .border(1.dp, Line, RoundedCornerShape(20.dp)).padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(if (running) tr("Servidor ligado", "Servidor encendido") else tr("Servidor desligado", "Servidor apagado"),
                color = if (running) Color(0xFF3F7A00) else Muted, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            if (running) {
                Text(tr("Peça para o pessoal abrir este endereço no navegador, ligado no mesmo Wi-Fi:", "Pida a la gente que abra esta dirección en el navegador, en el mismo Wi-Fi:"), color = Muted, fontSize = 13.sp)
                Text(address ?: "", color = Navy, fontSize = 22.sp, fontWeight = FontWeight.Black)
            } else {
                Text(tr("Ligue para os outros celulares da casa acessarem. Os dados ficam só neste celular.", "Enciéndalo para que los otros celulares de la casa accedan. Los datos quedan solo en este celular."), color = Muted, fontSize = 13.sp)
            }
            error?.let { Text(it, color = Color(0xFFE5334B), fontSize = 13.sp) }
        }

        if (!running) {
            Button(
                onClick = { start() }, modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Green, contentColor = Navy)
            ) { Text(tr("Ligar servidor da casa", "Encender servidor de la casa"), fontWeight = FontWeight.Bold) }
        } else {
            Button(
                onClick = {
                    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("http://127.0.0.1:${ServerState.PORT}/")))
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Navy, contentColor = Color.White)
            ) { Text(tr("Abrir painel (administrador)", "Abrir panel (administrador)"), fontWeight = FontWeight.Bold) }
            OutlinedButton(
                onClick = {
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, tr("Open House — abra no navegador, no mesmo Wi-Fi da casa: $address", "Open House — abra en el navegador, en el mismo Wi-Fi de la casa: $address"))
                    }
                    ctx.startActivity(Intent.createChooser(send, tr("Enviar link", "Enviar enlace")))
                },
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) { Text(tr("Enviar link (WhatsApp…)", "Enviar enlace (WhatsApp…)"), color = Navy, fontWeight = FontWeight.Bold) }
            OutlinedButton(onClick = { stop() }, modifier = Modifier.fillMaxWidth()) {
                Text(tr("Desligar servidor", "Apagar servidor"), color = Color(0xFFE5334B))
            }
        }

        Spacer(Modifier.weight(1f))
        Text(
            tr("Dica: deixe este celular carregando e com a economia de bateria desligada para o Open House, assim o servidor não para.", "Consejo: deje este celular cargando y con el ahorro de batería desactivado para Open House, así el servidor no se detiene."),
            color = Muted, fontSize = 12.sp
        )
        Text("Open House  •  © Converta+  •  Jose Brito", color = Muted, fontSize = 11.sp)
    }
}
