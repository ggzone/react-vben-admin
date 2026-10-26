/**
 * 自定义 SVG 图标注册 —— 与官方 packages/icons/src/svg/load.ts 1:1 对齐
 * 将 assets/svg-icons 下的 SVG 解析后注册为 iconify 图标（svg:avatar-1 等）
 * 使用方式：<VbenIcon icon="svg:avatar-1" />
 */
import { addIcon } from '@iconify/react';

import avatar1 from '#/assets/svg-icons/avatar-1.svg?raw';
import avatar2 from '#/assets/svg-icons/avatar-2.svg?raw';
import avatar3 from '#/assets/svg-icons/avatar-3.svg?raw';
import avatar4 from '#/assets/svg-icons/avatar-4.svg?raw';

interface IconifyIconStructure {
  body: string;
  height?: number;
  left?: number;
  top?: number;
  width?: number;
}

/** 解析 SVG 根元素与内容（与官方 parseSvg 一致） */
function parseSvg(svgData: string): IconifyIconStructure {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgData, 'image/svg+xml');
  const svgElement = xmlDoc.documentElement;

  const getAttrs = (el: Element, attrs: string[]) =>
    attrs
      .map((attr) =>
        el.hasAttribute(attr) ? `${attr}="${el.getAttribute(attr)}"` : '',
      )
      .filter(Boolean)
      .join(' ');

  const rootAttrs = getAttrs(svgElement, [
    'fill',
    'stroke',
    'fill-rule',
    'stroke-width',
  ]);

  const svgContent = [...svgElement.childNodes]
    .filter((node) => node.nodeType === Node.ELEMENT_NODE)
    .map((node) => new XMLSerializer().serializeToString(node))
    .join('');

  const body = rootAttrs ? `<g ${rootAttrs}>${svgContent}</g>` : svgContent;

  const viewBoxValue = svgElement.getAttribute('viewBox') || '';
  const [left, top, width, height] = viewBoxValue.split(' ').map((val) => {
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  });

  return { body, height, left, top, width };
}

const SVG_ICONS: Record<string, string> = {
  'svg:avatar-1': avatar1,
  'svg:avatar-2': avatar2,
  'svg:avatar-3': avatar3,
  'svg:avatar-4': avatar4,
};

/** 模块加载时即完成注册（与官方 loadSvgIcons() 一致） */
for (const [name, body] of Object.entries(SVG_ICONS)) {
  addIcon(name, parseSvg(body));
}
