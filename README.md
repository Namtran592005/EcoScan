# EcoScan — Nhận diện rác bằng AI trên thiết bị (Expo + ONNX Runtime)

EcoScan là ứng dụng mobile giúp **nhận diện rác và hướng dẫn phân loại** hoàn toàn
cục bộ trên thiết bị (local-first), không backend, không cloud, không tải ảnh lên.

- **Stack:** Expo SDK 57 (React Native 0.86, React 19, TypeScript 6, Expo Router)
- **AI inference:** `onnxruntime-react-native` (ONNX Runtime) — chạy trên CPU/NNAPI
  của thiết bị
- **Camera:** `expo-camera` (`CameraView`) — chụp ảnh nhanh có throttling
- **Hai chế độ:** *Một vật* (YOLOv8n classification) và *Nhiều vật* (YOLO11n detection)

---

## Cấu trúc project

```
assets/models/                     # 2 file ONNX (đặt tại đây)
  wastewise-yolo.onnx              # YOLOv8n-cls: input [1,3,224,224] → [1,8]
  yolo11_trash_detection.onnx      # YOLO11n:   input [1,3,640,640] → [1,12,8400]
app/                               # (expo-router root, trong thư mục src)
src/
  app/                             # Routes: _layout, index (quét), settings
  ai/                              # Lớp AI: interface, adapter ONNX, pre/post, smoothing
    types.ts                       # WasteClassifier / WasteDetector contracts
    classifierAdapter.ts           # ONNX classification adapter
    detectorAdapter.ts             # ONNX detection adapter
    preprocessing.ts               # RGBA → NCHW normalized (pooled buffer)
    postprocessing.ts              # softmax + NMS (YOLO output)
    smoothing.ts                   # temporal smoothing cho cả 2 chế độ
    onnxRuntime.ts                 # lazy-load ORT binding (an toàn khi không có native)
    modelManager.ts                # singleton quản lý load/retry/dispose model
  components/                      # UI: HUD, result card, overlay, debug, permission…
  data/                            # QUAN TRỌNG: mọi thứ chỉnh được không cần train lại
    wasteRules.ts                  # mapping AI class → nhóm xử lý + tên tiếng Việt
    categories.ts                  # 4 nhóm hiển thị + hướng dẫn
    detectionLabels.ts             # label của model phát hiện (class_0…class_7)
    thresholds.ts                  # ngưỡng confidence, smoothing, kích thước input…
  hooks/                           # useScanEngine, useModelAvailability, usePerfStats
  services/                        # imageToTensor (camera→square→base64→RGBA), modelAssets
  utils/                           # perf tracker, app settings (debug toggle)
```

Mọi ánh xạ AI → nhóm rác nằm trong `src/data/wasteRules.ts` và có thể chỉnh mà
**không cần train lại hay thay model**.

---

## Yêu cầu môi trường

- Node.js ≥ 20 (khuyến nghị LTS)
- JDK 17–21 (RN 0.86 + Gradle 8; JDK 26 hiện chưa được Gradle hỗ trợ)
- Android Studio + Android SDK (để build Development Build)
- Một thiết bị Android (hoặc emulator) chạy Android 7+

> **Quan trọng:** ONNX Runtime là module native → **không chạy được trong Expo Go**.
> Bạn phải dùng **Expo Development Build** (xem bên dưới). Nếu mở trong Expo Go,
> ứng dụng sẽ hiển thị màn hình thông báo “Cần Development Build” (không giả lập kết quả AI).

---

## 1. Cài dependency

```bash
npm install
```

## 2. Đặt 2 file model

Tạo/sao chép vào `assets/models/` (đã có sẵn trong repo này):

```
assets/models/wastewise-yolo.onnx           # YOLOv8n-cls (8 class)
assets/models/yolo11_trash_detection.onnx   # YOLO11n detect (input 640)
```

- Model được nạp **từ bundle/assets** qua `expo-asset` (`src/services/modelAssets.ts`),
  không hard-code đường dẫn internet.
- `metro.config.js` đăng ký đuôi `.onnx` để Metro bundle chúng như asset.

### Kiểm tra class của model phát hiện (quan trọng)

Model detection được export với tên chung `class_0 … class_7`. Trong
`src/data/detectionLabels.ts`, chúng ta mặc định thứ tự giống model phân loại:
`battery, biological, cardboard, glass, metal, paper, plastic, trash`.

**Hãy đối chiếu thứ tự này với `data.yaml` dùng để train model detection.** Nếu khác,
sửa lại `DETECTION_LABELS` — không cần chỉnh model.

## 3. Chạy với Development Build (bắt buộc cho ONNX)

```bash
# Sinh thư mục native (chỉ lần đầu, hoặc khi đổi app.json/plugins)
npx expo prebuild --platform android

# Build & cài Development Build lên thiết bị/emulator đang kết nối
npx expo run:android
```

Sau đó mỗi lần chạy:

```bash
# Cách 1: chạy lại build + mở dev server
npx expo run:android

# Cách 2: chỉ mở dev server, mở app từ Development Client đã cài
npx expo start
```

> Config native cần thiết nằm trong `app.json` (plugins: `expo-router`,
> `expo-dev-client`, `expo-camera`, `expo-splash-screen`) + dependency
> `onnxruntime-react-native` (autolink tự động khi prebuild).

## 4. Build APK release

