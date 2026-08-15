import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Radii, Spacing, TouchTarget } from '@/constants/theme';
import { CATEGORIES } from '@/data/categories';
import { classInfoFor, categoryForClass } from '@/data/wasteRules';
import { CLASSIFY_CONFIDENCE_THRESHOLD } from '@/data/thresholds';
import type { ClassificationResult } from '@/ai/types';
import { CategoryChip } from './CategoryChip';

interface Props {
  result: ClassificationResult;
  onReset: () => void;
}

/**
 * Bottom result card shown after a stable single-object classification.
 */
export function ResultCard({ result, onReset }: Props) {
  const info = classInfoFor(result.className);
  const category = categoryForClass(result.className)
    ? CATEGORIES[categoryForClass(result.className)!]
    : null;

  const uncertain = result.confidence < CLASSIFY_CONFIDENCE_THRESHOLD;
  const displayName = wantName(result, info?.name);

  return (
    <View style={styles.card}>
      {category ? <CategoryChip category={category} /> : null}

      <View style={styles.nameRow}>
        <Text style={styles.emoji} allowFontScaling={false}>
          {info?.emoji ?? '🗑️'}
        </Text>
        <Text style={styles.name} maxFontSizeMultiplier={1.5}>
          {uncertain ? 'Không chắc chắn' : displayName}
        </Text>
        {!uncertain ? (
          <View style={styles.confidencePill}>
            <Text style={styles.confidence}>
              {Math.round(result.confidence * 100)}%
            </Text>
          </View>
        ) : (
          <Ionicons name="help-circle-outline" size={22} color={Colors.warning} />
        )}
      </View>

      {uncertain ? (
        <Text style={styles.guidance} maxFontSizeMultiplier={1.5}>
          Hãy thử đưa vật thể gần hơn và đủ sáng hơn, rồi bấm “Quét lại”.
        </Text>
      ) : (
        <>
          {category ? (
            <Text style={styles.guidance} maxFontSizeMultiplier={1.5}>
              {category.guidance}
              {info?.tip ? ` ${info.tip}` : ''}
            </Text>
          ) : null}
          {category?.warningNote ? (
            <View style={styles.warningBanner} accessibilityRole="alert">
              <Ionicons name="warning" size={18} color={Colors.danger} />
              <Text style={styles.warningText} maxFontSizeMultiplier={1.5}>
                {category.warningNote}
              </Text>
            </View>
          ) : null}
        </>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quét lại"
        onPress={onReset}
        style={({ pressed }) => [
          styles.resetButton,
          pressed && styles.resetPressed,
        ]}
      >
        <Ionicons name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.resetLabel}>Quét lại</Text>
      </Pressable>
    </View>
  );
}

/**
 * The confirmed class should be displayed with a natural name, but if we don't
 * recognize the class key we must not fabricate one.
 */
function wantName(result: ClassificationResult, infoName?: string): string {
  if (infoName) return infoName;
  return `Vật thể (${result.className})`;
}

export function ScanHint() {
  return (
    <View style={styles.hintCard} accessibilityLiveRegion="polite">
      <View style={styles.hintIconWrap}>
        <Ionicons name="scan-outline" size={24} color={Colors.accent} />
      </View>
      <Text style={styles.hintText} maxFontSizeMultiplier={1.5}>
        Đưa một vật dụng vào khung giữa và giữ yên vài giây để phân tích.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glass,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 26,
  },
  name: {
    flex: 1,
    color: Colors.text,
    fontSize: Font.heading,
    fontWeight: '700',
  },
  confidencePill: {
    backgroundColor: 'rgba(10,132,255,0.2)',
    borderRadius: Radii.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidence: {
    color: Colors.accent,
    fontSize: Font.small,
    fontWeight: '700',
  },
  guidance: {
    color: Colors.textTernary,
    fontSize: Font.small,
    lineHeight: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,69,58,0.16)',
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  warningText: {
    flex: 1,
    color: Colors.danger,
    fontSize: Font.small,
    fontWeight: '600',
    lineHeight: 20,
  },
  resetButton: {
    marginTop: Spacing.sm,
    minHeight: TouchTarget - 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
  },
  resetPressed: {
    opacity: 0.85,
  },
  resetLabel: {
    color: '#FFFFFF',
    fontSize: Font.body,
    fontWeight: '700',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.glass,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: Spacing.lg,
  },
  hintIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10,132,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    flex: 1,
    color: Colors.textTernary,
    fontSize: Font.small,
    lineHeight: 21,
  },
});
