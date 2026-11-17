# V2: synchronized lyrics and Android media controls

## Device report and evidence

User device: iQOO Neo 10, Android 17, OriginOS 7. Missing media notification is reported in the installed Nightwave APK, not Expo Go. No online device is connected to this workstation: ADB showed only an offline emulator. The attached screenshots show Spotify's OEM media surfaces; they do not establish Nightwave's native session state or manufacturer eligibility.

## Findings and fixes

Installed Expo 58.0.25 / expo-audio 58.0.12 / React Native 0.88.1. Existing AudioPlaylist and root lifetime retained.

1. Every track change called setActiveForLockScreen. In the installed Kotlin implementation, setPlayableOptions releases/recreates the MediaSession, even for the same playlist. The engine now activates once and uses updateLockScreenMetadata on later tracks. Playback exceptions in the media registration path are surfaced independently from audio errors; notification setup cannot abort audio playback.
2. AudioControlsService.onBind returned its app-local AudioPlaybackServiceBinder for all intents. MediaSessionService controllers require the superclass binder for the standard Media3 service action. The config plugin patches internal service connections to use a distinct INTERNAL_BIND action, returns the app binder only for that action, and preserves the superclass binder for system controllers. The service is exported to allow external Media3 discovery. MediaSession/Media3 remains responsible for controller authorization; no overlay, generic notification, competing service or second player is created.
3. A FAILED binding state was not retried by setActiveForLockScreen. The version-guarded plugin includes FAILED in the bind condition.

These are confirmed source-level defects/risks, but the exact on-device cause cannot be conclusively attributed without logcat/dumpsys from the iQOO. A successful native build is not proof the OEM notification issue is resolved.

Plugin plugins/withMediaService.js is pinned to expo-audio 58.0.12 and fails clearly on a different version for review. It runs during Android prebuild and EAS prebuild. Generated dependency Kotlin files are patched deterministically; do not rely on manual node_modules edits alone. Android service declaration remains foregroundServiceType=mediaPlayback, with FOREGROUND_SERVICE and FOREGROUND_SERVICE_MEDIA_PLAYBACK. Exported changes from false to true for system Media3 binding. Android 13+ media session notifications are exempt from the normal POST_NOTIFICATIONS runtime permission change, so no unrelated permission prompt or expo-notifications dependency was added. No setLockScreenOptions method exists on this installed AudioPlaylist type; options are supplied at initial activation using the existing API.

## Lyrics

New src/features/lyrics/model.ts parses backend sentence/word timestamps (milliseconds), LRC timestamps, multiple timestamps per row, offset tags and plain unsynchronized text. Binary search finds the active line. No timing is fabricated for plain lyrics. The API returns structured lyrics rather than flattening them to text.

LyricsPanel has a compact scrollable preview and expandable modal with album backdrop inherited from the player. Inactive lines dim; active line scales/fades with Reanimated. Auto-follow centers using measured row heights; manual drag disables it until Back to current lyrics or tap-to-seek. Long lyrics use FlatList virtualization. Track changes reset active index/follow. Reduced Motion is respected; all audio comes from the existing singleton.

No dependencies added. Modified: app/player.tsx, app.json, src/services/api/client.ts, src/services/audio/engine.ts, src/stores/player.ts, scripts/verify-player.mjs, scripts/verify-api.mjs. Added: plugins/withMediaService.js, src/features/lyrics/model.ts, src/features/lyrics/LyricsPanel.tsx, scripts/verify-lyrics.mjs, this document.

## Build/test

pnpm typecheck
pnpm test:player
node scripts/verify-lyrics.mjs

Native changes require rebuilding the APK or development client. Expo Go cannot validate this config plugin. To test JS/UI via Expo Go (matching SDK 58 binary): pnpm exec expo start --go --lan --clear. For native debugging use a development build, then pnpm exec expo start --dev-client --lan. Background service/notification fixes are only in a native build.

EAS: pnpm dlx eas-cli login; pnpm dlx eas-cli build --platform android --profile preview. Ensure plugins/ is uploaded and android/ is excluded so prebuild applies the patch. Current .env and EAS preview target http://172.26.14.192:5555.

Local Windows: follow BUILD_WINDOWS_VI.md and synchronize plugins as well as app/src/app.json. Apply the plugin via expo prebuild before Gradle, preserve the short path/Ninja workaround. For cached native trees, run node -e "require('./plugins/withMediaService').patchAudio(process.cwd())" in the build copy and ensure AudioControlsService exported=true in its generated manifest. Rebundle after .env changes. Do not use a previous APK to test new native code.

