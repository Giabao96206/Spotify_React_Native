# Android media playback and experimental Origin Island

## Audit

The app uses Expo SDK 58 (`expo` installed 58.0.25), React Native 0.88.1,
React 19.3, Expo Router with tabs/stack/modal routes, and Zustand persisted via
AsyncStorage. `app/_layout.tsx` mounts one `AudioEngine`. The engine owns one
`expo-audio` 58.0.12 playlist; the existing backend resolves stream URLs.
`Track` supplies title, artist, album, cover URL and fallback duration. Actual
duration/position come from native playback status.

Background playback and lock-screen metadata were already configured. The
existing `withMediaService` plugin fixes the internal/service-controller binder
split and permits external Media3 controllers to discover the playback service.
On a clean prebuild it previously failed when its manifest mod ran before
expo-audio created the service; it now seeds the same service without duplicates.

The existing Media3 player handles headset disconnects; expo-audio's audio-focus
manager handles interruptions and requests focus for system transport controls.
These paths are retained, not replaced. No second playback engine, MediaSession,
foreground service, notification channel, notification listener, root, Shizuku,
package/signature spoofing, or additional permission has been introduced.

## Research and license

No originos-toolkit checkout was found in the inspected workspace, its parent,
or matching temporary directories. This was not a whole-disk search. Reference
checkout was cloned outside the project to the host user's temporary directory:
`C:\Users\PC\AppData\Local\Temp\nightwave-originos-toolkit`.
Revision: `b72f9b9319893a1cc039f07ea91448fe2da31dc2`.

Reviewed sources:

