import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      return 'Đang phân tích…';
    case 'confirmed':
      return 'Đã nhận diện';
  }
}

const FRAME_RADIUS = 24;

/**
 * iOS-style scan frame: a compact, crisp square with faint frosted-white fill
 * and sharp white corner brackets, overlaid on the live camera.
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
          },
        ]}
      >
        {/* Faint frosted fill + subtle inner glow */}
        <View style={[styles.glassFill, confirmed && styles.glassFillConfirmed]} />

        <View
          style={[styles.corner, styles.topLeft, confirmed && styles.cornerConfirmed]}
        />
        <View
          style={[styles.corner, styles.topRight, confirmed && styles.cornerConfirmed]}
        />
        <View
          style={[styles.corner, styles.bottomLeft, confirmed && styles.cornerConfirmed]}
        />
        <View
          style={[styles.corner, styles.bottomRight, confirmed && styles.cornerConfirmed]}
        />
      </View>

      <View style={[styles.statusPill, confirmed && styles.statusPillConfirmed]}>
        {status === 'analyzing' && !confirmed ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : confirmed ? (
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
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
          <Ionicons name="warning-outline" size={16} color="#1C1C1E" />
          <Text style={styles.hintText} maxFontSizeMultiplier={1.5}>
            Không chắc chắn — thử gần và sáng hơn
          </Text>
        </View>
      )}
    </View>
  );
}

const CORNER = 30;
const CORNER_THICK = 4;

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
    borderRadius: FRAME_RADIUS,
  },
  glassFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: FRAME_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  glassFillConfirmed: {
    borderColor: 'rgba(50,215,75,0.8)',
    backgroundColor: 'rgba(50,215,75,0.08)',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cornerConfirmed: {
    borderColor: Colors.success,
  },
  topLeft: {
    top: -3,
    left: -3,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderTopLeftRadius: FRAME_RADIUS,
  },
  topRight: {
    top: -3,
    right: -3,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderTopRightRadius: FRAME_RADIUS,
  },
  bottomLeft: {
    bottom: -3,
    left: -3,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderBottomLeftRadius: FRAME_RADIUS,
  },
  bottomRight: {
    bottom: -3,
    right: -3,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderBottomRightRadius: FRAME_RADIUS,
  },
  statusPill: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.glass,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '88%',
  },
  statusPillConfirmed: {
    backgroundColor: 'rgba(28,28,30,0.9)',
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
    bottom: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 24,
  },
  hintText: {
    color: '#1C1C1E',
    fontSize: Font.small,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});
