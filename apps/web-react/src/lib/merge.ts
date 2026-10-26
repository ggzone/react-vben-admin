/**
 * 深度合并工具 —— 与官方 @vben-core/shared/utils merge（defu）行为对齐
 * 前面的对象优先，后面的对象仅补齐缺失字段；undefined 不覆盖已有值
 */
type Mergeable = Record<string, unknown>;

function isPlainObject(value: unknown): value is Mergeable {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function defu(...objects: unknown[]): Mergeable {
  const result: Mergeable = {};

  for (const obj of objects) {
    if (!obj) continue;
    if (!isPlainObject(obj)) {
      // defu 对非对象源直接忽略（首个对象需为对象）
      continue;
    }
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value === undefined) continue;
      const existing = result[key];
      if (isPlainObject(value) && isPlainObject(existing)) {
        result[key] = defu(existing, value);
      } else if (existing === undefined) {
        result[key] = isPlainObject(value) ? defu(value) : value;
      }
    }
  }
  return result;
}

export { defu as merge };
