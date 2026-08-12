import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Font, Spacing, TouchTarget } from '@/constants/theme';
import { ModeToggle } from './ModeToggle';
import type { ScanMode } from '@/hooks/useScanEngine';

interface Props {
  mode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  onOpenSettings: () => void;
  modeDisabled?: boolean;
}

export function TitleBar({ mode, onModeChange, onOpenSettings, modeDisabled }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            EcoScan
          </Text>
          <Text
            style={styles.subtitle}
            maxFontSizeMultiplier={1.4}
            numberOfLines={1}
          >
            Nhận diện rác ngay trên thiết bị
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cài đặt và thông tin"
          onPress={onOpenSettings}
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.settingsPressed,
          ]}
          hitSlop={8}
        >
          <Text style={styles.settingsIcon} allowFontScaling={false}>
            ⚙️
          </Text>
        </Pressable>
      </View>
      <ModeToggle value={mode} onChange={onModeChange} disabled={modeDisabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: Font.title,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Font.small,
    marginTop: 2,
  },
  settingsButton: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: TouchTarget / 2,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsPressed: {
    opacity: 0.6,
  },
  settingsIcon: {
    fontSize: 20,
  },
});