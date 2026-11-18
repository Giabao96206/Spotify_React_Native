const fs = require("fs");
const path = require("path");
const {
  withDangerousMod,
  withAndroidManifest,
  AndroidConfig,
} = require("expo/config-plugins");
function patchAudio(projectRoot) {
  const pkgPath = require.resolve("expo-audio/package.json", {
    paths: [projectRoot],
  });
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (pkg.version !== "58.0.12")
    throw new Error("Review media binder patch for expo-audio " + pkg.version);
  const base = path.join(
    path.dirname(pkgPath),
    "android/src/main/java/expo/modules/audio",
  );
  const connection = path.join(
    base,
    "service/AudioPlaybackServiceConnection.kt",
  );
  let source = fs.readFileSync(connection, "utf8");
  source = source.replace(
    "AudioControlsService::class.java, SERVICE_INTERFACE)",
    'AudioControlsService::class.java, "expo.modules.audio.INTERNAL_BIND")',
  );
  fs.writeFileSync(connection, source);
  const service = path.join(base, "service/AudioControlsService.kt");
  source = fs.readFileSync(service, "utf8");
  const original =
    /override fun onBind\(intent: Intent\?\): IBinder \{\s*super.onBind\(intent\)\s*return binder\s*\}/;
  if (original.test(source))
    source = source.replace(
      original,
      `override fun onBind(intent: Intent?): IBinder? {
    // App-local service connection uses its own binder. System Media3 controllers
    // must receive MediaSessionService's binder, not AudioPlaybackServiceBinder.
    return if (intent?.action == "expo.modules.audio.INTERNAL_BIND") {
      super.onBind(intent)
      binder
    } else {
      super.onBind(intent)
    }
  }`,
    );
  else if (
    !source.includes('intent?.action == "expo.modules.audio.INTERNAL_BIND"')
  )
    throw new Error("Unexpected expo-audio onBind implementation");
  fs.writeFileSync(service, source);
  const playable = path.join(base, "LockScreenPlayable.kt");
  source = fs
    .readFileSync(playable, "utf8")
    .replace(
      "serviceConnection.bindingState == ServiceBindingState.UNBOUND)",
      "serviceConnection.bindingState == ServiceBindingState.UNBOUND || serviceConnection.bindingState == ServiceBindingState.FAILED)",
    );
  fs.writeFileSync(playable, source);
  require("./origin-island/patchAudio")(base);
}
module.exports = (config) => {
  config = withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    let service = app.service?.find(
      (s) =>
        s.$["android:name"] ===
        "expo.modules.audio.service.AudioControlsService",
    );
    // Manifest mods may run before expo-audio on a clean prebuild. Seed the
    // same service; expo-audio preserves existing entries rather than duplicating.
    if (!service) {
      service = {
        $: {
          "android:name": "expo.modules.audio.service.AudioControlsService",
          "android:exported": "true",
          "android:foregroundServiceType": "mediaPlayback",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "androidx.media3.session.MediaSessionService",
                },
              },
            ],
          },
        ],
      };
      (app.service ||= []).push(service);
    }
    service.$["android:exported"] = "true";
    return c;
  });
  return withDangerousMod(config, [
    "android",
    async (c) => {
      patchAudio(c.modRequest.projectRoot);
      return c;
    },
  ]);
};
module.exports.patchAudio = patchAudio;
