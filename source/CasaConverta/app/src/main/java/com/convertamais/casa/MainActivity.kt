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

private val Navy = Color(0xFF0B1D4D)
private val Green = Color(0xFF9BC53D)
private val Muted = Color(0xFF5C6A8A)
private val Line = Color(0xFFD9DEEA)

/** Casa+ © Converta+ — Desenvolvido por Jose Brito. */
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
        Text("Casa+", color = Navy, fontSize = 30.sp, fontWeight = FontWeight.Black)
        Text("Cota semanal, lista de compras e gastos da casa", color = Muted, fontSize = 14.sp)

        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White)
                .border(1.dp, Line, RoundedCornerShape(20.dp)).padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(if (running) "Servidor ligado" else "Servidor desligado",
                color = if (running) Color(0xFF3F7A00) else Muted, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            if (running) {
                Text("Peça para o pessoal abrir este endereço no navegador, ligado no mesmo Wi-Fi:", color = Muted, fontSize = 13.sp)
                Text(address ?: "", color = Navy, fontSize = 22.sp, fontWeight = FontWeight.Black)
            } else {
                Text("Ligue para os outros celulares da casa acessarem. Os dados ficam só neste celular.", color = Muted, fontSize = 13.sp)
            }
            error?.let { Text(it, color = Color(0xFFE5334B), fontSize = 13.sp) }
        }

        if (!running) {
            Button(
                onClick = { start() }, modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Green, contentColor = Navy)
            ) { Text("Ligar servidor da casa", fontWeight = FontWeight.Bold) }
        } else {
            Button(
                onClick = {
                    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("http://127.0.0.1:${ServerState.PORT}/")))
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Navy, contentColor = Color.White)
            ) { Text("Abrir painel (administrador)", fontWeight = FontWeight.Bold) }
            OutlinedButton(
                onClick = {
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, "Casa+ — abra no navegador, no mesmo Wi-Fi da casa: $address")
                    }
                    ctx.startActivity(Intent.createChooser(send, "Enviar link"))
                },
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) { Text("Enviar link (WhatsApp…)", color = Navy, fontWeight = FontWeight.Bold) }
            OutlinedButton(onClick = { stop() }, modifier = Modifier.fillMaxWidth()) {
                Text("Desligar servidor", color = Color(0xFFE5334B))
            }
        }

        Spacer(Modifier.weight(1f))
        Text(
            "Dica: deixe este celular carregando e com a economia de bateria desligada para o Casa+, assim o servidor não para.",
            color = Muted, fontSize = 12.sp
        )
        Text("Casa+  •  Converta+  •  Desenvolvido por Jose Brito", color = Muted, fontSize = 11.sp)
    }
}