## OriginOS investigation and limits

No documented public OriginOS music-island API allowing arbitrary third-party apps was verified in this research. This is not proof none exists; developer registration/partner documentation may be required. vivo's official OriginOS pages describe feature availability as dependent on app, region, model and system version. MediaSession/notification is the official baseline but cannot guarantee Origin Island selection/allowlisting. No vendor private API or fake Spotify package/brand assets are used.

Official references:
- https://www.vivo.com/en/originos/
- https://www.vivo.com/ae/en/originos
- https://developer.android.com/develop/ui/views/notifications/notification-permission#exemptions
- https://developer.android.com/media/media3/session/background-playback
- https://docs.expo.dev/versions/v58.0.0/sdk/audio/

## iQOO Neo 10 device checklist

Record exact Android build/OriginOS regional build in Settings → About phone. The user-supplied Android 17/OriginOS 7 versions are not independently read from the device.

1. Open backend health on phone, install new native build, start one song while app is foreground. Pull down notification center and separate control center if OriginOS places media there.
2. Check title, artist, album art, elapsed time; pause/resume from system card and verify UI/audio. Next/previous must change song and metadata without duplicate notifications. First/last queue controls may be disabled by native timeline semantics.
3. Background for at least 10 minutes, lock screen, unlock. Recheck progress. Test another audio app, calls and Bluetooth/headphone disconnect; app must not unexpectedly resume.
4. Reconnect Bluetooth, test headset play/pause/next/previous. Test seek on system scrubber if exposed by ROM.
5. Open lyrics, check active line; drag to read distant lyrics (no snap-back); tap Return; tap a timed line, pause/resume, seek backwards and change tracks. Untimed lyrics remain readable without fake highlights.
6. In Settings search Origin Island (Notifications/status bar on supported builds). Enable applicable music/app switch if Nightwave is actually listed. Check app notification/media channel and background battery/autostart settings available on this ROM. Do not claim availability for settings not present. If standard media works and Nightwave isn't supported/listed in Island, record manufacturer limitation separately.
7. Collect diagnostics while actively playing: adb shell getprop ro.product.model; adb shell getprop ro.build.version.release; adb shell getprop ro.vivo.os.version; adb shell dumpsys media_session; adb shell dumpsys activity services com.nightwave.player; adb shell dumpsys notification --noredact; adb logcat -d. Dumps may include personal notification content; inspect locally and redact before sharing.

Hardware checklist remains pending until tested on the actual phone. Native build result will be appended below.

## V2 final artifact and runtime LAN

Native release 1.1.0/versionCode 3 built successfully. Artifact: releases/nightwave-1.1.0-v2-arm64.apk, 36,617,873 bytes. Android apksigner verification passed; aapt confirms package com.nightwave.player, ARM64, minSdk 24. APK JavaScript inspected for default http://192.168.0.45:5555. SHA256 12ECED2501E6CA9BC299141241B610A2056AEA698C52BF9E362E285786FC9973. Signed with existing Android Debug test certificate. Log docs/android-build-v2.log.

Runtime endpoint settings added at Library → Máy chủ nhạc → Kiểm tra và lưu. New src/services/api/server.ts restores saved endpoint from AsyncStorage before requests, validates http/https origins, tests /health with 7-second timeout, and persists only after user validation. API queries are cancelled/reset after endpoint changes. Existing active audio is allowed to continue; future API requests use the new endpoint. No scanning, overlay or backend changes. New src/features/settings/ServerSettings.tsx and scripts/verify-server.mjs; updated library screen and .env/eas default. User-entered endpoint takes priority over the build default.

A phone's Wi-Fi address does not identify a PC backend automatically. Automatic server discovery needs server-advertised mDNS/NSD or another discovery mechanism, not currently exposed by this backend. During Expo development the Metro host can identify the development PC, but that does not generalize to a standalone APK. A stable hostname or DHCP reservation can also avoid repeated IP changes; neither is configured by this app.

Final checks passed: TypeScript strict, playback lifecycle tests, LRC/backend lyrics parsing and binary search tests, runtime endpoint restore/update/validation tests. Native binder patch compiled. Hardware notification visibility and Origin Island still unverified on the iQOO Neo 10.
