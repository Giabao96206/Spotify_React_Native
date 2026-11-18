# UI và màu ảnh bìa — 18/11/2026

- Home dùng header bộ lọc, lối tắt 2 cột, lịch sử nghe, hàng ảnh bìa bài hát,
  playlist và nghệ sĩ từ API. Bộ lọc thay đổi nội dung thật; không thêm mục
  podcast, premium hoặc camera khi app chưa có các chức năng đó.
- Search có ô tìm sáng, tìm gần đây, ô thể loại/tâm trạng dẫn tới truy vấn tìm
  nhạc, kết quả bài hát/nghệ sĩ/playlist. Có debounce, trạng thái đang tải,
  lỗi/thử lại và xử lý truy vấn ngắn.
- Mini-player có nền theo ảnh bìa, thanh tiến trình trắng và các vùng chạm
  phát/tạm dừng/chuyển bài tách khỏi vùng mở player. Điều hướng dưới dùng
  ba mục đang có: Trang chủ, Tìm kiếm, Thư viện.
- Player, mini-player và lời bài hát dùng chung `useArtworkTheme`. Expo Image
  tải ảnh thu nhỏ (tối đa 48px), sinh BlurHash 1×1; DC component là màu trung
  bình tính từ pixel thật. React Query chia sẻ/cache theo URL, không giữ màu
  của URL trước cho bài mới, và trả nền trung tính nếu thiếu/lỗi ảnh.
- Nền được làm tối; màu nhấn được làm sáng cùng tông để chữ và điều khiển rõ.
  Nền player còn có ảnh bìa làm mờ cùng lớp phủ tối. Hiệu ứng đổi màu tôn trọng
  cài đặt giảm chuyển động; không thêm timer JS để lấy màu.
- Origin Island lấy màu trung bình trong không gian linear RGB từ bitmap
  mà service nhạc đã tải, cache theo bitmap. Dùng base card + right template 6,
  `island.superx.rightInfo.capsuleBgColor` và `capsuleContent` đã được xác nhận
  trong mã repo tham khảo. Capsule hiện thời gian phát khi có duration, cập
  nhật bằng callback native 5 giây có sẵn; tạm dừng/dừng hủy callback.
  Không còn dùng màu teal cố định hoặc progress-ring template cho capsule này.

Màu nền capsule là **gợi ý tới renderer OriginOS**. Giao thức không cung cấp
API đã xác minh để ép màu toàn bộ phần đảo do hệ điều hành vẽ. Chưa thể hứa
toàn bộ đảo sẽ đổi màu trên mọi phiên bản ROM. Chức năng media Android chuẩn
và các điều khiển MediaSession vẫn được giữ nguyên.

Các file chính:

- `app/(tabs)/index.tsx`, `search.tsx`, `_layout.tsx`
- `app/player.tsx`
- `src/components/music/MiniPlayer.tsx`, `TrackRow.tsx`, `ArtworkBackdrop.tsx`
- `src/features/lyrics/LyricsPanel.tsx`
- `src/hooks/useArtworkTheme.ts`, `src/theme/artwork.ts`, `src/theme/tokens.ts`
- `plugins/origin-island/NightwaveOriginIsland.kt`
- `scripts/verify-artwork-theme.mjs`

Kiểm tra:

```powershell
pnpm typecheck
node scripts/verify-artwork-theme.mjs
pnpm test:player
pnpm test:lyrics
```

Đã qua TypeScript, player, lyrics, giải mã màu DC, fallback ảnh lỗi và kiểm tra
độ tương phản chữ/màu nhấn trên 216 mẫu màu. Đã kiểm tra lại hooks luôn được gọi
trước return sớm; các component lấy màu dùng chung query để tránh tải trùng;
tiến trình chỉ cập nhật component cần nó. Kiểm tra này không thay thế kiểm thử
hiển thị thực tế trên máy vivo.

## Kết quả build và kiểm tra trên vivo

- APK release arm64 build thành công; cài cập nhật bằng `adb install -r` lên
  vivo V2425A thành công, giữ nguyên dữ liệu. App khởi động được.
- File: `releases/nightwave-1.1.0-ui-artwork-arm64.apk`, 36.647.074 byte.
  SHA-256: `9dc7ef544badd5cbec8b0e7f33700141abce3e2a7fcdc4f58a7eb309737255e4`.
- Đã xem ảnh chụp Home, Search và player trên máy. Ảnh bìa đỏ/nâu của bài
  “Mình Là Gì Của Nhau” cho mini-player, player và khung lời bài hát tông đỏ/nâu.
  Các ô tìm gần đây, thể loại, bottom tabs và các nút media hiển thị rõ.
- Backend ban đầu timeout; sau đó nhạc phát được và `dumpsys media_session`
  xác nhận session Nightwave `PLAYING` với đúng bài/nghệ sĩ.
- Service foreground có notification `color=0xffc8baba`, xác nhận màu nhấn
  native được tính từ ảnh bìa thay cho hằng teal cũ.
- Đảo đã hiển thị khi đưa app xuống nền, với ảnh bìa và waveform màu hồng/đỏ.
  Tuy nhiên, ROM này dùng `com.vivo.musicwidgetmix` để dựng notification đảo
  của hệ thống và chọn right template 1. Ảnh chụp cho thấy vỏ đảo vẫn **đen**.
  Không khẳng định trường `capsuleBgColor` của app được renderer này sử dụng;
  toàn bộ nền đảo đổi theo bìa vẫn là giới hạn của ROM/giao thức chưa công khai.
- Đã đưa app trở lại Search sau kiểm tra. Không đổi địa chỉ backend, không
  gỡ app, không xóa dữ liệu hoặc thay đổi thiết lập hệ thống của máy.
