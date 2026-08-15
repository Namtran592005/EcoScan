import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing, TouchTarget } from '@/constants/theme';

interface Props {
  onOpenSettings: () => void;
}

export function TitleBar({ onOpenSettings }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            <Text style={styles.titleEco}>Eco</Text>
            <Text>Scan</Text>
          </Text>
          <Text
            style={styles.subtitle}
            maxFontSizeMultiplier={1.4}
            numberOfLines={1}
          >
            Phân loại chất thải ngay trên thiết bị
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
          <Ionicons name="settings-outline" size={22} color={Colors.accent} />
        </Pressable>
      </View>
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
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  titleEco: {
    color: Colors.success,
  },
  subtitle: {
    color: Colors.textTernary,
    fontSize: Font.small,
    marginTop: 2,
  },
  settingsButton: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: TouchTarget / 2,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsPressed: {
    opacity: 0.6,
  },
});
