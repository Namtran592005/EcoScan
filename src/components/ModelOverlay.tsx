import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Font, Radii, Spacing, TouchTarget } from '@/constants/theme';
import type { ModelAvailability } from '@/ai/types';

interface Props {
  availability: ModelAvailability;
  onRetry: () => void;
  /** Show this overlay only for loading/error/unavailable (not 'ready'). */
  visible: boolean;
}

/**
 * Centered overlay covering the scan area while a model loads, or explaining
 * why inference cannot run (error/unavailable). Never fakes AI results.
 */
export function ModelOverlay({ availability, onRetry, visible }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {availability.state === 'loading' || availability.state === 'not-loaded' ? (
          <>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              Đang tải mô hình...
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              Mô hình nhận diện đang được nạp trên thiết bị của bạn. Vui lòng
              chờ trong giây lát.
            </Text>
          </>
        ) : availability.state === 'unavailable' ? (
          <>
            <Text style={styles.emoji} allowFontScaling={false}>
              🧪
            </Text>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              Cần chạy bằng Development Build
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              {availability.message}
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              ONNX Runtime là module native — ứng dụng này không chạy trong Expo
              Go. Hãy chạy “npm run android” (chi tiết trong README).
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thử lại"
              onPress={onRetry}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <Text style={styles.buttonLabel}>Thử lại</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.emoji} allowFontScaling={false}>
              ⚠️
            </Text>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              Không thể tải mô hình
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              Đã có lỗi khi nạp mô hình:
            </Text>
            <Text style={styles.error} maxFontSizeMultiplier={1.5}>
              {availability.state === 'error' ? availability.message : ''}
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              Kiểm tra file ONNX trong thư mục assets/models rồi thử lại.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thử lại tải mô hình"
              onPress={onRetry}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <Text style={styles.buttonLabel}>Tải lại</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,10,18,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
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
  error: {
    color: Colors.danger,
    fontSize: Font.small,
    textAlign: 'center',
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    width: '100%',
  },
  button: {
    minHeight: TouchTarget,
    width: '100%',
    borderRadius: Radii.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
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