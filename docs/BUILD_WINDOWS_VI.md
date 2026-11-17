# Build Nightwave trên Windows

## APK hiện tại

- Phiên bản 1.0.1, versionCode 2, ARM64, Android 7.0 trở lên.
- Backend: http://172.26.14.192:5555
- File: releases/nightwave-1.0.1-arm64-lan.apk
- Điện thoại phải truy cập được http://172.26.14.192:5555/health bằng trình duyệt. Kết quả đúng là {"ok":true}.
- Backend phải đang chạy và Windows Firewall phải cho phép kết nối vào TCP 5555 trên mạng riêng. Không cần mở cổng router ra Internet.
- APK dùng chứng chỉ debug để cài thử. Không phải khóa ký phát hành Play Store.

## Cách 1 — build lại ngay trên máy này bằng cache đã chạy thành công

Mở PowerShell. Cần Node.js trong PATH, Java từ Android Studio và Android SDK.

```powershell
Set-Location 'D:\Gia Bảo JS\AppMusicSpotify'
$apiUrl = 'http://172.26.14.192:5555'
Set-Content -LiteralPath .env -Value "EXPO_PUBLIC_API_BASE_URL=$apiUrl"
Copy-Item -LiteralPath .env -Destination 'D:\nightwave-build-01a1e54b\.env' -Force

$env:EXPO_PUBLIC_API_BASE_URL = $apiUrl
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
Set-Location 'D:\nightwave-build-01a1e54b\android'
.\gradlew.bat :app:createBundleReleaseJsAndAssets --rerun-tasks '-PreactNativeArchitectures=arm64-v8a' '-Dorg.gradle.vfs.watch=false' '-Dorg.gradle.parallel=false' --max-workers=2 --no-daemon --console=plain -I ..\retry.init.gradle
.\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a' '-Dorg.gradle.vfs.watch=false' '-Dorg.gradle.parallel=false' --max-workers=2 --no-daemon --console=plain -I ..\retry.init.gradle
```

Nếu không có Node.js trong PATH, cài Node.js LTS trước hoặc thêm đường dẫn Node đang dùng. Lần build của Codex sử dụng Node đi kèm runtime ứng dụng, không phải Node được cài toàn hệ thống.

APK đầu ra:

```text
D:\nightwave-build-01a1e54b\android\outputs-retry3\_app\outputs\apk\release\app-release.apk
```

Đổi IP phải build lại vì EXPO_PUBLIC_API_BASE_URL được nhúng vào JavaScript bundle lúc build. Chỉ sửa .env trên PC không làm thay đổi APK đã cài.

### Nếu có sửa source

Đồng bộ trước khi chạy Gradle:

```powershell
$sourceRoot = 'D:\Gia Bảo JS\AppMusicSpotify'
$buildRoot = 'D:\nightwave-build-01a1e54b'
foreach ($folder in @('app', 'src')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $folder) -Destination $buildRoot -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $sourceRoot 'app.json') -Destination $buildRoot -Force
```

Copy-Item không xóa file đã xóa ở source; nếu đổi cấu trúc route, đồng bộ file xóa thủ công trong bản build tạm. Nếu thay dependency hoặc config plugin, chạy pnpm install và pnpm exec expo prebuild --platform android --no-install tại bản build tạm trước. Prebuild có thể tái sinh native files; kiểm tra versionName/versionCode trong android/app/build.gradle.

## Cách 2 — EAS Build (không phụ thuộc bộ công cụ native Windows)

Cần tài khoản Expo, Internet và Node.js. Source được upload lên dịch vụ build Expo.

```powershell
Set-Location 'D:\Gia Bảo JS\AppMusicSpotify'
npm install -g pnpm
pnpm install
pnpm dlx eas-cli login
pnpm dlx eas-cli build:configure
pnpm dlx eas-cli build --platform android --profile preview
```

Trong eas.json, build.preview.env.EXPO_PUBLIC_API_BASE_URL phải là http://172.26.14.192:5555. Profile preview đã đặt buildType apk. EAS cần đăng nhập và liên kết project; làm theo câu hỏi của CLI. Nếu EAS ký bằng khóa khác, không thể cài đè bản APK debug hiện tại: gỡ bản cũ sẽ làm mất dữ liệu cục bộ.

android/ đang bị gitignore. EAS thường sinh native bằng prebuild khi upload không chứa android/. Cấu hình bền vững nằm ở app.json.

## Lưu ý riêng khi build local Windows

- Không build trong đường dẫn có dấu như Gia Bảo JS: AGP từ chối non-ASCII.
- Bản build tạm dùng đường dẫn ASCII ngắn, Ninja 1.13.2, output Gradle mới và vùng CMake ngắn. Script scripts/windows-build.init.gradle lưu cấu hình này, hiện trỏ cố định vào D:/nightwave-build-01a1e54b.
- Ninja độc lập ở D:\nightwave-build-01a1e54b\tools\ninja\ninja.exe; không thay Ninja trong SDK hệ thống.
- Nếu đổi output Gradle, Safe Area Context vẫn có CMake include hardcode vào android/build/generated/source/codegen. Cache hiện tại đã có header ở đó. Nếu clean cache và báo thiếu Props.h/EventEmitters.h, chạy task codegen rồi đồng bộ:

```powershell
Set-Location 'D:\nightwave-build-01a1e54b\android'
.\gradlew.bat :react-native-safe-area-context:generateCodegenArtifactsFromSchema -I ..\retry.init.gradle
New-Item -ItemType Directory -Path '..\node_modules\react-native-safe-area-context\android\build\generated\source' -Force
Copy-Item -LiteralPath '.\outputs-retry3\_react-native-safe-area-context\generated\source\codegen' -Destination '..\node_modules\react-native-safe-area-context\android\build\generated\source' -Recurse -Force
```

## Cài APK

Chép APK sang điện thoại, mở file và cho phép cài từ nguồn đó. Có thể dùng ADB nếu đã bật USB debugging:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r 'D:\Gia Bảo JS\AppMusicSpotify\releases\nightwave-1.0.1-arm64-lan.apk'
```

Kiểm tra nghe nhạc, chuyển bài, đưa app xuống nền, khóa màn hình và nút tai nghe trên thiết bị thật. Build thành công không đồng nghĩa đã xác nhận các giao diện OEM như Now Bar/Dynamic Island.

## V2: thay LAN ngay trên điện thoại

Từ APK 1.1.0, dùng Library → Máy chủ nhạc → Kiểm tra và lưu để đổi địa chỉ, không cần build lại. .env là mặc định khi chưa có địa chỉ đã lưu. LAN hiện tại: http://192.168.0.45:5555. Hướng dẫn ở trên cho rebuild mặc định vẫn áp dụng khi cần.
