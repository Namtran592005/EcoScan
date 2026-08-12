import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Font, Radii, Spacing } from '@/constants/theme';
import { TitleBar } from '@/components/TitleBar';
import { HudOverlay } from '@/components/HudOverlay';
import { DetectionOverlay } from '@/components/DetectionOverlay';
import { ResultCard, ScanHint } from '@/components/ResultCard';
import { DetectorSummary } from '@/components/DetectorSummary';
import { DebugOverlay } from '@/components/DebugOverlay';
import { PermissionScreen } from '@/components/PermissionScreen';
import { ModelOverlay } from '@/components/ModelOverlay';
import { useScanEngine, type ScanMode } from '@/hooks/useScanEngine';
import { useModelAvailability } from '@/hooks/useModelAvailability';
import {
  classifierAvailability,
  detectorAvailability,
  getClassifier,
  getDetector,
  resetClassifier,
  resetDetector,
} from '@/ai/modelManager';
import type { WasteClassifier, WasteDetector } from '@/ai/types';
import { perf } from '@/utils/perf';

export default function ScanScreen() {
  useKeepAwake();

  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Record preview (JS rAF) pacing for the debug overlay.
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      perf.recordPreviewFrame();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const [mode, setMode] = useState<ScanMode>('single');
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const { availability: classifyAvailability, retry: retryClassifier } =
    useModelAvailability(classifierAvailability, resetClassifier);
  const { availability: detectAvailability, retry: retryDetector } =
    useModelAvailability(detectorAvailability, resetDetector);

  const [classifier, setClassifier] = useState<WasteClassifier | null>(null);
  const [detector, setDetector] = useState<WasteDetector | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (classifyAvailability.state === 'ready' && !classifier) {
      getClassifier()
        .then((instance) => {
          if (!cancelled) setClassifier(instance);
        })
        .catch(() => resetClassifier());
    }
    if (detectAvailability.state === 'ready' && !detector) {
      getDetector()
        .then((instance) => {
          if (!cancelled) setDetector(instance);
        })
        .catch(() => resetDetector());
    }
    return () => {
      cancelled = true;
    };
  }, [classifyAvailability.state, detectAvailability.state, classifier, detector]);

  const permissionGranted = permission?.granted === true;
  const showPermissionScreen = permission && !permission.granted;

  const currentAvailability =
    mode === 'single' ? classifyAvailability : detectAvailability;
  const currentReady = currentAvailability.state === 'ready';

  const engineActive = isFocused && permissionGranted && currentReady;
  const engine = useScanEngine({
    cameraRef,
    mode,
    active: engineActive,
    classifier,
    detector,
  });

  // Square scan region = centred min-dimension square of the preview zone.
  const [zoneSize, setZoneSize] = useState({ width: 0, height: 0 });
  const onZoneLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    requestAnimationFrame(() => {
      setZoneSize({ width, height });
    });
  };
  const side = Math.max(0, Math.min(zoneSize.width, zoneSize.height));
  const previewRect = {
    x: (zoneSize.width - side) / 2,
    y: (zoneSize.height - side) / 2,
    width: side,
    height: side,
  };

  const openSettings = () => router.push('/settings');

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TitleBar
          mode={mode}
          onModeChange={setMode}
          onOpenSettings={openSettings}
          modeDisabled={!!showPermissionScreen}
        />
      </SafeAreaView>

      <View style={styles.zone} onLayout={onZoneLayout}>
        {permissionGranted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            autofocus="on"
            mirror={false}
            active
          />
        ) : null}

        {permissionGranted && side > 0 ? (
          mode === 'single' ? (
            <HudOverlay
              side={side}
              status={engine.status}
              uncertainHint={engine.uncertainHint}
            />
          ) : (
            <DetectionOverlay rect={previewRect} boxes={engine.detections} />
          )
        ) : null}

        <DebugOverlay
          mode={mode}
          classifierRuntime={classifier?.runtime ?? null}
          detectorRuntime={detector?.runtime ?? null}
        />

        <ModelOverlay
          availability={currentAvailability}
          onRetry={mode === 'single' ? retryClassifier : retryDetector}
          visible={permissionGranted && !currentReady}
        />

        {engine.error ? <ErrorBanner message={engine.error} /> : null}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {mode === 'single' ? (
          engine.status === 'confirmed' && engine.classification ? (
            <ResultCard result={engine.classification} onReset={engine.reset} />
          ) : (
            <ScanHint />
          )
        ) : (
          <DetectorSummary
            objectCount={engine.objectCount}
            counts={engine.counts}
          />
        )}
      </SafeAreaView>

      {showPermissionScreen ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <PermissionScreen
            canAskAgain={permission.canAskAgain}
            onRequest={requestPermission}
          />
        </View>
      ) : null}
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Pressable style={styles.errorPressable} disabled>
        <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>
          {message}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topBar: {
    backgroundColor: Colors.bg,
  },
  zone: {
    flex: 1,
    margin: Spacing.sm,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: '#05080F',
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  errorBanner: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
  },
  errorPressable: {
    backgroundColor: 'rgba(248,113,113,0.92)',
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  errorText: {
    color: '#3B0A0A',
    fontSize: Font.small,
    fontWeight: '700',
    textAlign: 'center',
  },
});