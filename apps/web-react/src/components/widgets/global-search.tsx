/**
 * 全局搜索 —— 与官方 global-search.vue + search-panel.vue 1:1 对齐
 * 搜索框按钮（Ctrl/⌘ + K 快捷键）+ 弹窗（搜索历史 + 键盘上下选择 + Enter 跳转）
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Search,
  SearchX,
  X,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { Input } from '#/components/ui/input';
import { VbenIcon } from '#/components/icon';
import { $t } from '#/locales';
import { isHttpUrl, isWindowsOs } from '#/lib/utils';
import { mapTree } from '#/lib/tree';
import type { MenuRecordRaw } from '#/types/menu';

interface GlobalSearchProps {
  className?: string;
  enableShortcutKey?: boolean;
  menus?: MenuRecordRaw[];
}

/** 搜索历史存储 key（与官方一致：按 hostname 隔离） */
const SEARCH_HISTORY_KEY = `__search-history-${location.hostname}__`;

function loadSearchHistory(): MenuRecordRaw[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveSearchHistory(history: MenuRecordRaw[]) {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

/** 按 path 去重（对齐官方 uniqueByField） */
function uniqueByField<T extends Record<string, any>>(
  items: T[],
  field: keyof T,
): T[] {
  const seen = new Set();
  return items.filter((item) => {
    const value = item[field];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/** 创建搜索正则（对齐官方 createSearchReg：逐字符 .* 连接） */
function createSearchReg(key: string) {
  const code = new Set([
    '$',
    '(',
    ')',
    '*',
    '+',
    '.',
    '?',
    '[',
    '\\',
    ']',
    '^',
    '{',
    '|',
    '}',
  ]);
  const keys = [...key].map((c) => (code.has(c) ? `\\${c}` : c)).join('.*');
  return new RegExp(`.*${keys}.*`);
}

/** 深度遍历树节点（对齐官方 traverseTreeValues） */
function traverseTreeValues<T extends { children?: T[] }>(
  items: T[],
  cb: (item: T) => void,
) {
  for (const item of items) {
    cb(item);
    if (item.children?.length) traverseTreeValues(item.children, cb);
  }
}

export function GlobalSearch({
  className,
  enableShortcutKey = true,
  menus = [],
}: GlobalSearchProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<MenuRecordRaw[]>([]);
  const [searchHistory, setSearchHistory] = useState<MenuRecordRaw[]>(() =>
    loadSearchHistory(),
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  /** 菜单名称翻译后的搜索项 */
  const searchItems = useMemo(
    () => mapTree(menus, (item) => ({ ...item, name: $t(item?.name ?? '') })),
    [menus],
  );

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    } else {
      setKeyword('');
      setSearchResults([]);
      setActiveIndex(-1);
    }
  }, [open]);

  // 无关键词时展示搜索历史
  useEffect(() => {
    if (!keyword) {
      setSearchResults(searchHistory);
      setActiveIndex(-1);
    }
  }, [keyword, searchHistory]);

  // 快捷键 Ctrl/⌘ + K
  useEffect(() => {
    if (!enableShortcutKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key?.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableShortcutKey]);

  function search(searchKey: string) {
    searchKey = searchKey.trim();
    if (!searchKey) {
      setSearchResults([]);
      return;
    }
    searchKey = searchKey.toLowerCase();
    const reg = createSearchReg(searchKey);
    const results: MenuRecordRaw[] = [];
    traverseTreeValues(searchItems, (item) => {
      if (reg.test((item.name ?? '').toLowerCase())) results.push(item);
    });
    setSearchResults(results);
    setActiveIndex(results.length > 0 ? 0 : -1);
  }

  // 关键词防抖搜索（对齐官方 useThrottleFn 200ms）
  useEffect(() => {
    if (!keyword) return;
    const timer = setTimeout(() => search(keyword), 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  function scrollIntoView(index: number) {
    const element = document.querySelector(`[data-search-item="${index}"]`);
    element?.scrollIntoView({ block: 'nearest' });
  }

  function handleEnter() {
    if (searchResults.length === 0 || activeIndex < 0) return;
    const to = searchResults[activeIndex];
    if (!to) return;
    const next = uniqueByField(
      [...searchHistory, to],
      'path' as keyof MenuRecordRaw,
    );
    setSearchHistory(next);
    saveSearchHistory(next);
    setOpen(false);
    if (isHttpUrl(to.path)) {
      window.open(to.path, '_blank');
    } else {
      navigate(to.path, { replace: true });
    }
  }

  function handleUp() {
    if (searchResults.length === 0) return;
    const next =
      activeIndex - 1 < 0 ? searchResults.length - 1 : activeIndex - 1;
    setActiveIndex(next);
    scrollIntoView(next);
  }

  function handleDown() {
    if (searchResults.length === 0) return;
    const next =
      activeIndex + 1 > searchResults.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(next);
    scrollIntoView(next);
  }

  function handleClose() {
    setSearchResults([]);
    setOpen(false);
  }

  // 键盘事件
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleEnter();
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDown();
      } else if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, searchResults]);

  const displayResults = uniqueByField(
    searchResults,
    'path' as keyof MenuRecordRaw,
  );

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="inset-x-0 top-[10vh] mx-auto flex max-h-[80vh] w-150 max-w-[90vw] translate-x-0 translate-y-0 flex-col gap-0 p-0"
          showClose={false}
        >
          <DialogHeader className="border-b px-5 py-2">
            <DialogTitle asChild>
              <div className="flex items-center">
                <Search className="mr-2 size-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  className="h-auto w-[80%] rounded-md border-none bg-transparent p-2 pl-0 text-sm font-normal shadow-none ring-0 ring-offset-transparent placeholder:text-muted-foreground focus-visible:ring-transparent"
                  placeholder={$t('ui.widgets.search.searchNavigate')}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </DialogTitle>
            {/* 官方 modal 的关闭按钮：absolute top-3 right-3 size-6 rounded-full */}
            <button
              aria-label="Close"
              className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full px-1 text-lg text-foreground/80 opacity-70 transition-opacity hover:bg-accent hover:text-accent-foreground hover:opacity-100"
              type="button"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </DialogHeader>
          {/* 对齐官方 modal 内容区：'relative min-h-40 flex-1 overflow-y-auto p-3' */}
          <div className="relative min-h-40 flex-1 overflow-y-auto p-3">
            <div className="flex! h-full justify-center px-2 sm:max-h-112.5">
              {keyword && displayResults.length === 0 && (
                <div className="text-center text-muted-foreground">
                  <SearchX className="mx-auto mt-4 size-12" />
                  <p className="mt-6 mb-10 text-xs">
                    {$t('ui.widgets.search.noResults')}
                    <span className="text-sm font-medium text-foreground">
                      &quot;{keyword}&quot;
                    </span>
                  </p>
                </div>
              )}
              {!keyword && displayResults.length === 0 && (
                <div className="text-center text-muted-foreground">
                  <p className="my-10 text-xs">
                    {$t('ui.widgets.search.noRecent')}
                  </p>
                </div>
              )}
              {displayResults.length > 0 && (
                <ul className="w-full">
                  {searchHistory.length > 0 && !keyword && (
                    <li className="mb-2 text-xs text-muted-foreground">
                      {$t('ui.widgets.search.recent')}
                    </li>
                  )}
                  {displayResults.map((item, index) => (
                    <li
                      key={item.path}
                      className={`group mb-3 flex-center w-full cursor-pointer rounded-lg bg-accent p-4 ${
                        activeIndex === index
                          ? 'bg-primary text-primary-foreground'
                          : ''
                      }`}
                      data-index={index}
                      data-search-item={index}
                      onClick={handleEnter}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <VbenIcon
                        className="mr-2 size-5 shrink-0"
                        fallback
                        icon={item.icon}
                      />
                      <span className="flex-1">{item.name}</span>
                      <div
                        className="flex-center rounded-full p-1 hover:scale-110 hover:text-primary-foreground dark:hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (keyword) {
                            setSearchResults(
                              searchResults.filter((_, i) => i !== index),
                            );
                          } else {
                            const next = searchHistory.filter(
                              (_, i) => i !== index,
                            );
                            setSearchHistory(next);
                            saveSearchHistory(next);
                          }
                          setActiveIndex(Math.max(activeIndex - 1, 0));
                        }}
                      >
                        <X className="size-4" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter className="w-full flex-row items-center justify-end gap-x-2 border-t p-2 px-3">
            <div className="flex w-full justify-start text-xs">
              <div className="mr-2 flex items-center">
                <CornerDownLeft className="mr-1 size-3" />
                {$t('ui.widgets.search.select')}
              </div>
              <div className="mr-2 flex items-center">
                <ArrowUp className="mr-1 size-3" />
                <ArrowDown className="mr-1 size-3" />
                {$t('ui.widgets.search.navigate')}
              </div>
              <div className="flex items-center">
                <VbenIcon className="mr-1 size-3" icon="mdi:keyboard-esc" />
                {$t('ui.widgets.search.close')}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div
        className={`group flex h-8 cursor-pointer items-center gap-3 rounded-2xl border-none bg-none px-2 py-0.5 outline-hidden md:bg-accent ${className ?? ''}`}
        onClick={() => setOpen(true)}
      >
        <Search className="size-4 text-muted-foreground group-hover:text-foreground group-hover:opacity-100" />
        <span className="hidden text-xs text-muted-foreground duration-300 group-hover:text-foreground md:block">
          {$t('ui.widgets.search.title')}
        </span>
        {enableShortcutKey && (
          <span className="relative hidden rounded-sm rounded-r-xl border-foreground/60 bg-background px-1.5 py-1 text-xs leading-none text-muted-foreground group-hover:text-foreground group-hover:opacity-100 md:block">
            {isWindowsOs() ? 'Ctrl' : '⌘'} <kbd>K</kbd>
          </span>
        )}
      </div>
    </div>
  );
}

export default GlobalSearch;
