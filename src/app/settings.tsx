import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
      <Section title="Gỡ lỗi">
        <View style={styles.row}>
          <IconLabel icon="bug-outline" tint={[255,214,10]} label="Overlay debug" />
          <Switch
            value={debugEnabled}
            onValueChange={setDebugEnabled}
            accessibilityLabel="Bật overlay debug trên màn hình quét"
            trackColor={{ true: Colors.accent, false: '#3A3A3C' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.hintText}>
          Overlay chỉ hiển thị trong bản development — không xuất hiện ở bản
          production vì không có cơ chế bật tại runtime khi release.
        </Text>
      </Section>

      <Section title="Mô hình (ONNX)">
        <InfoRow
          icon="cube-outline"
          label="Phân loại (Một vật)"
          value={describeRuntime(classifierRuntime)}
        />
        <View style={styles.separator} />
        <InfoRow
          icon="layers-outline"
          label="Phát hiện (Nhiều vật)"
          value={describeRuntime(detectorRuntime)}
        />
        <Text style={styles.hintText}>
          Input: phân loại {CLASSIFY_INPUT_SIZE}², phát hiện {DETECT_INPUT_SIZE}².
          EP = execution provider ONNX Runtime đang dùng.
        </Text>
      </Section>

      <Section title="Ngưỡng phân loại">
        <InfoRow
          icon="stats-chart-outline"
          label="Confidence (Một vật)"
          value={`≥ ${Math.round(CLASSIFY_CONFIDENCE_THRESHOLD * 100)}%`}
        />
        <View style={styles.separator} />
        <InfoRow
          icon="repeat-outline"
          label="Số frame ổn định"
          value={`${CLASSIFY_SMOOTHING_WINDOW} / ${CLASSIFY_CONFIRM_STREAK} streak`}
        />
        <View style={styles.separator} />
        <InfoRow
          icon="scan-outline"
          label="Confidence (Nhiều vật)"
          value={`≥ ${Math.round(DETECT_CONFIDENCE_THRESHOLD * 100)}%`}
        />
      </Section>

      <Section title="Nhóm xử lý">
        {CATEGORY_ORDER.map((id) => (
          <View key={id} style={styles.categoryRow}>
            <View style={[styles.emojiTile, { backgroundColor: CATEGORIES[id].softBg }]}>
              <Text style={styles.categoryEmoji} allowFontScaling={false}>
                {CATEGORIES[id].emoji}
              </Text>
            </View>
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
          (key, i) => (
            <View key={key}>
              {i > 0 ? <View style={styles.separator} /> : null}
              <InfoRow
                icon="git-compare-outline"
                label={`${WASTE_CLASSES[key].emoji} ${WASTE_CLASSES[key].fieldName}`}
                value={CATEGORIES[WASTE_CLASS_TO_CATEGORY[key]].label}
              />
            </View>
          ),
        )}
        <Text style={styles.hintText}>
          Có thể chỉnh ánh xạ trong src/data/wasteRules.ts mà không cần thay
          model hay train lại.
        </Text>
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

      <Text style={styles.footerText}>EcoScan v1.0.0 · iOS-style UI</Text>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
        {title}
      </Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function IconLabel({
  icon,
  tint,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: [number, number, number];
  label: string;
}) {
  return (
    <View style={styles.rowIconLabel}>
      <View
        style={[
          styles.tinyIcon,
          { backgroundColor: `rgba(${tint[0]},${tint[1]},${tint[2]},0.18)` },
        ]}
      >
        <Ionicons name={icon} size={18} color={Colors.text} />
      </View>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIconLabel}>
        <View style={styles.tinyIcon}>
          <Ionicons name={icon} size={18} color={Colors.accent} />
        </View>
        <Text style={styles.text} numberOfLines={1}>
          {label}
        </Text>
      </View>
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
  if (runtime.status === 'loading') return 'Đang tải…';
  if (runtime.status === 'unavailable') return 'Cần Dev Build';
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
  group: {
    gap: 8,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: Font.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.sm + 4,
    marginBottom: -4,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tinyIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(10,132,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
    marginLeft: 44,
  },
  text: {
    flexShrink: 1,
    color: Colors.text,
    fontSize: Font.body,
  },
  textMuted: {
    color: Colors.textTernary,
    fontSize: Font.small,
    lineHeight: 20,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: Font.small,
    lineHeight: 19,
    paddingVertical: Spacing.sm,
  },
  value: {
    color: Colors.accent,
    fontSize: Font.small,
    fontWeight: '600',
    maxWidth: '50%',
    textAlign: 'right',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  emojiTile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '700',
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: Font.caption,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
