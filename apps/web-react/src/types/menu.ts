/**
 * 菜单记录类型（与官方 MenuRecordRaw 对齐）
 */
export interface MenuRecordRaw {
  activeIcon?: string;
  badge?: string;
  badgeType?: string;
  badgeVariants?: string;
  children?: MenuRecordRaw[];
  icon?: string;
  name: string;
  order?: number;
  parent?: string[];
  parents?: string[];
  path: string;
  query?: Record<string, string>;
  show?: boolean;
}
