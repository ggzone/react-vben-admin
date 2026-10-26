/**
 * 侧边栏折叠/固定按钮 —— 与官方 layout-ui widgets 1:1 对齐
 */
import { ChevronsLeft, ChevronsRight, Pin, PinOff } from 'lucide-react';

export function SidebarCollapseButton({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="absolute bottom-2 left-3 z-10 flex-center cursor-pointer rounded-sm bg-accent p-1 text-foreground/60 hover:bg-accent-hover hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {collapsed ? (
        <ChevronsRight className="size-4" />
      ) : (
        <ChevronsLeft className="size-4" />
      )}
    </div>
  );
}

export function SidebarFixedButton({
  expandOnHover,
  onToggle,
}: {
  expandOnHover: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="absolute right-3 bottom-2 z-10 flex-center cursor-pointer rounded-sm bg-accent p-1.25 text-foreground/60 transition-all duration-300 hover:bg-accent-hover hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {expandOnHover ? (
        <Pin className="size-3.5" />
      ) : (
        <PinOff className="size-3.5" />
      )}
    </div>
  );
}
