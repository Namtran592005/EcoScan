import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, Font, Radii } from '@/constants/theme';
import type { ScanStatus } from '@/hooks/useScanEngine';

interface Props {
  /** Size of the square scan area (matches the model input region). */
  side: number;
  status: ScanStatus;
  uncertainHint: boolean;
}

function statusText(status: ScanStatus): string {
  switch (status) {
    case 'idle':
      return 'Đưa vật thể vào khung';
    case 'analyzing':
      return 'Đang phân tích...';
    case 'confirmed':
      return 'Đã nhận diện ✓';
  }
}

/**
 * Rounded-rectangle HUD placed over the scan area. The frame represents the
 * exact region that gets feed into the model (the square preview crop).
 */
export function HudOverlay({ side, status, uncertainHint }: Props) {
  const confirmed = status === 'confirmed';
  return (
    <View style={styles.wrapper} pointerEvents="none">
      <View
        style={[
          styles.frame,
          {
            width: side,
            height: side,
            borderColor: confirmed ? Colors.success : Colors.accent,
          },
        ]}
      >
        {!confirmed && (
          <>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </>
        )}
      </View>

      <View style={styles.statusPill}>
        {status === 'analyzing' ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : null}
        <Text
          style={[styles.statusText, confirmed && styles.statusTextConfirmed]}
          maxFontSizeMultiplier={1.5}
        >
          {statusText(status)}
        </Text>
      </View>

      {uncertainHint && (
        <View style={styles.hintPill}>
          <Text style={styles.hintText} maxFontSizeMultiplier={1.5}>
            Không chắc chắn — hãy thử đưa vật thể gần hơn và đủ sáng hơn
          </Text>
        </View>
      )}
    </View>
  );
}

const CORNER = 22;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    borderRadius: Radii.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopColor: Colors.accent,
    borderLeftColor: Colors.accent,
    borderTopLeftRadius: Radii.xl,
  },
  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopColor: Colors.accent,
    borderRightColor: Colors.accent,
    borderTopRightRadius: Radii.xl,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomColor: Colors.accent,
    borderLeftColor: Colors.accent,
    borderBottomLeftRadius: Radii.xl,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomColor: Colors.accent,
    borderRightColor: Colors.accent,
    borderBottomRightRadius: Radii.xl,
  },
  statusPill: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '88%',
  },
  statusText: {
    color: Colors.text,
    fontSize: Font.body,
    fontWeight: '600',
  },
  statusTextConfirmed: {
    color: Colors.success,
  },
  hintPill: {
    position: 'absolute',
    bottom: 76,
    backgroundColor: 'rgba(251,191,36,0.92)',
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
  },
  hintText: {
    color: '#1F2937',
    fontSize: Font.small,
    fontWeight: '600',
    textAlign: 'center',
  },
});