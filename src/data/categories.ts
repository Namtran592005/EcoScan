/**
 * The four waste categories used across the app UI.
 *
 * These are presentation/guidance rules only, they are NOT a legal claim and
 * do not replace local regulations. UI copy always speaks in the direction of
 * guidance ("hướng dẫn").
 */
export type WasteCategoryId = 'recyclable' | 'food' | 'other' | 'hazardous';

export interface WasteCategory {
  id: WasteCategoryId;
  /** Short label shown on badges. */
  label: string;
  /** Full heading shown on the result card. */
  title: string;
  emoji: string;
  color: string;
  /** Solid background tint used on chips/cards. */
  softBg: string;
  /** Guidance text (Vietnamese). */
  guidance: string;
  /**
   * Extra guideline shown for hazardous waste. Kept separate so the app never
   * suggests mixing hazardous waste with household waste.
   */
  warningNote?: string;
  /** Spoken/text label used for accessibility + colour-independent meaning. */
  accessibilityLabel: string;
}

export const CATEGORIES: Record<WasteCategoryId, WasteCategory> = {
  recyclable: {
    id: 'recyclable',
    label: 'Tái chế',
    title: 'Chất thải tái chế',
    emoji: '♻️',
    color: '#34D399',
    softBg: 'rgba(52,211,153,0.14)',
    guidance:
      'Làm sạch và để khô trước khi bỏ vào thùng tái chế nếu phù hợp. Loại bỏ chất lỏng, thức ăn thừa bám vào bao bì.',
    accessibilityLabel: 'Nhóm tái chế. Loại chất thải này có thể tái sử dụng hoặc tái chế.',
  },
  food: {
    id: 'food',
    label: 'Thực phẩm',
    title: 'Chất thải thực phẩm',
    emoji: '🍃',
    color: '#A3E635',
    softBg: 'rgba(163,230,53,0.14)',
    guidance:
      'Cho vào thùng chất thải thực phẩm, ủ phân hoặc xử lý theo quy định địa phương. Không trộn chung với rác tái chế.',
    accessibilityLabel: 'Nhóm chất thải thực phẩm.',
  },
  other: {
    id: 'other',
    label: 'Rác sinh hoạt khác',
    title: 'Rác sinh hoạt khác',
    emoji: '🗑️',
    color: '#9CA3AF',
    softBg: 'rgba(156,163,175,0.14)',
    guidance:
      'Bỏ vào thùng rác sinh hoạt thông thường theo quy định của địa phương.',
    accessibilityLabel: 'Nhóm rác sinh hoạt khác, không thuộc các nhóm còn lại.',
  },
  hazardous: {
    id: 'hazardous',
    label: 'Chất thải nguy hại',
    title: 'Chất thải nguy hại',
    emoji: '⚠️',
    color: '#F87171',
    softBg: 'rgba(248,113,113,0.16)',
    guidance:
      'Không bỏ chung với rác sinh hoạt. Đưa đến điểm thu gom chất thải nguy hại gần nhất.',
    warningNote:
      'Ưu tiên cảnh báo nguy hại. Vui lòng liên hệ đơn vị thu gom của địa phương để được hướng dẫn xử lý.',
    accessibilityLabel: 'Cảnh báo. Nhóm chất thải nguy hại, tuyệt đối không bỏ chung với rác sinh hoạt.',
  },
};

export const CATEGORY_ORDER: WasteCategoryId[] = [
  'recyclable',
  'food',
  'other',
  'hazardous',
];