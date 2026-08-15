import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Font, Radii, Spacing, TouchTarget } from '@/constants/theme';
import {
  useDebugEnabled,
  setDebugEnabled,
} from '@/utils/appSettings';
import { BUNDLED_CLASSIFIER_NAME } from '@/ai/bundledClassifier';
import {
  CATEGORIES,
  CATEGORY_ORDER,
} from '@/data/categories';

type TabId = 'guide' | 'info';

export default function SettingsScreen() {
  const debugEnabled = useDebugEnabled();
  const [tab, setTab] = useState<TabId>('guide');

  return (
    <View style={styles.root}>
      <View style={styles.tabRow}>
        <TabButton
          label="Hướng dẫn"
          active={tab === 'guide'}
          onPress={() => setTab('guide')}
        />
        <TabButton
          label="Thông tin"
          active={tab === 'info'}
          onPress={() => setTab('info')}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'guide' ? <GuideTab debugEnabled={debugEnabled} onToggleDebug={setDebugEnabled} /> : <InfoTab />}
      </ScrollView>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        active && styles.tabButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.tabLabel, active && styles.tabLabelActive]}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Tab 1 — Hướng dẫn sử dụng và phân loại. */
function GuideTab({
  debugEnabled,
  onToggleDebug,
}: {
  debugEnabled: boolean;
  onToggleDebug: (value: boolean) => void;
}) {
  return (
    <View style={styles.contentInner}>
      <Section title="Cách sử dụng">
        <StepRow
          step="1"
          text="Mở ứng dụng và cấp quyền camera khi được hỏi."
        />
        <View style={styles.separator} />
        <StepRow
          step="2"
          text="Đưa vật dụng vào khung giữa màn hình và giữ yên trong vài giây."
        />
        <View style={styles.separator} />
        <StepRow
          step="3"
          text="Ứng dụng phân tích và hiện nhóm xử lý phù hợp bên dưới khung quét."
        />
        <View style={styles.separator} />
        <StepRow
          step="4"
          text="Sau khi xem kết quả, nhấn “Quét lại” để phân tích vật tiếp theo."
        />
        <View style={styles.separator} />
        <StepRow
          step="5"
          text="Nếu kết quả “Chưa rõ”, hãy đưa vật gần hơn và đặt ở nơi đủ sáng."
        />
      </Section>

      <Section title="Gợi ý khi quét">
        <TipRow
          icon="scan-outline"
          text="Giữ máy steady, cách vật 15–30 cm để khung quét bao trọn vật."
        />
        <View style={styles.separator} />
        <TipRow
          icon="bulb-outline"
          text="Ánh sáng đều, tránh ngược sáng giúp kết quả chính xác hơn."
        />
        <View style={styles.separator} />
        <TipRow
          icon="notifications-off-outline"
          text="Pin luôn được cảnh báo riêng — tuyệt đối không bỏ chung với chất thải sinh hoạt."
        />
      </Section>

      <Section title="Bốn nhóm xử lý">
        {CATEGORY_ORDER.map((id) => (
          <View key={id} style={styles.categoryRow}>
            <View
              style={[
                styles.emojiTile,
                { backgroundColor: CATEGORIES[id].softBg },
              ]}
            >
              <Text style={styles.categoryEmoji} allowFontScaling={false}>
                {CATEGORIES[id].emoji}
              </Text>
            </View>
            <View style={styles.categoryBody}>
              <Text
                style={[
                  styles.categoryTitle,
                  { color: CATEGORIES[id].color },
                ]}
              >
                {CATEGORIES[id].title}
              </Text>
              <Text style={styles.textMuted}>{CATEGORIES[id].guidance}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.hintText}>
          Gợi ý chỉ mang tính tham khảo. Vui lòng tuân theo quy định phân loại
          và thu gom chất thải của địa phương bạn.
        </Text>
      </Section>

      <Section title="Công cụ">
        <View style={styles.row}>
          <IconLabel icon="speedometer-outline" tint={[100,210,255]} label="Hiển thị thông số kỹ thuật" />
          <Switch
            value={debugEnabled}
            onValueChange={onToggleDebug}
            accessibilityLabel="Bật/ tắt bảng thông số kỹ thuật trên màn hình quét"
            trackColor={{ true: Colors.accent, false: '#3A3A3C' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Section>
    </View>
  );
}

/** Tab 2 — Thông tin về ứng dụng. */
function InfoTab() {
  return (
    <View style={styles.contentInner}>
      <Section title="Về EcoScan">
        <Text style={styles.textMuted}>
          · Phân loại chất thải chạy hoàn toàn cục bộ trên thiết bị. Ảnh camera
          không được gửi đi bất kỳ đâu.
        </Text>
        <View style={styles.separator} />
        <Text style={styles.textMuted}>
          · Không cần tài khoản, không backend, không quảng cáo.
        </Text>
        <View style={styles.separator} />
        <Text style={styles.textMuted}>
          · Hướng dẫn trong ứng dụng chỉ mang tính tham khảo, không thay thế quy
          định pháp luật của địa phương về phân loại và thu gom chất thải.
        </Text>
      </Section>

      <Section title="Công nghệ">
        <InfoRow
          icon="cube-outline"
          label="Công cụ nhận diện tích hợp"
          value={BUNDLED_CLASSIFIER_NAME}
        />
        <View style={styles.separator} />
        <InfoRow icon="scan-outline" label="Số loại nhận diện" value="19 loại" />
        <View style={styles.separator} />
        <InfoRow
          icon="hardware-chip-outline"
          label="Xử lý"
          value="Hoàn toàn trên thiết bị"
        />
      </Section>

      <Text style={styles.footerText}>EcoScan v1.0.0</Text>
    </View>
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

function StepRow({ step, text }: { step: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepCircle}>
        <Text style={styles.stepText} allowFontScaling={false}>
          {step}
        </Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

function TipRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tinyIcon}>
        <Ionicons name={icon} size={18} color={Colors.accent} />
      </View>
      <Text style={styles.text}>{text}</Text>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: TouchTarget,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabLabel: {
    color: Colors.text,
    fontSize: Font.body,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  contentInner: {
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(10,132,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700',
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
    lineHeight: 21,
  },
  textMuted: {
    color: Colors.textTernary,
    fontSize: Font.small,
    lineHeight: 20,
    paddingVertical: Spacing.xs,
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
  pressed: {
    opacity: 0.85,
  },
});
