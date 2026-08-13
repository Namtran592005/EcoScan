import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Font, Radii, Spacing, TouchTarget } from '@/constants/theme';
import {
  useDebugEnabled,
  setDebugEnabled,
} from '@/utils/appSettings';
import { invalidateModels } from '@/ai/modelManager';
import { BUNDLED_CLASSIFIER_NAME } from '@/ai/bundledClassifier';
import { probeModelFile } from '@/services/modelProbe';
import {
  assignRole,
  deleteModel,
  getActiveModel,
  importModelFile,
  listModels,
  useModelStoreVersion,
  unassignRole,
  type ModelKind,
  type StoredModel,
} from '@/services/modelStore';
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
} from '@/data/thresholds';

export default function SettingsScreen() {
  const debugEnabled = useDebugEnabled();
  useModelStoreVersion();

  const [classifierId, setClassifierId] = useState<string | null>(null);
  const [detectorId, setDetectorId] = useState<string | null>(null);
  const [models, setModels] = useState<StoredModel[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [all, classifier, detector] = await Promise.all([
        listModels(),
        getActiveModel('classifier'),
        getActiveModel('detector'),
      ]);
      if (cancelled) return;
      setModels(all);
      setClassifierId(classifier?.id ?? null);
      setDetectorId(detector?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Reload model list after mutations (called from event handlers only). */
  const refresh = useCallback(async () => {
    const [all, classifier, detector] = await Promise.all([
      listModels(),
      getActiveModel('classifier'),
      getActiveModel('detector'),
    ]);
    setModels(all);
    setClassifierId(classifier?.id ?? null);
    setDetectorId(detector?.id ?? null);
  }, []);

  const onImport = useCallback(async () => {
    setImporting(true);
    setImportError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', 'application/x-onnx', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.uri) throw new Error('Không lấy được file model.');

      // Probe so we can show the detected role immediately and give a friendly
      // error for unsupported files. If ONNX Runtime is unavailable (Expo Go),
      // still import the file so it is recorded — it just won't run inference.
      const meta = await probeModelFile(asset.uri).catch((error: unknown) => {
        if (error instanceof Error && /Development Build/.test(error.message)) {
          return { kind: 'unknown' as const, inputSize: null, numClasses: null };
        }
        throw error;
      });
      await importModelFile(asset.uri, asset.name ?? 'model.onnx', meta);
      invalidateModels();
      await refresh();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Lỗi khi thêm mô hình.');
    } finally {
      setImporting(false);
    }
  }, [refresh]);

  const onDelete = useCallback(
    async (model: StoredModel) => {
      Alert.alert(
        'Xóa mô hình',
        `Xóa "${model.fileName}" khỏi thiết bị?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              await deleteModel(model.id);
              invalidateModels();
              refresh();
            },
          },
        ],
      );
    },
    [refresh],
  );

  const onAssign = useCallback(
    async (model: StoredModel, role: ModelKind) => {
      await assignRole(model.id, role);
      invalidateModels();
      refresh();
    },
    [refresh],
  );

  const onUnassign = useCallback(
    async (role: ModelKind) => {
      await unassignRole(role);
      invalidateModels();
      refresh();
    },
    [refresh],
  );

  const classifierName = models.find((m) => m.id === classifierId)?.fileName;
  const detectorName = models.find((m) => m.id === detectorId)?.fileName;

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
        <View style={styles.row}>
          <IconLabel icon="add-circle-outline" tint={[52,199,89]} label="Thêm mô hình .onnx" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn file ONNX để thêm mô hình"
            onPress={onImport}
            disabled={importing}
            style={({ pressed }) => [
              styles.smallButton,
              pressed && styles.pressed,
              importing && styles.smallButtonDisabled,
            ]}
          >
            <Text style={styles.smallButtonLabel}>
              {importing ? 'Đang thêm…' : 'Nhập'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.hintText}>
          Ứng dụng kèm sẵn một mô hình phân loại 10 loại rác (
          {BUNDLED_CLASSIFIER_NAME}) dùng làm mặc định. Bạn có thể thêm file
          ONNX khác (phân loại hoặc phát hiện) — loại model được tự nhận dạng
          từ metadata.
        </Text>
        {importError ? (
          <Text style={styles.errorText} accessibilityRole="alert">
            {importError}
          </Text>
        ) : null}

        {models.length === 0 ? (
          <Text style={styles.emptyText}>
            Chưa có mô hình tự thêm. Mô hình phân loại mặc định đang được dùng —
            bấm “Nhập” nếu muốn thay bằng file .onnx khác.
          </Text>
        ) : (
          models.map((model) => (
            <View key={model.id} style={styles.modelCard}>
              <View style={styles.modelHeader}>
                <Ionicons name="cube-outline" size={20} color={Colors.accent} />
                <Text style={styles.modelName} numberOfLines={2}>
                  {model.fileName}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xóa ${model.fileName}`}
                  onPress={() => onDelete(model)}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </Pressable>
              </View>
              <View style={styles.modelMetaRow}>
                <MetaPill
                  label={
                    model.kind === 'classifier'
                      ? 'Phân loại'
                      : model.kind === 'detector'
                        ? 'Phát hiện'
                        : 'Chưa rõ'
                  }
                />
                {model.inputSize ? <MetaPill label={`${model.inputSize}²`} /> : null}
                {model.numClasses ? (
                  <MetaPill label={`${model.numClasses} lớp`} />
                ) : null}
              </View>
              <View style={styles.roleRow}>
                <RoleButton
                  active={classifierName === model.fileName}
                  label="Dùng làm phân loại"
                  onPress={() => onAssign(model, 'classifier')}
                  onClear={() => onUnassign('classifier')}
                />
                <RoleButton
                  active={detectorName === model.fileName}
                  label="Dùng làm phát hiện"
                  onPress={() => onAssign(model, 'detector')}
                  onClear={() => onUnassign('detector')}
                />
              </View>
            </View>
          ))
        )}

        <View style={styles.separator} />
        <InfoRow
          icon="cube-outline"
          label="Phân loại (Một vật)"
          value={classifierName ?? BUNDLED_CLASSIFIER_NAME}
        />
        <View style={styles.separator} />
        <InfoRow
          icon="layers-outline"
          label="Phát hiện (Nhiều vật)"
          value={detectorName ?? 'Chưa chọn'}
        />
        <Text style={styles.hintText}>
          Một mô hình có thể đảm nhận cả hai vai trò. Chọn vai trò ở từng mô
          hình ở trên.
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

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

