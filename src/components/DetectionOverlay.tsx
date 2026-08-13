import { StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '@/data/categories';
import { categoryForClass, classInfoFor } from '@/data/wasteRules';
import type { DetectionBox } from '@/ai/types';

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
}

/**
 * Draws detection bounding boxes over the square preview. Boxes arrive in
 * normalized model space; we map them linearly into the on-screen square.
 */
export function DetectionOverlay({ rect, boxes }: Props) {
  if (boxes.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {boxes.map((box, index) => {
        const categoryId = categoryForClass(box.className);
        const color = categoryId ? CATEGORIES[categoryId].color : '#FFFFFF';
        const info = classInfoFor(box.className);
        const left = rect.x + box.x * rect.width;
        const top = rect.y + box.y * rect.height;
        const width = box.width * rect.width;
        const height = box.height * rect.height;
        const label = `${info?.fieldName ?? box.className} ${Math.round(
          box.confidence * 100,
        )}%`;
        return (
          <View
            key={index}
            style={[
              styles.box,
              {
                left,
                top,
                width,
                height,
                borderColor: color,
              },
            ]}
          >
            <View style={[styles.labelChip, { backgroundColor: color }]}>
              <Text style={styles.labelText} numberOfLines={1}>
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
  labelChip: {
    position: 'absolute',
    top: -26,
    left: -2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 170,
  },
  labelText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
});
