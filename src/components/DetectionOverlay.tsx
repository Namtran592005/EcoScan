import { StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '@/data/categories';
import { categoryForClass, classInfoFor } from '@/data/wasteRules';
import type { DetectionBox } from '@/ai/types';
import { Colors } from '@/constants/theme';

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  /** On-screen rectangle of the square scan area. */
  rect: ScreenRect;
  boxes: DetectionBox[];
  /** Render the boxes as a tight green "confirmed" outline (single-object done). */
  confirmed?: boolean;
  /** When confirmed, label override from the classifier result. */
  confirmedLabel?: string;
}

/**
 * Draws detection bounding boxes over the square preview. Boxes arrive in
 * normalized model space; we map them linearly into the on-screen square.
 * While scanning the frame is thin (tracking); once confirmed it becomes a
 * tight green box wrapping the object.
 */
export function DetectionOverlay({
  rect,
  boxes,
  confirmed,
  confirmedLabel,
}: Props) {
  if (boxes.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {boxes.map((box, index) => {
        const categoryId = categoryForClass(box.className);
        const color = confirmed
          ? Colors.success
          : categoryId
            ? CATEGORIES[categoryId].color
            : 'rgba(255,255,255,0.95)';
        const info = classInfoFor(box.className);
        const left = rect.x + box.x * rect.width;
        const top = rect.y + box.y * rect.height;
        const width = box.width * rect.width;
        const height = box.height * rect.height;
        const label = `${confirmedLabel ?? info?.fieldName ?? box.className} ${
          confirmed ? '' : `${Math.round(box.confidence * 100)}%`
        }`;
        return (
          <View
            key={index}
            style={[
              styles.box,
              confirmed && styles.boxConfirmed,
              {
                left,
                top,
                width,
                height,
                borderColor: color,
              },
            ]}
          >
            <View
              style={[
                styles.labelChip,
                confirmed ? styles.labelChipConfirmed : { backgroundColor: color },
              ]}
            >
              <Text
                style={[styles.labelText, confirmed && styles.labelTextConfirmed]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  boxConfirmed: {
    borderWidth: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(50,215,75,0.08)',
  },
  labelChip: {
    position: 'absolute',
    top: -26,
    left: -2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 170,
  },
  labelChipConfirmed: {
    backgroundColor: Colors.success,
  },
  labelText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  labelTextConfirmed: {
    color: '#FFFFFF',
  },
});
