import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
        <View style={styles.iconWrap}>
          <Ionicons name="camera" size={36} color={Colors.accent} />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          Cần quyền camera
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.5}>
          EcoScan giúp phân loại chất thải trực tiếp trên thiết bị của bạn. Ảnh
          camera không được tải lên bất kỳ đâu.
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
              <Text style={styles.buttonLabel}>Mở Cài đặt</Text>
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
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(10,132,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontSize: Font.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: Colors.textTernary,
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
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: Font.body,
    fontWeight: '700',
  },
});
