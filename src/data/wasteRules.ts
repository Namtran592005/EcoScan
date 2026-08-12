import { CATEGORIES, type WasteCategoryId } from './categories';

/**
 * Waste classification mapping layer.
 *
 * The AI model only outputs a class key (e.g. "plastic"). This module decides
 * which waste category each class belongs to — adjusting this mapping requires
 * no retraining and no model swap.
 *
 * WARNING: this is guidance data, not a legal/regulatory authority. It never
 * replaces local waste regulations.
 */
export type WasteClassId =
  | 'battery'
  | 'biological'
  | 'cardboard'
  | 'glass'
  | 'metal'
  | 'paper'
  | 'plastic'
  | 'trash';

export interface WasteClassInfo {
  /** Natural-language name shown on the result card (Vietnamese). */
  name: string;
  fieldName: string;
  emoji: string;
  /** Very short disposal hint appended to the category guidance. */
  tip: string;
  category: WasteCategoryId;
}

/** Mapping from AI class → category. Edit here to change behaviour. */
export const WASTE_CLASS_TO_CATEGORY: Record<WasteClassId, WasteCategoryId> = {
  plastic: 'recyclable',
  paper: 'recyclable',
  cardboard: 'recyclable',
  glass: 'recyclable',
  metal: 'recyclable',
  biological: 'food',
  battery: 'hazardous',
  trash: 'other',
};

export const WASTE_CLASSES: Record<WasteClassId, WasteClassInfo> = {
  battery: {
    name: 'Pin',
    fieldName: 'Battery',
    emoji: '🔋',
    tip: 'Có thể gây cháy nổ nếu hỏng — không bỏ cùng rác thường.',
    category: 'hazardous',
  },
  biological: {
    name: 'Thức ăn thừa',
    fieldName: 'Biological',
    emoji: '🍃',
    tip: 'Ủ phân hoặc cho vào thùng chất thải thực phẩm.',
    category: 'food',
  },
  cardboard: {
    name: 'Bìa carton',
    fieldName: 'Cardboard',
    emoji: '📦',
    tip: 'Bóp dẹp trước khi bỏ để tiết kiệm diện tích.',
    category: 'recyclable',
  },
  glass: {
    name: 'Thủy tinh',
    fieldName: 'Glass',
    emoji: '🫙',
    tip: 'Rửa sạch; bọc cẩn thận vật sắc nhọn.',
    category: 'recyclable',
  },
  metal: {
    name: 'Kim loại',
    fieldName: 'Metal',
    emoji: '🥫',
    tip: 'Rửa sạch lon/hộp trước khi tái chế.',
    category: 'recyclable',
  },
  paper: {
    name: 'Giấy',
    fieldName: 'Paper',
    emoji: '📄',
    tip: 'Giữ khô, tránh dính thức ăn.',
    category: 'recyclable',
  },
  plastic: {
    name: 'Chai nhựa',
    fieldName: 'Plastic',
    emoji: '🧴',
    tip: 'Đổ hết chất lỏng trước khi phân loại nếu phù hợp.',
    category: 'recyclable',
  },
  trash: {
    name: 'Rác khác',
    fieldName: 'Trash',
    emoji: '🗑️',
    tip: 'Kiểm tra lại — nếu không chắc, hãy bỏ vào rác sinh hoạt.',
    category: 'other',
  },
};

/** Look up the full category for an AI class key. */
export function categoryForClass(
  className: string,
): WasteCategoryId | undefined {
  return WASTE_CLASS_TO_CATEGORY[
    className as WasteClassId
  ];
}

/** Look up human-facing info for an AI class key. */
export function classInfoFor(className: string): WasteClassInfo | undefined {
  return WASTE_CLASSES[className as WasteClassId];
}

/** Order used for per-category statistics in multi-object mode. */
export const CATEGORY_ORDER_FOR_STATS = [
  'recyclable',
  'food',
  'other',
  'hazardous',
] as const;

export function categoryName(id: WasteCategoryId): string {
  return CATEGORIES[id].label;
}