# EcoScan

Ứng dụng di động giúp **nhận diện và phân loại chất thải** ngay trên điện thoại, không cần internet, không tải ảnh lên thiết bị khác. Toàn bộ quá trình nhận diện diễn ra cục bộ trên máy của bạn.

## Tính năng

- Đưa vật thể vào khung camera → app tự nhận diện loại chất thải và gợi ý cách xử lý
- Phân loại thành 4 nhóm: **tái chế**, **thực phẩm**, **chất thải nguy hại**, **chất thải khác**
- Kết quả hiển thị bằng tiếng Việt với hướng dẫn ngắn gọn cho từng loại
- Camera tự đứng yên sau khi quét xong, bấm **Quét lại** để tiếp tục
- Không cần đăng nhập, không thu thập dữ liệu cá nhân

## Sử dụng

1. Mở app và cấp quyền truy cập camera
2. Đặt vật thể vào khung vuông giữa màn hình, giữ yên trong vài giây
3. Xem kết quả và gợi ý phân loại
4. Bấm **Quét lại** để nhận diện vật khác

> Nếu app hiển thị "Chưa chắc chắn", hãy đưa vật thể gần hơn và ở nơi đủ sáng.

## Cài đặt cho lập trình viên

```bash
npm install
```

> **Lưu ý:** App dùng module native cho AI nên không chạy được trong Expo Go.
> Phải dùng Development Build.

```bash
# Build và chạy Development Build lên thiết bị Android
npx expo prebuild --platform android
npx expo run:android

# Build APK release
cd android && ./gradlew assembleRelease
```

## Cấu trúc code

```
src/
  app/                 # Màn hình: quét chính, cài đặt
  components/          # Các thành phần giao diện
  data/                # Tên gọi, nhóm phân loại và ngưỡng nhận diện (chỉnh được không cần huấn luyện lại)
  hooks/               # Logic quét và nhận diện
```

## Lưu ý

- Kết quả chỉ mang tính tham khảo, không thay thế quy định phân loại rác tại địa phương
- Luôn bỏ pin riêng vào điểm thu gom chất thải nguy hại
