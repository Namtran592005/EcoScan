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
  | 'clothes'
  | 'glass'
  | 'metal'
  | 'paper'
  | 'plastic'
  | 'shoes'
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
  clothes: 'recyclable',
  shoes: 'recyclable',
  biological: 'food',
  battery: 'hazardous',
  trash: 'other',
};

export const WASTE_CLASSES: Record<WasteClassId, WasteClassInfo> = {
  battery: {
    name: 'Pin',
    fieldName: 'Battery',
    emoji: '🔋',
    tip: 'Có thể gây cháy nổ nếu hỏng — không bỏ cùng chất thải thường.',
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
  clothes: {
    name: 'Quần áo cũ',
    fieldName: 'Clothes',
    emoji: '👕',
        tip: 'Còn dùng được có thể quyên góp; nếu không, bỏ vào thùng phù hợp.',
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
  shoes: {
    name: 'Giày dép',
    fieldName: 'Shoes',
    emoji: '👟',
    tip: 'Còn dùng được có thể quyên góp; nếu không, bỏ vào thùng phù hợp.',
    category: 'recyclable',
  },
  trash: {
    name: 'Chất thải khác',
    fieldName: 'Trash',
    emoji: '🗑️',
    tip: 'Kiểm tra lại — nếu không chắc, hãy bỏ vào thùng chất thải phù hợp.',
    category: 'other',
  },
};

/**
 * Order of the bundled 10-class classifier (assets/models/phanloai.onnx),
 * matching the model's class order: index 0 = battery … 9 = trash.
 * The adapter returns generic keys `class_0..class_9`; this array maps them
 * onto named waste classes so the UI shows real labels.
 */
export const BUNDLED_CLASSIFIER_CLASS_ORDER: WasteClassId[] = [
  'battery',
  'biological',
  'cardboard',
  'clothes',
  'glass',
  'metal',
  'paper',
  'plastic',
  'shoes',
  'trash',
];

/** Look up the full category for an AI class key. */
export function categoryForClass(
  className: string,
): WasteCategoryId | undefined {
  const id = resolveWasteClassId(className);
  return id ? WASTE_CLASS_TO_CATEGORY[id] : undefined;
}

/** Look up human-facing info for an AI class key. */
export function classInfoFor(className: string): WasteClassInfo | undefined {
  const id = resolveWasteClassId(className);
  return id ? WASTE_CLASSES[id] : undefined;
}

/** Resolve `class_N` (adapter output) or a direct class key to a known id. */
function resolveWasteClassId(className: string): WasteClassId | undefined {
  const indexed = /^class_(\d+)$/.exec(className);
  if (indexed) {
    return BUNDLED_CLASSIFIER_CLASS_ORDER[Number(indexed[1])];
  }
  return WASTE_CLASSES[className as WasteClassId]
    ? (className as WasteClassId)
    : undefined;
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