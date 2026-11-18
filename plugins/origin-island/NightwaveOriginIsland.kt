package expo.modules.audio.service

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.util.Log
import expo.modules.audio.Metadata
import java.net.URL
import java.lang.ref.WeakReference
import kotlin.math.pow
import kotlin.math.roundToInt

/** Experimental wire format adapted from originos-toolkit (MIT); see THIRD_PARTY_NOTICES. */
object NightwaveOriginIsland {
  private const val TAG = "NightwaveIsland"
  @Volatile private var queue: List<Map<String, String?>> = emptyList()
  @Volatile private var sceneRegistration = "not-attempted"
  private var colorBitmap: WeakReference<Bitmap>? = null
  private var cachedColor = Color.rgb(85, 88, 92)

  private fun artworkColor(bitmap: Bitmap?): Int {
    if (bitmap == null) return Color.rgb(85, 88, 92)
    if (colorBitmap?.get() === bitmap) return cachedColor
    val sample = Bitmap.createScaledBitmap(bitmap, 24, 24, true)
    val sums = DoubleArray(3)
    for (y in 0 until sample.height) for (x in 0 until sample.width) {
      val pixel = sample.getPixel(x, y)
      intArrayOf(Color.red(pixel), Color.green(pixel), Color.blue(pixel)).forEachIndexed { index, byte ->
        val channel = byte / 255.0
        sums[index] += if (channel <= 0.04045) channel / 12.92 else ((channel + 0.055) / 1.055).pow(2.4)
      }
    }
    val channels = sums.map {
      val linear = it / (sample.width * sample.height)
      ((if (linear <= 0.0031308) linear * 12.92 else 1.055 * linear.pow(1.0 / 2.4) - 0.055) * 255).roundToInt().coerceIn(0, 255)
    }
    if (sample !== bitmap) sample.recycle()
    cachedColor = Color.rgb(channels[0], channels[1], channels[2])
    colorBitmap = WeakReference(bitmap)
    Log.i(TAG, "Artwork palette changed: #${Integer.toHexString(cachedColor).takeLast(6)}")
    return cachedColor
  }

  private fun shade(color: Int, factor: Double, white: Double = 0.0): Int = Color.rgb(
    (Color.red(color) * factor + 255 * white).roundToInt().coerceIn(0, 255),
    (Color.green(color) * factor + 255 * white).roundToInt().coerceIn(0, 255),
    (Color.blue(color) * factor + 255 * white).roundToInt().coerceIn(0, 255)
  )

  private fun clock(milliseconds: Long): String {
    val seconds = milliseconds.coerceAtLeast(0) / 1000
    return "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"
  }

  fun isCandidate(): Boolean = listOf(Build.BRAND, Build.MANUFACTURER).any {
    it.equals("vivo", true) || it.equals("iqoo", true)
  }