- [README](https://github.com/cameleonnbss/originos-toolkit/blob/b72f9b9319893a1cc039f07ea91448fe2da31dc2/README.md)
- [Origin Island protocol and limitations](https://github.com/cameleonnbss/originos-toolkit/blob/b72f9b9319893a1cc039f07ea91448fe2da31dc2/docs/ORIGINISLAND.md)
- `core/OriginIslandTemplates.kt`, `service/OriginIslandSender.kt`, and the
  protocol assertions in `OriginIslandTest.kt` under
  `app/src/{main,test}/kotlin/dev/cameleonnbss/originostoolkit/`.
- [MIT license](https://github.com/cameleonnbss/originos-toolkit/blob/b72f9b9319893a1cc039f07ea91448fe2da31dc2/LICENSE).

The toolkit is MIT licensed, permitting adaptation with its copyright and
license notice retained. The notice is included in the local module's Android
assets so it is also distributed in APKs. Only notification wire-format fields
and best-effort scene registration were adapted. No toolkit UI, privileged tweak
engine or notification recaster was copied. The toolkit credits CunnyPlayground
by theVakhovskeIsTaken for reverse engineering; that upstream repository could
not be independently fetched through the web tool during this work. No separate
code was copied from it and no claim is made about its license.

Verified in the reference source, **not verified on a vivo renderer**:

| Field | Use |
| --- | --- |
| `notification.superx.operation` | 0 show, 2 graceful unmount hint |
| `notification.superx.showNotify` | true |
| `notification.superx.template` | 1 base card, 2 progress card |
| `notification.superx.scene` | `TRAIN`, the upstream literal; no invented music scene |
| `notification.superx.baseInfos` | title, artist/status, icon |
| `notification.superx.capsule` | state 1, title, icon |
| `notification.superx.infos` | base content or percentage/color/node icons |
| `notification.superx.shortInfos` | compact/expanded content parity |
| `notification.superx.island` | left template 1; right template 2 progress or 4 text/icon |

`setSuperXInfosSceneList(List, List, List, List)` is an OEM hidden method seen in
the reference sender. The integration attempts it once with **this app's own
package**, catches failures, and never bypasses hidden-API restrictions or asks
for privileged access. An invocation succeeding still does not prove rendering.
Vivo can silently ignore any of these fields or reject the caller on a ROM.

## Architecture

`modules/origin-island` is an Android-only local Expo module. It provides:

- `getCapabilities()`: vivo/iQOO hardware candidate detection, OriginOS/support
  reported as `unknown` on candidates and `unsupported` elsewhere. Brand alone
  does not establish OriginOS (a device may run FuntouchOS) or island support.
- `setExperimentalEnabled(boolean)`: persisted opt-out/opt-in. Disable withdraws
  the vendor payload while keeping the standard media notification. Re-enable
  applies on the next playback/metadata event; pause/resume can trigger it.
- `setQueueMetadata()` / `clearQueueMetadata()`: queue metadata for native
  transitions, used by the existing engine. These are not alternative playback
  commands. No unsupported OEM playback or seek API is exposed.

The module depends on the patched expo-audio project. `package.json` explicitly
builds **expo-audio from source** so Expo's precompiled AAR cannot bypass the
patch. The config plugin copies `NightwaveOriginIsland.kt` into expo-audio and
adds small integration hooks. It is version-guarded to 58.0.12 and fails if
expected source anchors change. Review the patch before upgrading expo-audio.

The **existing** `AudioControlsService` builds the **same** MediaStyle
notification with its original session token and transport actions. On vivo/iQOO
candidates only, it also attaches the experimental extras. Other devices retain
the standard notification. Artist/title/cover updates feed the existing session.
Native track transitions use queue metadata even when JS execution is delayed.
Cover changes immediately discard the old bitmap, reject obsolete download
results, and refresh title even when tracks share the same cover URL. Island
icons are limited to 96px to avoid large extra payloads.

Play/pause, seek and track changes update natively. Only while playing on a
candidate with the experiment enabled, a native main-thread callback refreshes
progress every five seconds. It stops on pause, session removal and service
destruction. There is no new JS polling. Duration <= 0 uses the base template;
progress is clamped to 0–100. End-of-queue, explicit stop and session cleanup
send operation 2; cancel/stopForeground remains owned by expo-audio. On abrupt
process termination no code can guarantee a final OEM unmount message.

The protocol does not establish custom island transport buttons. Android
notification, lock-screen and Bluetooth controls use the existing MediaSession;
whether OriginOS exposes them in its own island UI requires device testing.

`audioEngine.stop()` now cancels pending URL loads, stops/clears the native
playlist and media controls, clears queue metadata, and resets playback state.
Clearing the selected track calls it. Playback failure also clears media controls;
cancelling an in-flight load clears its watchdog and stale controls.

## Build and checks

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:player
pnpm test:lyrics
npx expo prebuild --platform android --no-install
npx expo run:android
# Standalone APK through the project's existing EAS profile:
pnpm build:apk
```

Keep generated `android/` and `ios/` ignored, as currently configured. EAS then
runs prebuild and applies the plugin. Native changes require a new native build;
an OTA JS update cannot install this module. Package name remains
`com.nightwave.player`; no signing configuration was added or changed in source.

For just native compilation after prebuild:

```powershell
.\android\gradlew.bat -p android :origin-island:compileDebugKotlin :expo-audio:compileDebugKotlin
```

Prefer an ASCII project path for Android builds on Windows. This workspace path
contains Vietnamese characters: local Expo `fs.cpSync` and Gradle's path check
failed during verification. A temporary, ignored `.expo/prebuild-native.cjs`
worked around the copy issue using recursive file copies and the standard Expo
CLI. A local generated `android.overridePathCheck=true` allowed Gradle to proceed.
Neither workaround changes the EAS/Linux build configuration. Gradle was invoked
directly through Java because the Windows batch wrapper mangled this path.

## Device acceptance tests (not yet executed)

Use a native APK with a reachable API endpoint. The preview profile currently
uses a LAN HTTP API address; the phone must reach that server. Network access is
independent of MediaSession/Origin Island functionality.

| Case | Expected observation |
| --- | --- |
| Foreground | Play/pause/seek and queue navigation still work |
| Home / another app, >5 minutes | Audio continues; one media notification |
| Locked, >5 minutes | Audio continues and lock-screen transport works |
| Notification controls | Previous/play/pause/next update playback and metadata |
| Bluetooth | Play/pause/skip/previous; disconnect and reconnect behavior |
| Call / competing player | Audio-focus interruption, resume according to native policy |
| Auto-next with screen locked | Correct title, artist and new cover without opening app |
| Same-cover tracks / slow cover response | Correct title; old cover cannot overwrite new track |
| Stop / clear selection | Audio stops, notification removed, island withdrawn if honored |
| Last track ends | Island receives end hint; standard replay controls remain |
| Cancel slow URL load | No stale playback or later watchdog error |
| vivo/iQOO OriginOS | Check island setting, rendering, pause/seek/progress/cover/end |
| Non-OriginOS Android | Standard media controls; no superx payload |
| Experiment disabled | Standard media controls retained; vendor payload withdrawn |

Android media-session notifications are exempt from Android 13's notification
runtime-permission requirement. No `POST_NOTIFICATIONS` request was added for
this same MediaStyle notification. The toolkit's **separate ordinary** island
notification asks for that permission, which is a different architecture. It
is unverified whether any given OriginOS build imposes additional island rules;
do not assume that granting a permission guarantees island eligibility.

## Debug

```powershell
adb devices
adb logcat -v time 'NightwaveIsland:I' 'AudioControlsService:V' 'AndroidRuntime:E' '*:S'
adb shell dumpsys media_session
adb shell dumpsys activity services com.nightwave.player
adb shell dumpsys notification --noredact
adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -p com.nightwave.player
```

Search notification output for `com.nightwave.player`, `expo_audio_channel`,
`notification.superx` and `android.mediaSession`. Dumps can contain personal
notification content; inspect locally. Confirm one active playback session and
one playback foreground service. Scene logs say `invoked-unverified` or
`unavailable`, never “supported”. No log message proves that the OEM rendered it.

For a temporary developer probe in app code:

```ts
import { originIsland } from "./modules/origin-island"; // adjust relative path
console.log(originIsland.getCapabilities());
originIsland.setExperimentalEnabled(false); // retain standard media playback
```

See the verification record below for checks actually run. No physical
vivo/iQOO test, island success, Bluetooth test, or EAS build is implied by a
successful TypeScript/native compilation.

## Changed source files

| File | Purpose |
| --- | --- |
| `package.json` | Build patched expo-audio from source on Android |
| `src/services/audio/engine.ts` | Native queue metadata, stop/clear/failure cleanup |
| `plugins/withMediaService.js` | Clean-prebuild service creation and native patch entry point |
| `plugins/origin-island/patchAudio.js` | Version-guarded integration hooks in the existing audio service |
| `plugins/origin-island/NightwaveOriginIsland.kt` | Vendor payload, capability diagnostics, unmount and metadata registry |
| `modules/origin-island/index.ts` | Optional typed JS bridge with unavailable-module fallback |
| `modules/origin-island/expo-module.config.json` | Android Expo autolinking registration |
| `modules/origin-island/android/build.gradle` | Local module and expo-audio project dependency |
| `modules/origin-island/android/.gitignore` | Exclude generated local module build artifacts |
| `modules/origin-island/android/src/main/AndroidManifest.xml` | Empty module manifest; no new permission/service |
| `modules/origin-island/android/src/main/java/com/nightwave/originisland/OriginIslandModule.kt` | Expo Modules API entry points |
| `modules/origin-island/android/src/main/assets/origin-island-NOTICE.txt` | Distributed attribution and MIT license |
| `scripts/verify-player.mjs` | Queue metadata, cleared controls and stop-during-load regression checks |
| `docs/ANDROID-MEDIA-ORIGIN-ISLAND.md` | Audit, protocol, build, debugging and acceptance matrix |

## Verification record — 2026-11-18

- Passed TypeScript (`pnpm typecheck`).
- Passed mocked player regressions (`pnpm test:player`); these do not emulate
  Android MediaSession, Bluetooth, audio focus, OEM rendering or notification UI.
- Passed existing lyric regressions (`pnpm test:lyrics`).
- Passed Android Expo autolinking: `com.nightwave.originisland.OriginIslandModule`.
- Passed prebuild using the local Windows copy workaround described above.
- Inspected generated manifest: one exported `AudioControlsService`, foreground
  type `mediaPlayback`, existing permissions retained; package name unchanged.
- Applied the plugin to pristine Kotlin sources extracted from the installed
  expo-audio sources JAR, applied it a second time, and compared bytes: repeated
  patch is identical; the compiled service matches the freshly patched source.
- Passed Gradle `:origin-island:compileDebugKotlin :expo-audio:compileDebugKotlin`
  with Java 21, Android SDK and fetched React Native/Hermes dependencies.
- Attempted `:app:assembleDebug` for arm64. Full APK packaging failed in existing
  CMake/Ninja configuration (including `react-native-screens`): Ninja mangled
  `Gia Bảo JS` into `Gia B?o JS` and could not enter its working directory.
  This is **not a successful APK build**. Use an ASCII checkout/build directory
  or the existing EAS/Linux build profile, then rerun the device acceptance tests.
- `adb devices -l` returned no devices. All physical-device acceptance rows above
  remain pending, including vivo/iQOO and ordinary Android.
- EAS cloud build has not been submitted.

## Follow-up device build — 2026-11-18

Built the current source in the existing ASCII staging checkout
`D:\nightwave-build-01a1e54b`, preserving its signing keystore. That checkout uses
the same installed Expo/React Native/audio/worklets/reanimated versions as this
workspace. Ran prebuild and the native plugin there, then:

```powershell
java -jar android/gradle/wrapper/gradle-wrapper.jar -p android :app:assembleRelease -PreactNativeArchitectures=arm64-v8a -I D:/nightwave-build-01a1e54b/retry.init.gradle --max-workers=2 --console=plain
```

Build succeeded in 7m 15s. The existing staging init script uses a newer Ninja
and a short build directory for Windows. Release APK was copied back to
`releases/nightwave-1.1.0-origin-island-arm64.apk` (36,636,562 bytes).
SHA-256: `60330a87733456b418c07aa4ab613deb4ddca5e15b6e2e9a952b786e815bc162`.
Inspected ZIP entries: arm64 native library, bundled JS and MIT notice present.
This supersedes the earlier full-APK failure in the accented workspace path.

ADB detected a physical vivo V2425A, Android 17, arm64. Updating the existing app
using `adb install -r` was rejected by the device with
`INSTALL_FAILED_ABORTED: User rejected permissions`; the foreground activity was
vivo account verification. Installation awaits verification/USB-install approval
on the phone. No app was uninstalled and no app data was cleared. Origin Island
rendering and playback acceptance tests remain unverified. The default LAN API
health endpoint `http://192.168.0.45:5555/health` also timed out from the host.

After the user approved retrying the phone prompt, `adb install -r` returned
`Success`. `am start -W` returned `Status: ok`, and Nightwave's MainActivity was
the resumed activity with its process alive. Package update was confirmed;
no fatal error appeared in the inspected startup log. Native diagnostics logged
`Experimental superx: invoked-unverified; rendering support unknown`, confirming
the APK reached the experimental native code on the physical vivo, **not** that
Origin Island rendered. This supersedes the installation block above. App data
was retained; no uninstall/clear-data operation was performed.
