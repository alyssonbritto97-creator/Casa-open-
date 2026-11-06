package com.convertamais.casa

import android.content.Context
import fi.iki.elonen.NanoHTTPD
import org.json.JSONArray
import org.json.JSONObject
import java.security.SecureRandom

/**
 * Open House © Jose Brito · Converta+. Todos os direitos reservados.
 * Servidor da casa: roda dentro do celular do administrador e entrega o painel web e a API
 * para os outros celulares da mesma rede Wi-Fi.
 */
class CasaServer(private val ctx: Context, port: Int, private val db: Db) : NanoHTTPD(port) {

    private val tokens = HashSet<String>()
    private var failures = 0
    private var lockedUntil = 0L

    override fun serve(session: IHTTPSession): Response = try {
        route(session)
    } catch (e: Exception) {
        json(Response.Status.INTERNAL_ERROR, JSONObject().put("error", e.message ?: "Erro interno"))
    }

    private fun route(s: IHTTPSession): Response {
        val uri = s.uri
        val method = s.method

        // ----- arquivos do painel -----
        if (method == Method.GET) {
            when (uri) {
                "/", "/index.html" -> return asset("index.html", "text/html; charset=utf-8")
                "/logo.png" -> return asset("logo.png", "image/png")
                "/three/three.module.js" -> return asset("three/three.module.js", "text/javascript; charset=utf-8")
                "/three/three.core.js" -> return asset("three/three.core.js", "text/javascript; charset=utf-8")
                "/three/OrbitControls.js" -> return asset("three/OrbitControls.js", "text/javascript; charset=utf-8")
                "/three/house3d.js" -> return asset("three/house3d.js", "text/javascript; charset=utf-8")
                "/house.jpg" -> {
                    val f = java.io.File(ctx.filesDir, "house.jpg")
                    if (!f.exists()) return json(Response.Status.NOT_FOUND, JSONObject().put("error", "Sem foto"))
                    return newChunkedResponse(Response.Status.OK, "image/jpeg", f.inputStream()).also { it.addHeader("Cache-Control", "no-cache") }
                }
            }
        }
        if (method == Method.GET && (uri == "/next" || uri.startsWith("/next/"))) return nextAsset(uri)
        if (!uri.startsWith("/api/")) return json(Response.Status.NOT_FOUND, JSONObject().put("error", "Não encontrado"))
        val path = uri.removePrefix("/api/").trim('/')
        val parts = path.split('/')

        // ----- leitura (qualquer pessoa da rede) -----
        if (method == Method.GET && path == "state") return json(Response.Status.OK, db.state())
        if (method == Method.GET && path == "info")
            return json(Response.Status.OK, JSONObject().put("address", ServerState.address.value ?: JSONObject.NULL))

        val body = readBody(s)
        val admin = isAdmin(s)

        // ----- PIN: criar (só no celular do administrador) e entrar -----
        if (method == Method.POST && path == "setup") {
            if (!isLoopback(s)) return err(403, "O PIN só pode ser criado no celular do administrador.")
            if (db.hasPin()) return err(400, "O PIN já foi criado.")
            val pin = body.optString("pin")
            if (!Regex("\\d{4,8}").matches(pin)) return err(400, "Use de 4 a 8 números.")
            db.setPin(pin)
            return json(Response.Status.OK, JSONObject().put("token", newToken()))
        }
        if (method == Method.POST && path == "login") {
            val now = System.currentTimeMillis()
            if (now < lockedUntil) return err(429, "Muitas tentativas. Espere um minuto.")
            if (db.checkPin(body.optString("pin"))) {
                failures = 0
                return json(Response.Status.OK, JSONObject().put("token", newToken()))
            }
            failures++
            if (failures >= 5) { lockedUntil = now + 60_000; failures = 0 }
            return err(401, "PIN incorreto.")
        }

        // ----- ações abertas a todos da casa -----
        if (method == Method.POST && path == "items") {
            val name = body.optString("name").trim().take(60)
            if (name.isEmpty()) return err(400, "Digite o nome do item.")
            db.addItem(name, body.optString("qty").trim().take(20), body.optLongOrNull("by"))
            return ok()
        }
        if (method == Method.POST && parts.size == 3 && parts[0] == "items" && parts[2] == "bought") {
            db.markBought(parts[1].toLong(), body.optLongOrNull("by"), body.optBoolean("bought", true))
            return ok()
        }
        if (method == Method.POST && path == "expenses") {
            val amount = body.optLong("amount", 0)
            val member = body.optLongOrNull("member_id") ?: return err(400, "Escolha quem pagou.")
            if (amount <= 0) return err(400, "Digite um valor maior que zero.")
            val kind = body.optString("kind").let { if (it in setOf("compra", "mercado", "energia", "agua", "internet", "aluguel", "gas", "limpeza", "saude", "transporte", "manutencao", "outro")) it else "compra" }
            val date = body.optString("date").let { if (Regex("\\d{4}-\\d{2}-\\d{2}").matches(it)) it else db.state().getString("today") }
            db.addExpense(member, amount, kind, body.optString("note").trim().take(80), date)
            return ok()
        }

        // ----- registros da casa (partes da casa, tarefas, comida, pets, metas, saúde…) -----
        if (parts[0] == "docs") return docsRoute(method, parts, body, admin)

        // ----- ações só do administrador -----
        if (!admin) return err(401, "Entre como administrador.")
        when {
            method == Method.POST && path == "members" -> {
                val name = body.optString("name").trim().take(40)
                if (name.isEmpty()) return err(400, "Digite o nome.")
                db.addMember(name)
            }
            method == Method.DELETE && parts.size == 2 && parts[0] == "members" -> db.removeMember(parts[1].toLong())
            method == Method.POST && path == "members/reorder" -> {
                val arr: JSONArray = body.optJSONArray("ids") ?: JSONArray()
                db.reorder((0 until arr.length()).map { arr.getLong(it) })
            }
            method == Method.POST && path == "settings" -> {
                if (body.has("start_date")) {
                    val sd = body.optString("start_date")
                    if (!Regex("\\d{4}-\\d{2}-\\d{2}").matches(sd)) return err(400, "Data inválida.")
                    db.setSetting("start_date", sd)
                }
                if (body.has("lang")) {
                    val l = body.optString("lang")
                    if (l != "pt" && l != "es") return err(400, "Idioma inválido.")
                    db.setSetting("lang", l)
                }
                if (body.has("house_name")) db.setSetting("house_name", body.optString("house_name").trim().take(40))
                if (body.has("monthly_goal")) {
                    val g = body.optLong("monthly_goal", -1)
                    if (g < 0) return err(400, "Meta inválida.")
                    db.setSetting("monthly_goal", g.toString())
                }
            }
            method == Method.POST && path == "photo" -> {
                val data = body.optString("data").substringAfter("base64,", "")
                val bytes = try { android.util.Base64.decode(data, android.util.Base64.DEFAULT) } catch (e: Exception) { ByteArray(0) }
                if (bytes.isEmpty() || bytes.size > 3_000_000) return err(400, "Imagem inválida ou grande demais.")
                java.io.File(ctx.filesDir, "house.jpg").writeBytes(bytes)
                db.setSetting("photo_v", System.currentTimeMillis().toString())
            }
            method == Method.DELETE && path == "photo" -> {
                java.io.File(ctx.filesDir, "house.jpg").delete()
                db.setSetting("photo_v", "")
            }
            method == Method.POST && path == "menu" -> {
                val day = body.optInt("day", -1)
                val meal = body.optString("meal")
                val dish = body.optString("dish").trim().take(100)
                val note = body.optString("note").trim().take(180)
                if (day !in 0..6 || meal !in setOf("cafe", "almoco", "lanche", "jantar") || dish.isEmpty())
                    return err(400, "Informe um dia, uma refeição e um prato.")
                db.saveMeal(day, meal, dish, note)
            }
            method == Method.DELETE && path == "menu" -> {
                val day = s.parameters["day"]?.firstOrNull()?.toIntOrNull() ?: -1
                val meal = s.parameters["meal"]?.firstOrNull() ?: ""
                if (day !in 0..6 || meal !in setOf("cafe", "almoco", "lanche", "jantar"))
                    return err(400, "Dia ou refeição inválida.")
                db.deleteMeal(day, meal)
            }
            method == Method.POST && path == "overrides" ->
                db.setOverride(body.optString("week_start"), body.optLongOrNull("member_id"))
            method == Method.DELETE && parts.size == 2 && parts[0] == "items" -> db.deleteItem(parts[1].toLong())
            method == Method.DELETE && parts.size == 2 && parts[0] == "expenses" -> db.deleteExpense(parts[1].toLong())
            else -> return err(404, "Ação não encontrada.")
        }
        return ok()
    }

