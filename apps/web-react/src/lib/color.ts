/**
 * 颜色工具 —— 与官方 @vben-core/shared/color 1:1 对齐
 */
import { getColors } from 'theme-colors';
import { TinyColor } from '@ctrl/tinycolor';

export { TinyColor };

/**
 * 将颜色转换为HSL格式。
 * HSL是一种颜色模型，包括色相(Hue)、饱和度(Saturation)、亮度(Lightness)三个部分。
 */
export function convertToHsl(color: string): string {
  const { a, h, l, s } = new TinyColor(color).toHsl();
  const hsl = `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
  return a < 1 ? `${hsl} ${a}` : hsl;
}

/**
 * 将颜色转换为HSL CSS变量。
 */
export function convertToHslCssVar(color: string): string {
  const { a, h, l, s } = new TinyColor(color).toHsl();
  const hsl = `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  return a < 1 ? `${hsl} / ${a}` : hsl;
}

/**
 * 将颜色转换为RGB颜色字符串
 * TinyColor无法处理hsl内包含'deg'、'grad'、'rad'或'turn'的字符串
 * 比如 hsl(231deg 98% 65%)将被解析为rgb(0, 0, 0)
 * 这里在转换之前先将这些单位去掉
 */
export function convertToRgb(str: string): string {
  return new TinyColor(str.replaceAll(/deg|grad|rad|turn/g, '')).toRgbString();
}

/**
 * 检查颜色是否有效
 */
export function isValidColor(color?: string) {
  if (!color) {
    return false;
  }
  return new TinyColor(color).isValid;
}

interface ColorItem {
  alias?: string;
  color: string;
  name: string;
}

/**
 * 生成颜色 CSS 变量（色阶 50-950），与官方 generatorColorVariables 一致
 */
export function generatorColorVariables(colorItems: ColorItem[]) {
  const colorVariables: Record<string, string> = {};

  colorItems.forEach(({ alias, color, name }) => {
    if (color) {
      const colorsMap = getColors(new TinyColor(color).toHexString());

      let mainColor = colorsMap['500'];

      const colorKeys = Object.keys(colorsMap);

      colorKeys.forEach((key) => {
        const colorValue = colorsMap[key];

        if (colorValue) {
          const hslColor = convertToHslCssVar(colorValue);
          colorVariables[`--${name}-${key}`] = hslColor;
          if (alias) {
            colorVariables[`--${alias}-${key}`] = hslColor;
          }

          if (key === '500') {
            mainColor = hslColor;
          }
        }
      });
      if (alias && mainColor) {
        colorVariables[`--${alias}`] = mainColor;
      }
    }
  });
  return colorVariables;
}
