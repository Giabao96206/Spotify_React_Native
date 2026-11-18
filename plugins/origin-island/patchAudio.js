const fs = require("fs");
const path = require("path");

function replaceOnce(source, before, after) {
  if (!source.includes(before))
    throw new Error(
      "Review Nightwave native patch: missing " + before.slice(0, 90),
    );
  return source.replace(before, after);
}

module.exports = function patchOriginIsland(base) {
  const target = path.join(base, "service/AudioControlsService.kt");
  let source = fs.readFileSync(target, "utf8");
  if (!source.includes("// Nightwave native metadata and island integration")) {
    source = replaceOnce(
      source,
      "  private var weakContext:",
      `  // Nightwave native metadata and island integration
  private val islandHandler = android.os.Handler(android.os.Looper.getMainLooper())
  private val islandProgress = object : Runnable {
    override fun run() {
      val player = currentPlayable?.player ?: return
      if (!player.isPlaying || !NightwaveOriginIsland.enabled(this@AudioControlsService)) return
      postOrStartForegroundNotification(startInForeground = false)
      islandHandler.postDelayed(this, 5000)
    }
  }

  private fun refreshIslandProgress() {
    islandHandler.removeCallbacks(islandProgress)
    if (currentPlayable?.player?.isPlaying == true && NightwaveOriginIsland.enabled(this)) {
      islandHandler.postDelayed(islandProgress, 5000)
    }
  }

  private var weakContext:`,
    );
    source = replaceOnce(
      source,
      "    return builder.build()\n  }\n\n  private fun skipBackIcon",
      `    return NightwaveOriginIsland.decorate(this, builder.build(), currentMetadata,
      currentArtwork, session.player.isPlaying, session.player.currentPosition, session.player.duration).also {
        if (session.player.playbackState == Player.STATE_ENDED && it.extras.containsKey("notification.superx.operation")) {
          it.extras.putInt("notification.superx.operation", 2)
        }
      }
  }

  private fun skipBackIcon`,
    );
    source = replaceOnce(
      source,
      "    updateArtwork(metadata)\n  }",
      `    updateArtwork(metadata)
    postOrStartForegroundNotification(startInForeground = false)
  }`,
    );
    source = replaceOnce(
      source,
      "  private fun clearSessionInternal() {",
      `  private fun clearSessionInternal() {
    NightwaveOriginIsland.unmount(this, notificationId)`,
    );
    source = replaceOnce(
      source,
      "  private fun hideNotification() {",
      `  private fun hideNotification() {
    NightwaveOriginIsland.unmount(this, notificationId)`,
    );
    source = replaceOnce(
      source,
      "  override fun onDestroy() {",
      `  override fun onDestroy() {
    NightwaveOriginIsland.unmount(this, notificationId)`,
    );
    source = replaceOnce(
      source,
      "      override fun onIsPlayingChanged(isPlaying: Boolean) {",
      `      override fun onPositionDiscontinuity(
        oldPosition: Player.PositionInfo, newPosition: Player.PositionInfo, reason: Int
      ) {
        postOrStartForegroundNotification(startInForeground = false)
      }

      override fun onMediaItemTransition(item: androidx.media3.common.MediaItem?, reason: Int) {
        NightwaveOriginIsland.metadataAt(playable.player.currentMediaItemIndex)?.let {
          updateMetadataInternal(playable, it)
        }
      }

      override fun onIsPlayingChanged(isPlaying: Boolean) {
        refreshIslandProgress()`,
    );
    source = replaceOnce(
      source,
      "    playable.player.addListener(listener)",
      `    playable.player.addListener(listener)
    refreshIslandProgress()`,
    );
    source = replaceOnce(
      source,
      "  private fun removePlayerListener() {",
      `  private fun removePlayerListener() {
    islandHandler.removeCallbacks(islandProgress)`,
    );
    // A newly selected cover must never reuse the previous track's cached bitmap.
    source = replaceOnce(
      source,
      "      currentArtworkUrl = url\n      artworkLoadJob?.cancel()",
      `      currentArtworkUrl = url
      currentArtwork = null
      artworkLoadJob?.cancel()`,
    );
    source = replaceOnce(
      source,
      "      artworkLoadJob = scope.launch {",
      `      if (postArtworkRefresh) postOrStartForegroundNotification(startInForeground = false)
      artworkLoadJob = scope.launch {`,
    );
    source = replaceOnce(
      source,
      "private fun loadArtworkFromUrl(url: URL, callback:",
      "private fun loadArtworkFromUrl(url: URL, postArtworkRefresh: Boolean, callback:",
    );
    source = replaceOnce(
      source,
      "    loadArtworkFromUrl(artworkUrl) { bitmap ->",
      "    loadArtworkFromUrl(artworkUrl, postUpdate) { bitmap ->",
    );
    source = replaceOnce(
      source,
      "          if (isActive) {\n            callback(bitmap)",
      "          if (isActive && url == currentArtworkUrl) {\n            callback(bitmap)",
    );
    fs.writeFileSync(target, source);
  }
  fs.copyFileSync(
    path.join(__dirname, "NightwaveOriginIsland.kt"),
    path.join(base, "service/NightwaveOriginIsland.kt"),
  );
};