    // ---------- registros livres ----------
    private val openColls = setOf("parts", "fixlog", "chores", "pantry", "shops", "meallog", "cook", "pets", "petcare",
        "goalpay", "future", "health", "kit", "contacts", "billpay", "flags", "water", "vehicles", "vehcare", "aid", "papers", "vendors", "assets", "works", "workcost")
    private val adminColls = setOf("bills", "goals", "budgets", "property")
    private val openDelete = setOf("chores", "pantry", "kit", "health", "contacts", "future", "works", "workcost")

    private fun docsRoute(method: Method, parts: List<String>, body: JSONObject, admin: Boolean): Response {
        val coll = parts.getOrNull(1) ?: return err(404, "Não encontrado")
        if (coll !in openColls && coll !in adminColls) return err(400, "Coleção inválida.")
        if (method == Method.POST && parts.size == 2) {
            if (coll in adminColls && !admin) return err(401, "Entre como administrador.")
            val data = body.optJSONObject("data") ?: return err(400, "Dados ausentes.")
            data.remove("id"); data.remove("key"); data.remove("updated")
            val raw = data.toString()
            if (raw.length > 2500) return err(400, "Texto muito grande.")
            val id = body.optLongOrNull("id")
            val key = if (body.has("key") && !body.isNull("key")) body.optString("key").take(60).ifEmpty { null } else null
            if (id == null && key == null && db.docCount(coll) >= 3000) return err(400, "Limite de registros atingido.")
            val newId = db.saveDoc(coll, id, key, raw)
            return json(Response.Status.OK, JSONObject().put("ok", true).put("id", newId))
        }
        if (method == Method.DELETE && parts.size == 3) {
            if (!(admin || coll in openDelete)) return err(401, "Entre como administrador.")
            db.deleteDoc(coll, parts[2].toLong())
            return ok()
        }
        return err(404, "Ação não encontrada.")
    }

