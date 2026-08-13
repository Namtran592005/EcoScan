import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, TouchTarget } from '@/constants/theme';
import type { ScanMode } from '@/hooks/useScanEngine';

interface Props {
  value: ScanMode;
  onChange: (mode: ScanMode) => void;
  disabled?: boolean;
}

const OPTIONS: { value: ScanMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] =
  [
    { value: 'single', label: 'Một vật', icon: 'cube-outline' },
    { value: 'multi', label: 'Nhiều vật', icon: 'layers-outline' },
  ];

export function ModeToggle({ value, onChange, disabled }: Props) {
  return (
    <View
      style={[styles.container, disabled && styles.disabled]}
      accessibilityRole="tablist"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              selected
                ? `Chế độ ${option.label}, đang chọn`
                : `Chuyển sang chế độ ${option.label}`
            }
            onPress={() => onChange(option.value)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionActive,
              pressed && styles.optionPressed,
            ]}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={selected ? Colors.text : Colors.textMuted}
            />
            <Text
              style={[styles.label, selected && styles.labelActive]}
              maxFontSizeMultiplier={1.4}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(44,44,46,0.9)',
    borderRadius: Radii.md,
    padding: 3,
    gap: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  option: {
    flex: 1,
    minHeight: TouchTarget - 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.md - 3,
    paddingHorizontal: 8,
  },
  optionActive: {
    backgroundColor: Colors.surfaceHigh,
  },
  optionPressed: {
    opacity: 0.7,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.text,
    fontWeight: '700',
  },
});