function RoleButton({
  active,
  label,
  onPress,
  onClear,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  onClear: () => void;
}) {
  if (active) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} (đang dùng). Nhấn để bỏ chọn`}
        onPress={onClear}
        style={({ pressed }) => [
          styles.roleButton,
          styles.roleButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
        <Text style={styles.roleButtonActiveLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.roleButtonLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
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
  smallButton: {
    minHeight: TouchTarget - 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonDisabled: {
    opacity: 0.6,
  },
  smallButtonLabel: {
    color: '#FFFFFF',
    fontSize: Font.small,
    fontWeight: '700',
  },
  errorText: {
    color: Colors.danger,
    fontSize: Font.small,
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  emptyText: {
    color: Colors.textTernary,
    fontSize: Font.small,
    lineHeight: 19,
    paddingVertical: Spacing.sm,
  },
  modelCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modelName: {
    flex: 1,
    color: Colors.text,
    fontSize: Font.body,
    fontWeight: '600',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,69,58,0.12)',
  },
  modelMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    backgroundColor: 'rgba(10,132,255,0.14)',
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaPillText: {
    color: Colors.accent,
    fontSize: Font.caption,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    minHeight: 34,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  roleButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  roleButtonLabel: {
    color: Colors.text,
    fontSize: Font.small,
  },
  roleButtonActiveLabel: {
    color: '#FFFFFF',
    fontSize: Font.small,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
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