    // ---------- utilidades ----------
    private fun readBody(s: IHTTPSession): JSONObject {
        if (s.method != Method.POST && s.method != Method.PUT) return JSONObject()
        val files = HashMap<String, String>()
        s.parseBody(files)
        val raw = files["postData"] ?: return JSONObject()
        return try { JSONObject(raw) } catch (e: Exception) { JSONObject() }
    }

    private fun JSONObject.optLongOrNull(k: String): Long? =
        if (!has(k) || isNull(k)) null else optLong(k)

    private fun isAdmin(s: IHTTPSession): Boolean {
        val t = s.headers["x-admin"] ?: return false
        return synchronized(tokens) { t in tokens }
    }

    private fun isLoopback(s: IHTTPSession): Boolean {
        val ip = s.remoteIpAddress ?: return false
        return ip.startsWith("127.") || ip == "::1" || ip == "0:0:0:0:0:0:0:1"
    }

    private fun newToken(): String {
        val b = ByteArray(24).also { SecureRandom().nextBytes(it) }
        val t = b.joinToString("") { "%02x".format(it) }
        synchronized(tokens) { tokens.add(t) }
        return t
    }

    // Páginas feitas com Next.js (exportação estática), copiadas para assets/next na compilação.
    private fun nextAsset(uri: String): Response {
        if (uri == "/next") return newFixedLengthResponse(Response.Status.REDIRECT, "text/plain", "").also { it.addHeader("Location", "/next/") }
        var rel = uri.removePrefix("/next/").trim('/')
        if (rel.contains("..")) return json(Response.Status.NOT_FOUND, JSONObject().put("error", "Não encontrado"))
        if (rel.isEmpty()) rel = "index.html" else if (!rel.substringAfterLast('/').contains('.')) rel += "/index.html"
        val mime = when (rel.substringAfterLast('.').lowercase()) {
            "html" -> "text/html; charset=utf-8"
            "js" -> "application/javascript; charset=utf-8"
            "css" -> "text/css; charset=utf-8"
            "json" -> "application/json; charset=utf-8"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "txt" -> "text/plain; charset=utf-8"
            else -> "application/octet-stream"
        }
        return try { asset("next/$rel", mime) } catch (e: java.io.IOException) {
            json(Response.Status.NOT_FOUND, JSONObject().put("error", "As páginas Next.js ainda não foram compiladas neste APK."))
        }
    }

    private fun asset(name: String, mime: String): Response {
        val stream = ctx.assets.open(name)
        return newChunkedResponse(Response.Status.OK, mime, stream).also { it.addHeader("Cache-Control", "no-cache") }
    }

    private fun ok() = json(Response.Status.OK, JSONObject().put("ok", true))

    private fun err(code: Int, msg: String): Response {
        val status = when (code) {
            400 -> Response.Status.BAD_REQUEST
            401 -> Response.Status.UNAUTHORIZED
            403 -> Response.Status.FORBIDDEN
            404 -> Response.Status.NOT_FOUND
            429 -> Response.Status.lookup(429) ?: Response.Status.BAD_REQUEST
            else -> Response.Status.INTERNAL_ERROR
        }
        return json(status, JSONObject().put("error", msg))
    }

    private fun json(status: Response.IStatus, obj: JSONObject): Response =
        newFixedLengthResponse(status, "application/json; charset=utf-8", obj.toString()).also {
            it.addHeader("Cache-Control", "no-store")
        }
}
