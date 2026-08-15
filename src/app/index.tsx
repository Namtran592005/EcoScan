import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Font, Radii, Spacing } from '@/constants/theme';
import { TitleBar } from '@/components/TitleBar';
import { HudOverlay } from '@/components/HudOverlay';
import { DetectionOverlay } from '@/components/DetectionOverlay';
import { ResultCard, ScanHint } from '@/components/ResultCard';
import { DebugOverlay } from '@/components/DebugOverlay';
import { PermissionScreen } from '@/components/PermissionScreen';
import { ModelOverlay } from '@/components/ModelOverlay';
import { useScanEngine } from '@/hooks/useScanEngine';
import { useModelAvailability } from '@/hooks/useModelAvailability';
import {
  classifierAvailability,
  getClassifier,
  getDetector,
  resetClassifier,
} from '@/ai/modelManager';
import { useModelStoreVersion } from '@/services/modelStore';
import { HUD_CROP_FRACTION } from '@/data/thresholds';
import { classInfoFor } from '@/data/wasteRules';
import type { WasteClassifier, WasteDetector } from '@/ai/types';
import { perf } from '@/utils/perf';

export default function ScanScreen() {
  // Suppress the unhandled-rejection from deactivate when navigating away
  // ("current activity is no longer available" on Android).
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });

  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Capture a modest picture size (not the full 12MP sensor) so every scan
  // cycle is fast and crisp — a 12MP shot per frame drops FPS and adds motion
  // blur, which hurts detection accuracy more than resolution helps.
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const onCameraReady = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam) return;
    try {
      const sizes = await cam.getAvailablePictureSizesAsync();
      const chosen = pick4to3PictureSize(sizes);
      if (chosen) setPictureSize(chosen);
    } catch {
      // Fall back to the camera default.
    }
  }, []);

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

  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const modelStoreVersion = useModelStoreVersion();

  const { availability: classifyAvailability, retry: retryClassifier } =
    useModelAvailability(classifierAvailability, resetClassifier, modelStoreVersion);

  const [classifier, setClassifier] = useState<WasteClassifier | null>(null);
  const [detector, setDetector] = useState<WasteDetector | null>(null);

  // When the model store changes, drop the cached adapter instances so they
  // are re-created from the new configuration.
  const prevStoreVersion = useRef(modelStoreVersion);
  useEffect(() => {
    if (prevStoreVersion.current !== modelStoreVersion) {
      prevStoreVersion.current = modelStoreVersion;
      resetClassifier();
      setClassifier(null);
      setDetector(null);
    }
  }, [modelStoreVersion]);

  useEffect(() => {
    let cancelled = false;
    if (classifyAvailability.state === 'ready' && !classifier) {
      getClassifier()
        .then((instance) => {
          if (!cancelled) setClassifier(instance);
        })
        .catch(() => resetClassifier());
    }
    // The detector still loads so a thin realtime tracking box can wrap the
    // object while scanning.
    if (classifyAvailability.state === 'ready' && !detector) {
      getDetector()
        .then((instance) => {
          if (!cancelled) setDetector(instance);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [classifyAvailability.state, classifier, detector]);

  const permissionGranted = permission?.granted === true;
  const showPermissionScreen = permission && !permission.granted;

  const currentReady = classifyAvailability.state === 'ready';

  const engineActive = isFocused && permissionGranted && currentReady;
  const engine = useScanEngine({
    cameraRef,
    active: engineActive,
    classifier,
    detector,
  });

  // The camera photo is 4:3 (matches `ratio="4:3"` on CameraView, which sets
  // the preview scale to FIT). We compute the actual visible camera rect so the
  // HUD square and detection boxes align with the region the model analyzes —
  // otherwise boxes drift off the real object ("no feedback" / inaccurate).
  const [zoneSize, setZoneSize] = useState({ width: 0, height: 0 });
  const onZoneLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    requestAnimationFrame(() => {
      setZoneSize({ width, height });
    });
  };
  const cameraRect = fitAspect(zoneSize, 4 / 3);
  // The engine analyzes the HUD square (62% of the camera rect) centered on
  // the preview, so the visible square must match what the model sees.
  const side = Math.max(
    0,
    Math.min(cameraRect.width, cameraRect.height) * HUD_CROP_FRACTION,
  );
  const previewRect = {
    x: cameraRect.x + (cameraRect.width - side) / 2,
    y: cameraRect.y + (cameraRect.height - side) / 2,
    width: side,
    height: side,
  };

  const openSettings = () => router.push('/settings');

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TitleBar onOpenSettings={openSettings} />
      </SafeAreaView>

      <View style={styles.zone} onLayout={onZoneLayout}>
        {permissionGranted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            autofocus="on"
            mirror={false}
            active={engine.status !== 'confirmed'}
            animateShutter={false}
            ratio="4:3"
            pictureSize={pictureSize}
            onCameraReady={onCameraReady}
          />
        ) : null}

        {permissionGranted && side > 0 ? (
          engine.status === 'confirmed' ? (
            // Tight green box wrapping the object replaces the static
            // square once the object is identified.
            <DetectionOverlay
              rect={previewRect}
              boxes={engine.detections}
              confirmed
              confirmedLabel={
                engine.classification
                  ? classInfoFor(engine.classification.className)?.fieldName ??
                    engine.classification.className
                  : undefined
              }
            />
          ) : (
            <>
              <DetectionOverlay rect={previewRect} boxes={engine.detections} />
              <HudOverlay
                side={side}
                status={engine.status}
                uncertainHint={engine.uncertainHint}
              />
            </>
          )
        ) : null}

        <DebugOverlay
          classifierRuntime={classifier?.runtime ?? null}
        />

        <ModelOverlay
          availability={classifyAvailability}
          onRetry={retryClassifier}
          visible={permissionGranted && !currentReady}
        />

        {engine.error ? <ErrorBanner message={engine.error} /> : null}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {engine.status === 'confirmed' && engine.classification ? (
          <ResultCard result={engine.classification} onReset={engine.reset} />
        ) : (
          <ScanHint />
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
        <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
        <Text style={styles.errorText} maxFontSizeMultiplier={1.4}>
          {message}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Pick a 4:3 picture size close to 1280×960 (a sweet spot: plenty of detail
 * for a 640 model input, but far faster to capture/encode than 12MP on every
 * scan frame). Falls back to the largest available 4:3 size.
 */
function pick4to3PictureSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((s) => {
      const m = /^(\d+)x(\d+)$/.exec(s.trim());
      if (!m) return null;
      const w = Number(m[1]);
      const h = Number(m[2]);
      return { w, h, label: s };
    })
    .filter((v): v is { w: number; h: number; label: string } => v !== null);
  const fourByThree = parsed.filter((p) => {
    const ratio = p.w / p.h;
    return Math.abs(ratio - 4 / 3) < 0.02;
  });
  const pool = fourByThree.length > 0 ? fourByThree : parsed;
  if (pool.length === 0) return undefined;
  const target = 1440 * 1080;
  pool.sort(
    (a, b) =>
      Math.abs(a.w * a.h - target) - Math.abs(b.w * b.h - target),
  );
  return pool[0].label;
}

/** Center a rect of `aspect` (w/h) inside `outer`, letterboxed (FIT). */
function fitAspect(
  outer: { width: number; height: number },
  aspect: number,
): { x: number; y: number; width: number; height: number } {
  const { width, height } = outer;
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let w: number;
  let h: number;
  if (width / aspect <= height) {
    // Fit by width; height is derived (letterbox top/bottom).
    w = width;
    h = width / aspect;
  } else {
    // Fit by height; width is derived (letterbox left/right).
    h = height;
    w = height * aspect;
  }
  return {
    x: (width - w) / 2,
    y: (height - h) / 2,
    width: w,
    height: h,
  };
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
    backgroundColor: '#04110a',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,69,58,0.92)',
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  errorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: Font.small,
    fontWeight: '700',
    textAlign: 'center',
  },
});