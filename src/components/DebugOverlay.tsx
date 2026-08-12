import { StyleSheet, Text, View } from 'react-native';
import { Colors, Font, Spacing } from '@/constants/theme';
import { usePerfStats } from '@/hooks/usePerfStats';
import { useDebugEnabled } from '@/utils/appSettings';
import { CLASSIFY_CONFIDENCE_THRESHOLD } from '@/data/thresholds';
import type { ModelRuntimeInfo } from '@/ai/types';
import type { ScanMode } from '@/hooks/useScanEngine';

interface Props {
  mode: ScanMode;
  classifierRuntime: ModelRuntimeInfo | null;
  detectorRuntime: ModelRuntimeInfo | null;
}

/** Live debug overlay — only rendered when "debug" is enabled in Settings. */
export function DebugOverlay({ mode, classifierRuntime, detectorRuntime }: Props) {
  const enabled = useDebugEnabled();
  const perf = usePerfStats();

  if (!enabled) return null;

  const active = mode === 'single' ? classifierRuntime : detectorRuntime;

  return (
    <View style={styles.panel} pointerEvents="none" accessibilityElementsHidden>
      <Row label="Chế độ" value={mode === 'single' ? 'Một vật' : 'Nhiều vật'} />
      <Row label="Preview" value={`${perf.previewFps.toFixed(1)} fps`} />
      <Row label="Inference" value={`${perf.inferenceFps.toFixed(1)} fps`} />
      <Row label="Cycle" value={`${perf.avgCycleLatencyMs} ms (avg)`} />
      <Row label="Cycles" value={`${perf.cycles}`} />
      <Row label="Model" value={active?.modelPath ?? '—'} />
      <Row label="EP" value={active?.executionProvider ?? '—'} />
      <Row label="Input" value={active?.inputSize ? `${active.inputSize}²` : '—'} />
      <Row label="Conf ≥" value={`${Math.round(CLASSIFY_CONFIDENCE_THRESHOLD * 100)}%`} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(6,10,18,0.8)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: Spacing.sm,
    gap: 2,
    maxWidth: '62%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Font.caption,
  },
  value: {
    color: Colors.text,
    fontSize: Font.caption,
    fontWeight: '700',
    flexShrink: 1,
  },
});