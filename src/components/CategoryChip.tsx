import { StyleSheet, Text, View } from 'react-native';
import type { WasteCategory } from '@/data/categories';
import { Font, Radii } from '@/constants/theme';

interface Props {
  category: WasteCategory;
  compact?: boolean;
}

export function CategoryChip({ category, compact = false }: Props) {
  return (
    <View
      style={[styles.chip, { backgroundColor: category.softBg }]}
      accessibilityLabel={category.accessibilityLabel}
    >
      <Text style={styles.emoji} allowFontScaling={false}>
        {category.emoji}
      </Text>
      <Text
        style={[styles.label, { color: category.color }, compact && styles.compactLabel]}
        maxFontSizeMultiplier={1.4}
      >
        {category.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: Radii.md - 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: Font.small,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compactLabel: {
    fontSize: Font.caption,
  },
});