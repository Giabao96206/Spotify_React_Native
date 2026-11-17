# Nightwave — Expo Android music player

Ứng dụng Expo SDK 58 / React Native / TypeScript strict, tái sử dụng backend trong mp3-api. Không thay đổi backend; không có dữ liệu nhạc giả trong giao diện.

## Chạy ứng dụng

Cần Node.js và pnpm. Backend và điện thoại phải truy cập được cùng mạng.

1. Trong mp3-api: npm install và npm start (Express, cổng 5555).
2. Sao chép .env.example thành .env, đặt EXPO_PUBLIC_API_BASE_URL bằng IP LAN của máy chạy backend. .env hiện tại được đặt theo địa chỉ LAN phát hiện trên máy này: http://172.26.14.192:5555. Đổi lại nếu mạng thay đổi. Android emulator thường dùng http://10.0.2.2:5555. Không dùng localhost trên điện thoại.
3. Tại thư mục gốc: pnpm install, sau đó pnpm start.
4. Kiểm thử native bằng development build: pnpm exec expo run:android. Expo Go không phải môi trường xác nhận background/notification.

## Đã triển khai

- Home dùng catalog thật, chart, playlist; tìm kiếm debounce 350 ms, hủy request và timeout 12 giây.
- Tab Home / Search / Library, mini-player xuyên tab; full player, lyrics, artwork nền mờ, artwork transition và breathing motion.
- Một Expo AudioPlaylist duy nhất ở root; queue native hỗ trợ next/previous qua MediaSession, seek, repeat, shuffle, auto-next. URL nguồn được xác thực qua /api/song trước khi đưa vào queue và không được lưu xuống thiết bị.
- Queue có drag bằng long press, swipe để bỏ bài và nút sắp xếp cho accessibility.
- Favorites, playlist cục bộ, lịch sử tìm kiếm/nghe và queue qua Zustand + AsyncStorage. Khôi phục queue không tự phát.
- Native background session, metadata, lock-screen/notification transport và foreground media service thông qua expo-audio.
- Reduced Motion và AppState dừng animation khi app ở nền. Seek chỉ gửi khi thả slider. TrackRow memoized; màn hình chọn selector để tránh render theo progress; AsyncStorage bỏ qua ghi trùng.
- Adaptive icon, splash, Android package com.nightwave.player, EAS development APK và preview APK profiles.

## Kiểm tra

- pnpm typecheck
- pnpm verify:api (cần backend đang chạy; địa chỉ test từ EXPO_PUBLIC_API_BASE_URL, mặc định loopback chỉ trong script kiểm thử trên PC).
- pnpm exec expo export --platform android
- pnpm exec expo prebuild --platform android --no-install
- pnpm exec eas build --platform android --profile preview (cần EAS CLI và đăng nhập tài khoản Expo).

Kết quả API thật nằm ở docs/api-verification.json. Audit và giới hạn kiểm thử nằm ở docs/IMPLEMENTATION.md.

## Giới hạn cần kiểm thử thực tế

Chưa xác nhận 60 FPS, audio focus, nút tai nghe, Bluetooth, khóa màn hình, background lâu dài và Samsung/Xiaomi/OPPO OEM media pill trên thiết bị thật. Không tuyên bố hỗ trợ Dynamic Island/Now Bar toàn bộ Android. Các hãng quyết định giao diện và whitelist; ứng dụng dùng MediaSession chính thức, không quyền overlay/private API.

Animation mini → full dùng modal navigation và artwork fade; chưa phải shared-element morph. Không có download/offline hoặc server playlist write API. Playlist do người dùng tạo được lưu cục bộ. Chưa có tài khoản hoặc đồng bộ thư viện lên server.

Các stream được backend cho phép mới được đưa vào queue; VIP/URL không hợp lệ không được phát. Khi URL hết hạn, người dùng có thể nhấn Play để lấy lại; không retry vô hạn. Quyền truy cập được backend quyết định, client không vượt DRM/authorization.

Hướng dẫn build Windows chi tiết: [docs/BUILD_WINDOWS_VI.md](docs/BUILD_WINDOWS_VI.md).

## APK đã build thành công

Bản cài: releases/nightwave-1.0.1-arm64-lan.apk (36.601.181 bytes). Android 7.0+ (min SDK 24), ARM64, package com.nightwave.player, version 1.0.1. Gradle assembleRelease thành công; chữ ký APK v2 đã xác minh. Bản cài thử dùng chứng chỉ Android Debug mặc định; chưa phải bản ký để phát hành Play Store.

Backend được nhúng lúc build: http://172.26.14.192:5555. Điện thoại cần truy cập được địa chỉ này trên cùng mạng và backend phải đang chạy.

Log thành công: docs/android-build-success.log. Workaround Windows được lưu tại scripts/windows-build.init.gradle: build copy đường dẫn ASCII ngắn, output Gradle mới, CMake staging ngắn và Ninja 1.13.2 hỗ trợ đường dẫn dài.

Chưa có kiểm thử cài/chạy trên thiết bị online hoặc xác nhận Bluetooth, khóa màn hình/OEM media UI.

## V2 mới nhất: không cần build lại khi đổi LAN

APK: releases/nightwave-1.1.0-v2-arm64.apk, versionCode 3. Mặc định http://192.168.0.45:5555. Trong Library → Máy chủ nhạc, nhập địa chỉ mới và nhấn Kiểm tra và lưu. App kiểm tra /health rồi ghi nhớ địa chỉ trên điện thoại; các request tiếp theo dùng địa chỉ mới. Bài đang phát không bị ngắt. Không dùng bản APK cũ để thử tính năng này.

Bản V2 gồm lyrics đồng bộ và sửa native MediaSession; mô tả, danh sách file và checklist iQOO: docs/V2_MEDIA_LYRICS.md. Không có dependency mới. Notification và Origin Island cần kiểm tra trên điện thoại thật.

## Clone source từ GitHub

Backend được giữ dưới dạng submodule từ repository gốc, cố định tại commit đã dùng để kiểm thử. Clone đầy đủ bằng:

```powershell
git clone --recurse-submodules https://github.com/Giabao96206/Spotify_React_Native.git
cd Spotify_React_Native
pnpm install
Copy-Item .env.example .env
```

Nếu đã clone mà thiếu backend: `git submodule update --init --recursive`.
Trong `mp3-api`, chạy `npm install` rồi `npm start`. Native project được sinh từ app.json/config plugins; node_modules, .env, android/, ios/, APK và log không được lưu vào Git. Chỉnh .env theo địa chỉ backend hoặc đổi ngay trong Library → Máy chủ nhạc.
