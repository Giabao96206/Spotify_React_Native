# Backend audit and implementation evidence

## Existing source

Inspected mp3-api/src/index.ts, dist/index.js (the runtime imported by server.js), server.js, public/index.html, package.json, tsconfig.json and README.md before integration. Backend files were not edited.

Express 5.1, Axios 0.24, CommonJS HTTP server; ZingMp3 TypeScript library compiled to dist. PORT is configurable, default 5555. app.listen(PORT) binds the wildcard interface. LAN device access still depends on Wi-Fi routing and Windows Firewall; an offline emulator cannot confirm device connectivity.

## Observed contract

All data routes forward upstream JSON unchanged. Successful live calls return { err: 0, msg: 'Success', data: ... }. Nonzero err can arrive with HTTP 200, so the client rejects these as errors.

| Route | Actual data shape / use |
| --- | --- |
| /health | { ok: true } |
| /api/home | data.items sections, nested items; quick-play playlists can use id, other playlist cards encodeId |
| /api/search?q= | data.top, artists, songs, videos, playlists, counter, sectionId; songs include encodeId, artistsNames, thumbnailM, duration, streamingStatus |
| /api/chart-home | data.RTChart.items, newRelease, weekChart |
| /api/top100 | Existing route; not needed by current home, which uses chart-home |
| /api/detail-playlist?id= | data.title, thumbnailM, song.items |
| /api/song?id= | data['128'] is the stream URL; validate http/https and reject VIP/non-URL values |
| /api/song/stream?id=&quality= | Existing 302 redirect route. Client resolves JSON instead so it can reject unavailable source values before playback |
| /api/info-song?id= | Existing source metadata route; catalog metadata is sufficient for current player |
| /api/lyric?id= | data.sentences[].words[].data; rendered as plain lyric lines |
| /api/artist?name= | Existing route, used by artist result/detail screen |
| /api/artist-songs?id=&page=&count= | Existing route; artist sections currently supply songs |
| /api/list-mv, /api/category-mv, /api/video | Existing video routes; outside audio player scope |

The live verification script checks search, home, chart, playlist, lyrics and audio content type without saving signed audio URLs. Initial sandboxed server requests failed with EACCES; restarting the same server outside restricted networking produced successful upstream responses. The original library also leaves pending promises on some cookie/network errors. Client request timeouts bound that failure without modifying backend behavior.

## Audio design

One native Expo AudioPlaylist is created in the root effect and destroyed on cleanup. A cancellation token plus generation counter prevents old stream resolutions from replacing a new selection. A maximum of four stream resolutions run concurrently; unavailable songs are omitted from native playback, selected unavailable songs show an error. Signed URLs exist only in native queue memory. Restored metadata is resolved again without autoplay.

Native playlist transport handles notification next/previous and auto-next; trackChanged mirrors the native selection into the Zustand UI and republishes metadata. Repeat maps to native none/all/single. A bounded load watchdog presents an error rather than looping retries. Audio session uses doNotMix; hardware interruption behavior needs validation.

## Verification limits

TypeScript and Metro Android export are compilation checks, not proof of on-device playback. Prebuild confirms the generated AudioControlsService and foreground-service declarations. Live API verification confirms a reachable audio resource, not full native audio focus behavior or source licensing beyond the backend's access decisions.

An emulator was listed as offline during development. EAS whoami returned Not logged in. A local Gradle release APK build was attempted using the installed SDK and Android Studio JBR; see final delivery for its result. Physical-device, headphone, lock-screen, background duration and OEM UI tests remain pending.

## Remaining refinements

- A continuous shared-element mini/full morph (current implementation uses a modal transition and artwork fade).
- Separate album result presentation (upstream search currently provides songs, artists and playlists).
- Live frequency analysis is intentionally absent: equalizer bars communicate playing status only.
- Volume/output routing uses system controls; no fake output-device selector.
- Track context menus use native Android alert choices. Playlist creation is local; server has no write route.
- Benchmark performance on midrange hardware and test queue gestures with long lists.

## Automated playback verification

node scripts/verify-player.mjs exercises the real store and engine against an in-memory storage/native-audio boundary. It passes single-instance creation, silent restoration, metadata changes on transport, next/previous, seeking, pause, cleanup and a stale-stream-resolution race. This validates orchestration and does not replace native hardware tests.

Final Android Metro export passed (3924 modules). TypeScript strict compilation passed.

## Native APK build result — 17 November 2026

No APK was produced. Android prebuild and JavaScript bundling passed. Local Gradle release builds were attempted with Android Studio JBR and Android SDK 37. The original Vietnamese path was rejected by AGP. An ASCII build copy then hit CMake/Ninja regeneration failures under its long path. A short copy at D:/nightwave-build-01a1e54b passed that stage, but subsequent packaging attempts failed deleting generated sourcemap, Screens CMake logs, and finally Safe Area Context javac output directories. The final log is docs/android-build.log. This is an unresolved local filesystem/build-tool blocker, not a successful APK build. EAS authentication is unavailable (whoami: Not logged in).

The configured emulator was started headless but remained offline; no native UI, audio or hardware test was completed. Temporary build copies remain at D:/nightwave-build-01a1e54b and C:/Users/PC/.codex/visualizations/2026/11/16/01a1e54b-6e8a-7ae1-9d11-613f6b0f910d/nightwave. They contain generated dependencies/build outputs only; canonical client source is D:/Gia Bảo JS/AppMusicSpotify.

## APK retry succeeded — 17 November 2026

Supersedes the earlier failed build status: BUILD SUCCESSFUL in 9m 48s, 959 actionable tasks. File: releases/nightwave-1.0.0-arm64.apk, 36,601,173 bytes, SHA256 E629FB852B5F2D6F1EF7F447E4C04319A901957758F6684127A421AB889AD8F9. Verified APK Signature Scheme v2 with Android apksigner. Certificate: Android Debug (test installation only, not a store signing identity). aapt confirms com.nightwave.player, version 1.0.0/code 1, minSdk 24, targetSdk 36, ABI arm64-v8a.

Build fixes: use D:/nightwave-build-01a1e54b ASCII build copy, redirect module build outputs under android/outputs-retry3 while keeping root autolinking location; set CMake buildStagingDirectory under android/cxx; use standalone Ninja 1.13.2 downloaded from the official ninja-build release (SDK bundled Ninja 1.10.2 cannot handle the generated paths); synchronize Safe Area codegen headers into its hardcoded android/build/generated/source/codegen location. No app feature code or backend source needed modification for this retry. Saved Gradle init script is specific to this build copy. Log: docs/android-build-success.log.

No device installation/hardware tests completed.

## LAN APK rebuild

Version 1.0.1/code 2, backend http://172.26.14.192:5555. Health returned ok. Explicitly regenerated createBundleReleaseJsAndAssets with --rerun-tasks because Gradle reused the old embedded IP after editing .env. Final assembleRelease succeeded and APK signature verified. Inspected assets/index.android.bundle inside the APK: new LAN present, old LAN absent. Artifact releases/nightwave-1.0.1-arm64-lan.apk, 36,601,181 bytes. Build instructions: docs/BUILD_WINDOWS_VI.md.
