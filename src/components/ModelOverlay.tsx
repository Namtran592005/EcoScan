import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Font, Radii, Spacing, TouchTarget } from '@/constants/theme';
import type { ModelAvailability } from '@/ai/types';

interface Props {
  availability: ModelAvailability;
  onRetry: () => void;
  /** Show this overlay only for loading/error/unavailable/missing (not 'ready'). */
  visible: boolean;
}

/**
 * Centered overlay covering the scan area while a model loads, or explaining
 * why inference cannot run (error/unavailable/missing). Never fakes AI results.
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
              Đang tải mô hình…
            </Text>
          </>
        ) : availability.state === 'missing' ? (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="cube-outline" size={34} color={Colors.warning} />
            </View>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              Chưa sẵn sàng
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              Công cụ nhận diện chưa sẵn sàng. Vui lòng thử lại sau giây lát.
            </Text>
          </>
        ) : availability.state === 'unavailable' ? (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="flask-outline" size={34} color={Colors.warning} />
            </View>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              Cần bản cài đặt đầy đủ
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              {availability.message}
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              Phần nhận diện cần bản ứng dụng được cài đặt hoàn chỉnh. Vui lòng
              liên hệ người phát hành để được hỗ trợ.
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
            <View style={[styles.iconWrap, styles.iconWrapDanger]}>
              <Ionicons name="alert-circle" size={34} color={Colors.danger} />
            </View>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              Không thể tải mô hình
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.5}>
              Đã có lỗi khi nạp mô hình:
            </Text>
            <Text style={styles.error} maxFontSizeMultiplier={1.5}>
              {availability.state === 'error' ? availability.message : ''}
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
    backgroundColor: 'rgba(4,17,10,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,214,10,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: 'rgba(255,69,58,0.16)',
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
  error: {
    color: Colors.danger,
    fontSize: Font.small,
    textAlign: 'center',
    backgroundColor: 'rgba(255,69,58,0.12)',
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
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: Font.body,
    fontWeight: '700',
  },
});
