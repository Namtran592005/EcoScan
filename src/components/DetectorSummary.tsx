import { StyleSheet, Text, View } from 'react-native';
import { Colors, Font, Radii, Spacing } from '@/constants/theme';
import { CATEGORIES } from '@/data/categories';
import { CATEGORY_ORDER_FOR_STATS } from '@/data/wasteRules';
import type { CategoryCounts } from '@/hooks/useScanEngine';
import { CategoryChip } from './CategoryChip';

interface Props {
  objectCount: number;
  counts: CategoryCounts;
}

/**
 * Bottom summary for multi-object (detection) mode: total detected objects and
 * per-category statistics.
 */
export function DetectorSummary({ objectCount, counts }: Props) {
  const present = CATEGORY_ORDER_FOR_STATS.filter((id) => counts[id] > 0);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.countEmoji} allowFontScaling={false}>
          📊
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.5}>
          {objectCount > 0
            ? `${objectCount} vật thể được phát hiện`
            : 'Đang tìm vật thể...'}
        </Text>
      </View>

      {objectCount === 0 ? (
        <Text style={styles.hint} maxFontSizeMultiplier={1.5}>
          Đưa các món rác vào khung giữa để nhận diện.
        </Text>
      ) : (
        <View style={styles.chips}>
          {present.map((id) => (
            <CategoryChip
              key={id}
              category={CATEGORIES[id]}
              compact
            />
          ))}
        </View>
      )}

      {present.length > 0 ? (
        <View style={styles.statsRow}>
          {present.map((id) => (
            <View key={id} style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: CATEGORIES[id].color }]}
                allowFontScaling={false}
              >
                {counts[id]}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {CATEGORIES[id].label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countEmoji: {
    fontSize: 20,
  },
  title: {
    color: Colors.text,
    fontSize: Font.body,
    fontWeight: '800',
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: Font.small,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 72,
  },
  statValue: {
    fontSize: Font.heading,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: Font.caption,
  },
});