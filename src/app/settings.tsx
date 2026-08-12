import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Colors, Font, Radii, Spacing } from '@/constants/theme';
import {
  useDebugEnabled,
  setDebugEnabled,
} from '@/utils/appSettings';
import { getClassifier, getDetector } from '@/ai/modelManager';
import type { ModelRuntimeInfo } from '@/ai/types';
import {
  CATEGORIES,
  CATEGORY_ORDER,
} from '@/data/categories';
import {
  WASTE_CLASSES,
  WASTE_CLASS_TO_CATEGORY,
} from '@/data/wasteRules';
import {
  CLASSIFY_CONFIDENCE_THRESHOLD,
  CLASSIFY_CONFIRM_STREAK,
  CLASSIFY_SMOOTHING_WINDOW,
  DETECT_CONFIDENCE_THRESHOLD,
  DETECT_INPUT_SIZE,
  CLASSIFY_INPUT_SIZE,
} from '@/data/thresholds';

export default function SettingsScreen() {
  const debugEnabled = useDebugEnabled();
  const [classifierRuntime, setClassifierRuntime] = useState<ModelRuntimeInfo | null>(null);
  const [detectorRuntime, setDetectorRuntime] = useState<ModelRuntimeInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClassifier()
      .then((c) => !cancelled && setClassifierRuntime(c.runtime))
      .catch(() => {});
    getDetector()
      .then((d) => !cancelled && setDetectorRuntime(d.runtime))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Section title="Gỡ lỗi (Debug)">
        <View style={styles.row}>
          <Text style={styles.text}>Hiển thị overlay debug trên màn hình quét</Text>
          <Switch
            value={debugEnabled}
            onValueChange={setDebugEnabled}
            accessibilityLabel="Bật overlay debug trên màn hình quét"
          />
        </View>
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            Overlay chỉ hiển thị trong bản development — không xuất hiện ở bản
            production vì không có cơ chế bật tại runtime khi release.
          </Text>
        </View>
      </Section>

      <Section title="Mô hình (ONNX)">
        <InfoRow label="Phân loại (Một vật)" value={describeRuntime(classifierRuntime)} />
        <InfoRow label="Phát hiện (Nhiều vật)" value={describeRuntime(detectorRuntime)} />
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            Input: phân loại {CLASSIFY_INPUT_SIZE}², phát hiện {DETECT_INPUT_SIZE}².
            EP = execution provider ONNX Runtime đang dùng.
          </Text>
        </View>
      </Section>

      <Section title="Ngưỡng phân loại">
        <InfoRow
          label="Confidence (Một vật)"
          value={`≥ ${Math.round(CLASSIFY_CONFIDENCE_THRESHOLD * 100)}%`}
        />
        <InfoRow
          label="Số frame ổn định"
          value={`${CLASSIFY_SMOOTHING_WINDOW} cửa sổ / ${CLASSIFY_CONFIRM_STREAK} streak`}
        />
        <InfoRow
          label="Confidence (Nhiều vật)"
          value={`≥ ${Math.round(DETECT_CONFIDENCE_THRESHOLD * 100)}%`}
        />
      </Section>

      <Section title="Nhóm xử lý">
        {CATEGORY_ORDER.map((id) => (
          <View key={id} style={styles.categoryRow}>
            <Text style={styles.categoryEmoji} allowFontScaling={false}>
              {CATEGORIES[id].emoji}
            </Text>
            <View style={styles.categoryBody}>
              <Text style={[styles.categoryTitle, { color: CATEGORIES[id].color }]}>
                {CATEGORIES[id].title}
              </Text>
              <Text style={styles.textMuted}>{CATEGORIES[id].guidance}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section title="Ánh xạ loại AI → Nhóm">
        {(Object.keys(WASTE_CLASSES) as (keyof typeof WASTE_CLASSES)[]).map(
          (key) => (
            <InfoRow
              key={key}
              label={`${WASTE_CLASSES[key].emoji} ${WASTE_CLASSES[key].name} (${WASTE_CLASSES[key].fieldName})`}
              value={CATEGORIES[WASTE_CLASS_TO_CATEGORY[key]].label}
            />
          ),
        )}
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            Có thể chỉnh ánh xạ trong src/data/wasteRules.ts mà không cần thay
            model hay train lại.
          </Text>
        </View>
      </Section>

      <Section title="Về EcoScan">
        <Text style={styles.textMuted}>
          · Nhận diện rác chạy hoàn toàn cục bộ trên thiết bị bằng ONNX Runtime.
          Không gửi ảnh, không đăng nhập, không backend.
        </Text>
        <Text style={styles.textMuted}>
          · Hướng dẫn trong ứng dụng chỉ mang tính tham khảo, không thay thế quy
          định pháp luật của địa phương về phân loại và thu gom rác.
        </Text>
        <Text style={styles.textMuted}>
          · Với pin (battery), luôn ưu tiên cảnh báo chất thải nguy hại — không
          bỏ chung với rác sinh hoạt.
        </Text>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.footerText}>EcoScan v1.0.0 · Expo + ONNX Runtime</Text>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function describeRuntime(runtime: ModelRuntimeInfo | null): string {
  if (!runtime) return 'Chưa tải';
  if (runtime.status === 'ready') {
    return `sẵn sàng · EP ${runtime.executionProvider ?? '?'} · ${runtime.inputSize ?? '?'}²`;
  }
  if (runtime.status === 'loading') return 'Đang tải...';
  if (runtime.status === 'unavailable') return 'Chưa khả dụng (cần Dev Build)';
  return 'Lỗi';
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Font.small,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  text: {
    flex: 1,
    color: Colors.text,
    fontSize: Font.body,
  },
  textMuted: {
    color: Colors.textSecondary,
    fontSize: Font.small,
    lineHeight: 20,
  },
  value: {
    color: Colors.accent,
    fontSize: Font.small,
    fontWeight: '700',
    maxWidth: '52%',
  },
  hintBox: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radii.sm,
    padding: Spacing.md,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: Font.small,
    lineHeight: 19,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryBody: {
    flex: 1,
    gap: 2,
  },
  categoryTitle: {
    fontSize: Font.body,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: Font.caption,
  },
});