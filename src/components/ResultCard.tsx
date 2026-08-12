import { Pressable, StyleSheet, Text, View } from 'react-native';
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
          <Text style={styles.confidence}>{Math.round(result.confidence * 100)}%</Text>
        ) : null}
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
              <Text style={styles.warningText} maxFontSizeMultiplier={1.5}>
                {category.emoji} {category.warningNote}
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
    <View style={styles.card} accessibilityLiveRegion="polite">
      <Text style={styles.hintEmoji} allowFontScaling={false}>
        🎯
      </Text>
      <Text style={styles.hintText} maxFontSizeMultiplier={1.5}>
        Đưa một món rác vào khung giữa màn hình và giữ yên trong vài giây để
        phân tích.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontWeight: '800',
  },
  confidence: {
    color: Colors.accent,
    fontSize: Font.body,
    fontWeight: '800',
  },
  guidance: {
    color: Colors.textSecondary,
    fontSize: Font.small,
    lineHeight: 20,
  },
  warningBanner: {
    backgroundColor: 'rgba(248,113,113,0.16)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  warningText: {
    color: Colors.danger,
    fontSize: Font.small,
    fontWeight: '600',
    lineHeight: 20,
  },
  resetButton: {
    marginTop: Spacing.sm,
    minHeight: TouchTarget,
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetPressed: {
    opacity: 0.8,
  },
  resetLabel: {
    color: '#062A33',
    fontSize: Font.body,
    fontWeight: '800',
  },
  hintEmoji: {
    fontSize: 24,
  },
  hintText: {
    color: Colors.textSecondary,
    fontSize: Font.body,
    lineHeight: 22,
  },
});