  fun capabilities(): Map<String, Any> = mapOf(
    "deviceCandidate" to isCandidate(),
    "originOS" to if (isCandidate()) "unknown" else "unsupported",
    "support" to if (isCandidate()) "unknown" else "unsupported",
    "protocol" to "experimental-superx",
    "sceneRegistration" to sceneRegistration
  )

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences("nightwave_island", Context.MODE_PRIVATE)
      .edit().putBoolean("enabled", enabled).apply()
    if (!enabled && isCandidate()) {
      // Remove only our vendor payload; retain MediaStyle, session token and actions.
      runCatching {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.activeNotifications.filter {
          it.notification.extras.containsKey("notification.superx.operation")
        }.forEach { active ->
          val notification = active.notification.clone()
          notification.extras.keySet().toList().filter {
            it.startsWith("notification.superx.")
          }.forEach { notification.extras.remove(it) }
          notification.extras.putInt("notification.superx.operation", 2)
          manager.notify(active.id, notification)
        }
      }.onFailure { Log.w(TAG, "Could not withdraw experimental payload", it) }
    }
  }

  fun enabled(context: Context): Boolean = isCandidate() &&
    context.getSharedPreferences("nightwave_island", Context.MODE_PRIVATE)
      .getBoolean("enabled", true)

  fun setQueueMetadata(value: List<Map<String, String?>>) { queue = value.toList() }

  fun metadataAt(index: Int): Metadata? = queue.getOrNull(index)?.let {
    Metadata(it["title"], it["artist"], it["albumTitle"],
      it["artworkUrl"]?.takeIf(String::isNotBlank)?.let { url ->
        runCatching { URL(url) }.getOrNull()
      })
  }

  // No hidden property reads, spoofed identity, permission bypass or claim of renderer support.
  private fun registerScene(context: Context) {
    if (sceneRegistration != "not-attempted") return
    sceneRegistration = try {
      NotificationManager::class.java.getMethod(
        "setSuperXInfosSceneList", MutableList::class.java, MutableList::class.java,
        MutableList::class.java, MutableList::class.java
      ).invoke(context.getSystemService(Context.NOTIFICATION_SERVICE),
        arrayListOf("TRAIN"), arrayListOf("true"),
        arrayListOf(context.packageName), arrayListOf("true"))
      "invoked-unverified"
    } catch (e: Exception) {
      Log.i(TAG, "Scene registration unavailable: ${e.javaClass.simpleName}")
      "unavailable"
    }
    Log.i(TAG, "Experimental superx: $sceneRegistration; rendering support unknown")
  }

  fun decorate(context: Context, notification: Notification, metadata: Metadata?,
    artwork: Bitmap?, playing: Boolean, position: Long, duration: Long): Notification {
    if (!enabled(context) || metadata == null) return notification
    return try {
      registerScene(context)
      val icon = artwork?.let {
        val scale = minOf(1.0, 96.0 / maxOf(it.width, it.height))
        Icon.createWithBitmap(Bitmap.createScaledBitmap(it,
          maxOf(1, (it.width * scale).toInt()), maxOf(1, (it.height * scale).toInt()), true))
      }
        ?: Icon.createWithResource(context, context.applicationInfo.icon)
      val title = metadata.title.orEmpty()
      val content = if (playing) metadata.artist.orEmpty() else "Tạm dừng · ${metadata.artist.orEmpty()}"
      val sourceColor = artworkColor(artwork)
      val capsuleColor = shade(sourceColor, 0.37)
      val accentColor = shade(sourceColor, 0.45, 0.55)
      val capsuleContent = if (playing && duration > 0) "${clock(position)} / ${clock(duration)}" else content
      notification.color = accentColor
      val extras = Bundle().apply {
        putInt("notification.superx.operation", 0)
        putBoolean("notification.superx.showNotify", true)
        putInt("notification.superx.template", 1)
        putString("notification.superx.scene", "TRAIN")
        putInt("notification.superx.changedRecord", 0)
        putBundle("notification.superx.baseInfos", Bundle().apply {
          putCharSequence("notification.superx.baseInfos.title", title)
          putCharSequence("notification.superx.baseInfos.content", content)
          putParcelable("notification.superx.baseInfos.icon", icon)
        })
        putBundle("notification.superx.capsule", Bundle().apply {
          putInt("notification.superx.capsule.state", 1)
          putCharSequence("notification.superx.capsule.content", title)
          putParcelable("notification.superx.capsule.icon", icon)
        })
        putBundle("notification.superx.infos", Bundle().apply {
          putString("notification.superx.infos.describe", title)
          putString("notification.superx.infos.coreInfo", content)
          putParcelable("notification.superx.infos.image", icon)
        })
        putBundle("notification.superx.shortInfos", Bundle().apply {
          putString("notification.superx.shortInfos.describeShort", title)
          putString("notification.superx.shortInfos.coreInfoShort", content)
          putParcelable("notification.superx.shortInfos.image", icon)
        })
        putBundle("notification.superx.island", Bundle().apply {
          putInt("island.superx.leftTemplate", 1)
          // Template 6 is the documented capsule with an actual background color field.
          putInt("island.superx.rightTemplate", 6)
          putBundle("island.superx.leftInfo", Bundle().apply {
            putString("island.superx.leftInfo.content", title)
            putParcelable("island.superx.leftInfo.icon", icon)
          })
          putBundle("island.superx.rightInfo", Bundle().apply {
            putString("island.superx.rightInfo.capsuleContent", capsuleContent)
            putInt("island.superx.rightInfo.capsuleBgColor", capsuleColor)
          })
        })
      }
      notification.extras.putAll(extras)
      notification
    } catch (e: Exception) {
      Log.w(TAG, "Keep standard media notification", e)
      notification
    }
  }

  fun unmount(context: Context, id: Int) {
    if (!isCandidate()) return
    runCatching {
      val manager = context.getSystemService(NotificationManager::class.java)
      val active = manager.activeNotifications.firstOrNull { it.id == id } ?: return
      val notification = active.notification.clone()
      notification.extras.putInt("notification.superx.operation", 2)
      manager.notify(id, notification)
    }.onFailure { Log.w(TAG, "Unmount hint unavailable", it) }
    // Caller owns cancel / stopForeground; never cancel another media session here.
  }
}
