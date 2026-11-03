package com.convertamais.casa

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Banco de dados da casa. Fica só no celular do administrador. */
class Db(ctx: Context) : SQLiteOpenHelper(ctx, "casa.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE members(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, position INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1)")
        db.execSQL("CREATE TABLE items(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, qty TEXT, status INTEGER NOT NULL DEFAULT 0, added_by INTEGER, bought_by INTEGER, created INTEGER NOT NULL, bought_at INTEGER)")
        db.execSQL("CREATE TABLE expenses(id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL, amount INTEGER NOT NULL, kind TEXT NOT NULL, note TEXT, date TEXT NOT NULL, created INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE settings(k TEXT PRIMARY KEY, v TEXT)")
        db.execSQL("CREATE TABLE overrides(week_start TEXT PRIMARY KEY, member_id INTEGER NOT NULL)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}

    // ---------- estado completo (o painel web lê isto) ----------
    @Synchronized
    fun state(): JSONObject {
        val d = readableDatabase
        val members = JSONArray()
        d.rawQuery("SELECT id,name,position,active FROM members ORDER BY position,id", null).use { c ->
            while (c.moveToNext()) members.put(
                JSONObject().put("id", c.getLong(0)).put("name", c.getString(1)).put("position", c.getInt(2)).put("active", c.getInt(3) == 1)
            )
        }
        val items = JSONArray()
        d.rawQuery("SELECT id,name,qty,status,added_by,bought_by,created,bought_at FROM items ORDER BY status ASC, created DESC LIMIT 400", null).use { c ->
            while (c.moveToNext()) items.put(
                JSONObject().put("id", c.getLong(0)).put("name", c.getString(1)).put("qty", c.getString(2) ?: "")
                    .put("bought", c.getInt(3) == 1).put("added_by", if (c.isNull(4)) JSONObject.NULL else c.getLong(4))
                    .put("bought_by", if (c.isNull(5)) JSONObject.NULL else c.getLong(5))
                    .put("created", c.getLong(6)).put("bought_at", if (c.isNull(7)) JSONObject.NULL else c.getLong(7))
            )
        }
        val expenses = JSONArray()
        d.rawQuery("SELECT id,member_id,amount,kind,note,date,created FROM expenses ORDER BY date DESC, id DESC LIMIT 2000", null).use { c ->
            while (c.moveToNext()) expenses.put(
                JSONObject().put("id", c.getLong(0)).put("member_id", c.getLong(1)).put("amount", c.getLong(2))
                    .put("kind", c.getString(3)).put("note", c.getString(4) ?: "").put("date", c.getString(5)).put("created", c.getLong(6))
            )
        }
        val settings = JSONObject()
        d.rawQuery("SELECT k,v FROM settings WHERE k <> 'pin_hash' AND k <> 'pin_salt'", null).use { c ->
            while (c.moveToNext()) settings.put(c.getString(0), c.getString(1))
        }
        val overrides = JSONObject()
        d.rawQuery("SELECT week_start,member_id FROM overrides", null).use { c ->
            while (c.moveToNext()) overrides.put(c.getString(0), c.getLong(1))
        }
        return JSONObject().put("pinSet", hasPin()).put("members", members).put("items", items)
            .put("expenses", expenses).put("settings", settings).put("overrides", overrides)
            .put("today", SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()))
    }

    // ---------- PIN do administrador ----------
    @Synchronized fun hasPin(): Boolean = getSetting("pin_hash") != null

    @Synchronized fun setPin(pin: String) {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
        setSetting("pin_salt", salt)
        setSetting("pin_hash", hash(salt, pin))
    }

    @Synchronized fun checkPin(pin: String): Boolean {
        val salt = getSetting("pin_salt") ?: return false
        return hash(salt, pin) == getSetting("pin_hash")
    }

    private fun hash(salt: String, pin: String): String =
        MessageDigest.getInstance("SHA-256").digest((salt + pin).toByteArray()).joinToString("") { "%02x".format(it) }

    // ---------- configurações ----------
    @Synchronized fun getSetting(k: String): String? =
        readableDatabase.rawQuery("SELECT v FROM settings WHERE k=?", arrayOf(k)).use { if (it.moveToFirst()) it.getString(0) else null }

    @Synchronized fun setSetting(k: String, v: String) {
        writableDatabase.execSQL("INSERT OR REPLACE INTO settings(k,v) VALUES(?,?)", arrayOf(k, v))
    }

    // ---------- pessoas ----------
    @Synchronized fun addMember(name: String): Long {
        val d = writableDatabase
        val pos = d.rawQuery("SELECT COALESCE(MAX(position),0)+1 FROM members", null).use { it.moveToFirst(); it.getInt(0) }
        return d.insert("members", null, ContentValues().apply { put("name", name); put("position", pos); put("active", 1) })
    }

    @Synchronized fun removeMember(id: Long) {
        writableDatabase.execSQL("UPDATE members SET active=0 WHERE id=?", arrayOf(id))
    }

    @Synchronized fun reorder(ids: List<Long>) {
        val d = writableDatabase
        d.beginTransaction()
        try {
            ids.forEachIndexed { i, id -> d.execSQL("UPDATE members SET position=? WHERE id=?", arrayOf(i + 1, id)) }
            d.setTransactionSuccessful()
        } finally {
            d.endTransaction()
        }
    }

    // ---------- lista do que falta ----------
    @Synchronized fun addItem(name: String, qty: String, by: Long?): Long =
        writableDatabase.insert("items", null, ContentValues().apply {
            put("name", name); put("qty", qty); put("status", 0)
            if (by != null) put("added_by", by)
            put("created", System.currentTimeMillis())
        })

    @Synchronized fun markBought(id: Long, by: Long?, bought: Boolean) {
        writableDatabase.execSQL(
            "UPDATE items SET status=?, bought_by=?, bought_at=? WHERE id=?",
            arrayOf<Any?>(if (bought) 1 else 0, if (bought) by else null, if (bought) System.currentTimeMillis() else null, id)
        )
    }

    @Synchronized fun deleteItem(id: Long) {
        writableDatabase.execSQL("DELETE FROM items WHERE id=?", arrayOf(id))
    }

    // ---------- gastos ----------
    @Synchronized fun addExpense(memberId: Long, amount: Long, kind: String, note: String, date: String): Long =
        writableDatabase.insert("expenses", null, ContentValues().apply {
            put("member_id", memberId); put("amount", amount); put("kind", kind); put("note", note); put("date", date)
            put("created", System.currentTimeMillis())
        })

    @Synchronized fun deleteExpense(id: Long) {
        writableDatabase.execSQL("DELETE FROM expenses WHERE id=?", arrayOf(id))
    }

    // ---------- troca de quem compra numa semana ----------
    @Synchronized fun setOverride(weekStart: String, memberId: Long?) {
        if (memberId == null) writableDatabase.execSQL("DELETE FROM overrides WHERE week_start=?", arrayOf(weekStart))
        else writableDatabase.execSQL("INSERT OR REPLACE INTO overrides(week_start,member_id) VALUES(?,?)", arrayOf(weekStart, memberId))
    }
}
