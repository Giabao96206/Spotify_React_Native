package com.nightwave.originisland

import expo.modules.audio.service.NightwaveOriginIsland
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Playback and notifications remain owned by expo-audio, never by this module. */
class OriginIslandModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OriginIsland")
    Function("getCapabilities") { NightwaveOriginIsland.capabilities() }
    Function("setExperimentalEnabled") { enabled: Boolean ->
      appContext.reactContext?.let { NightwaveOriginIsland.setEnabled(it, enabled) }
    }
    Function("setQueueMetadata") { queue: List<Map<String, String?>> ->
      NightwaveOriginIsland.setQueueMetadata(queue)
    }
    Function("clearQueueMetadata") { NightwaveOriginIsland.setQueueMetadata(emptyList()) }
  }
}
