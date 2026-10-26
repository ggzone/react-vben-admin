/**
 * 树工具函数 —— 与官方 @vben-core/shared/utils（packages/@core/base/shared/src/utils/tree.ts）1:1 对齐
 *
 * 注意：官方 filterTree 仅按 predicate 过滤节点，**不会**剔除 children 为空的节点。
 * 早期版本额外做了「空 children 剔除」，导致 generateMenus 产出的菜单项
 * （mapper 里 children 恒为数组）被全部剔除、侧边栏菜单为空，此处已修正。
 */

export interface TreeConfigOptions {
  /** 子属性名称，默认 'children' */
  childProps: string;
}

function resolveChildProps(options?: TreeConfigOptions): string {
  return options?.childProps ?? 'children';
}

/** 遍历树形结构，返回所有节点中指定的值 */
export function traverseTreeValues<T, V>(
  tree: T[],
  getValue: (node: T) => V,
  options?: TreeConfigOptions,
): V[] {
  const childProps = resolveChildProps(options);
  const result: V[] = [];

  const dfs = (treeNode: T) => {
    result.push(getValue(treeNode));
    const children = (treeNode as Record<string, any>)?.[childProps];
    if (!children) return;
    if (children.length > 0) {
      for (const child of children) dfs(child);
    }
  };

  for (const treeNode of tree) dfs(treeNode);
  return result.filter(Boolean);
}

/** 根据条件过滤给定树结构的节点，以原有顺序返回匹配节点数组 */
export function filterTree<T extends Record<string, any>>(
  tree: T[],
  filter: (node: T) => boolean,
  options?: TreeConfigOptions,
): T[] {
  const childProps = resolveChildProps(options);

  const _filterTree = (nodes: T[]): T[] =>
    nodes.filter((node: Record<string, any>) => {
      if (filter(node as T)) {
        if (node[childProps]) {
          node[childProps] = _filterTree(node[childProps]);
        }
        return true;
      }
      return false;
    });

  return _filterTree(tree);
}

/** 根据条件重新映射给定树结构的节点 */
export function mapTree<T, V extends Record<string, any>>(
  tree: T[],
  mapper: (node: T) => V,
  options?: TreeConfigOptions,
): V[] {
  const childProps = resolveChildProps(options);
  return tree.map((node) => {
    const mapperNode: Record<string, any> = mapper(node);
    if (mapperNode[childProps]) {
      mapperNode[childProps] = mapTree(mapperNode[childProps], mapper, options);
    }
    return mapperNode as V;
  });
}

/** 对树形结构数据进行递归排序 */
export function sortTree<T extends Record<string, any>>(
  treeData: T[],
  sortFunction: (a: T, b: T) => number,
  options?: TreeConfigOptions,
): T[] {
  const childProps = resolveChildProps(options);

  return [...treeData].sort(sortFunction).map((item) => {
    const children = item[childProps];
    if (children && Array.isArray(children) && children.length > 0) {
      return {
        ...item,
        [childProps]: sortTree(children, sortFunction, options),
      };
    }
    return item;
  });
}
