import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Font, Radii, Spacing, TouchTarget } from '@/constants/theme';

interface Props {
  canAskAgain: boolean;
  onRequest: () => void;
}

/** Full-area screen shown when the camera permission is missing/denied. */
export function PermissionScreen({ canAskAgain, onRequest }: Props) {
  const openSettings = () => {
    Linking.openSettings().catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji} allowFontScaling={false}>
          📷
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          Cần quyền camera
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.5}>
          EcoScan nhận diện rác trực tiếp ngay trên thiết bị của bạn. Ảnh camera
          không được tải lên bất kỳ đâu.
        </Text>
        {canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cấp quyền camera"
            onPress={onRequest}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonLabel}>Cấp quyền camera</Text>
          </Pressable>
        ) : (
          <View style={styles.deniedBlock}>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              Bạn đã từ chối quyền camera cho ứng dụng. Vui lòng bật quyền trong
              phần cài đặt hệ thống để sử dụng EcoScan.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở cài đặt hệ thống"
              onPress={openSettings}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <Text style={styles.buttonLabel}>Mở cài đặt hệ thống</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.bg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    color: Colors.text,
    fontSize: Font.heading,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: Colors.textSecondary,
    fontSize: Font.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  deniedBlock: {
    gap: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  button: {
    minHeight: TouchTarget,
    width: '100%',
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    color: '#062A33',
    fontSize: Font.body,
    fontWeight: '800',
  },
});