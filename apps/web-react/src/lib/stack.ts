/**
 * 栈数据结构 —— 与官方 @vben-core/shared/utils Stack 1:1 对齐
 */

export class Stack<T> {
  private dedup: boolean;
  private items: T[] = [];
  private maxSize: number;

  constructor(dedup = true, maxSize = Number.POSITIVE_INFINITY) {
    this.dedup = dedup;
    this.maxSize = maxSize;
  }

  /** 是否包含某个元素 */
  contains(item: T): boolean {
    return this.items.includes(item);
  }

  /** 清空栈 */
  clear(): void {
    this.items = [];
  }

  /** 出栈 */
  pop(): T | undefined {
    return this.items.pop();
  }

  /** 入栈（单个） */
  push(item: T): void {
    if (this.dedup) {
      const index = this.items.indexOf(item);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
    }
    this.items.push(item);
    this.enforceMaxSize();
  }

  /** 入栈（多个） */
  pushAll(...items: T[]): void {
    items.forEach((item) => this.push(item));
  }

  /** 仅保留指定元素 */
  retain(items: T[]): void {
    this.items = this.items.filter((item) => items.includes(item));
  }

  /** 移除指定元素 */
  remove(...items: T[]): void {
    this.items = this.items.filter((item) => !items.includes(item));
  }

  /** 栈大小 */
  size(): number {
    return this.items.length;
  }

  /** 转为数组 */
  toArray(): T[] {
    return [...this.items];
  }

  private enforceMaxSize(): void {
    while (this.items.length > this.maxSize) {
      this.items.shift();
    }
  }

  /** 序列化（对齐官方 JSON 序列化结构 {dedup, items, maxSize}） */
  toJSON() {
    return {
      dedup: this.dedup,
      items: this.items,
      maxSize: this.maxSize,
    };
  }

  /** 反序列化 */
  static fromJSON<T>(json: any): Stack<T> {
    const stack = new Stack<T>(
      json?.dedup ?? true,
      json?.maxSize ?? Number.POSITIVE_INFINITY,
    );
    if (Array.isArray(json?.items)) {
      stack.pushAll(...json.items);
    }
    return stack;
  }
}

export function createStack<T>(
  dedup = true,
  maxSize = Number.POSITIVE_INFINITY,
): Stack<T> {
  return new Stack<T>(dedup, maxSize);
}