Cách A — Gradle cục bộ:

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease          # hoặc assembleDebug
# APK tại android/app/build/outputs/apk/release/
```

Cách B — EAS Build (đám mây, miễn phí cho project cá nhân):

```bash
npx eas-cli build --platform android --profile production
```

> Lưu ý: cấu hình release, keystore ký APK nằm ngoài phạm vi hướng dẫn này.

## 5. Test realtime

1. Đảm bảo camera quay về **phía sau**, đủ ánh sáng, đưa vật thể vào **khung
   vuông giữa màn hình**.
2. Chế độ **Một vật**: giữ yên món rác vài giây → nhận diện ổn định qua nhiều
   frame (temporal smoothing) mới hiển thị kết quả. Bấm **Quét lại** để nhận diện tiếp.
3. Chế độ **Nhiều vật**: đưa nhiều vật vào khung, bounding box + label sẽ vẽ lên
   từng vật, kèm tổng số vật và thống kê theo nhóm.
4. Với pin/ắc quy luôn hiển thị cảnh báo **Chất thải nguy hại**.

### Bật overlay debug

Vào **⚙️ Cài đặt & thông tin → Gỡ lỗi (Debug)** → bật “Hiển thị overlay debug”.
Overlay hiển thị: FPS preview, FPS inference, latency từng chu kỳ, model đang dùng,
execution provider (nnapi/cpu), và ngưỡng confidence. Overlay chỉ hiển thị trong
bản development.

---

## Cách nhận diện hoạt động

### Chế độ “Một vật” (classification)
1. `captureSquareBase64(camera, 224)` — `takePictureAsync` rồi cắt **hình vuông
   tâm khung** (đúng vùng HUD) và resize về 224×224 bằng `expo-image-manipulator`.
2. Giải mã JPEG → RGBA bằng `jpeg-js`, chuyển NCHW chuẩn hóa 0–1 bằng buffer pool.
3. `OnnxWasteClassifier` chạy model → 8 logits → softmax.
4. **Temporal smoothing** (`ClassifySmoother`): chỉ xác nhận khi cùng 1 class thắng
   liên tiếp `CLASSIFY_CONFIRM_STREAK` frame và confidence ≥ `CLASSIFY_CONFIDENCE_THRESHOLD`.
   Sau khi xác nhận → **đóng băng inference** để tiết kiệm CPU/pin; “Quét lại” để chạy tiếp.
   Nếu quá `CLASSIFY_UNCERTAIN_AFTER_FRAMES` frame không ổn định → hiển thị
   “Không chắc chắn — đưa vật thể gần hơn, đủ sáng hơn” thay vì đoán.

### Chế độ “Nhiều vật” (detection)
1. Cắt vuông + resize 640×640, chạy model → output `[1,12,8400]`.
2. Post-process: chọn box theo confidence ≥ `DETECT_CONFIDENCE_THRESHOLD`, **NMS**
   (IoU ≥ `DETECT_NMS_IOU`), giới hạn `DETECT_MAX_BOXES`, lọc box nhiễu quá nhỏ.
3. `DetectorBoxStabilizer` chỉ vẽ box xuất hiện ở ≥ 2 frame liên tiếp để hết nhấp nháy.
4. Tọa độ box quy về 0–1 rồi map tuyến tính vào khung vuông trên màn hình.

### Hiệu năng (ưu tiên máy cấu hình thấp)
- **Throttle:** mỗi vòng lặp cách nhau `INFER_MIN_INTERVAL_MS` (mặc định ~333ms,
  ~3 FPS inference), không bao giờ chạy 2 inference song song.
- Chỉ cắt/scale **vùng cần thiết** (vuông giữa) — không xử lý cả frame.
- Camera preview chạy native, **độc lập** với vòng inference; không bao giờ
  gọi `setState` nhiều lần/frame (detection dùng so sánh + memo).
- Pool Float32Array input để giảm GC, `release()` session khi dispose.
- Không lưu ảnh camera, không gửi dữ liệu đi đâu.

---

## Privacy

- Inference 100% local: **không upload hình ảnh, không backend, không đăng nhập,
  không thu thập dữ liệu cá nhân.**
- Hướng dẫn trong app chỉ mang tính **tham khảo**, không thay thế quy định pháp luật
  về phân loại/thu gom rác của địa phương.
- Với **battery** luôn ưu tiên cảnh báo chất thải nguy hại (không hướng dẫn bỏ chung
  rác sinh hoạt).

## Giới hạn kỹ thuật đã biết

1. **Label model detection:** thứ tự `class_0…class_7` cần được đối chiếu với dataset
   train; chỉnh `src/data/detectionLabels.ts` nếu cần.
2. **Inference FPS:** pipeline snapshot-based (`takePictureAsync`) đạt ~1–3 FPS trên
   Android tầm trung/thấp. Đủ cho smoothing & detection ổn định; nếu cần realtime 30 FPS,
   phải chuyển sang frame processor (vision-camera) — ngoài phạm vi hiện tại.
3. **Hướng xoay ảnh:** code giả định `expo-camera` trả ảnh đã chuẩn hóa hướng (đúng
   chiều preview). Nếu gặp lệch khung trên một số thiết bị, kiểm tra ở bước crop trong
   `src/services/imageToTensor.ts`.
4. **Expo Go:** ONNX Runtime không có trong Expo Go → phải dùng Development Build.
5. **JDK:** RN 0.86/Gradle yêu cầu JDK 17–21; JDK mới hơn có thể gây lỗi build.

## Lệnh hữu ích

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npx expo prebuild --platform android --clean   # tái sinh native project
npx expo run:android   # build + chạy Development Build
```

## Nhóm xử lý

| Nhóm | Emoji | Nội dung |
|------|-------|----------|
| Tái chế | ♻️ | plastic, paper, cardboard, glass, metal |
| Thực phẩm | 🍃 | biological |
| Rác sinh hoạt khác | 🗑️ | trash |
| Chất thải nguy hại | ⚠️ | battery (luôn cảnh báo riêng) |
