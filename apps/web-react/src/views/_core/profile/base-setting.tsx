/**
 * 个人中心 —— 基本设置
 * 与官方 apps/web-antd/src/views/_core/profile/base-setting.vue 1:1 对齐。
 *
 * 官方该表单由 vben form-ui + ant-design-vue 渲染，实测盒模型：
 *   行（.ant-form-item 等价物）：`flex-row items-center pb-4`
 *     → 控制区 34 高（32 + p-px 1×2）+ 底距 16 = 行步进 50
 *   label：宽 100、`justify-end`（右对齐）、`mr-2`(8px)、`text-sm leading-6 font-medium`
 *   控制区：`flex-auto overflow-hidden p-px`
 *   Input：32 高、radius 8、`padding 4px 11px`、14/22、边框 #36363a、底 #1c1e23
 *   Textarea：`rows=2` → 54 高（22×2 + 8 + 边框 2）
 *   Select(tags)：selector 32 高、radius 8、`padding 1px 4px`；无下拉箭头（multiple 无 suffix）
 *     标签 24 高、radius 6、`bg rgba(242,242,242,.12)`、`border rgba(235,235,252,.23)`、
 *     `padding 0 4px 0 8px`、14/22
 *   提交按钮：贴容器左边（不缩进 label 宽度）、`mt-4`
 * 外观变量见 assets/index.css 的 `.antd-ui`（--antd-*）。
 */
import * as React from 'react';
import { X } from 'lucide-react';

import { Button } from '#/components/ui/button';
import { getUserInfoApi } from '#/api/core/user';
import { useUserStore } from '#/stores/user';

const MOCK_ROLES_OPTIONS = [
  { label: '管理员', value: 'super' },
  { label: '用户', value: 'user' },
  { label: '测试', value: 'test' },
];

/** antd 输入类控件通用外观 */
const FIELD =
  'w-full rounded-lg border border-[var(--antd-border)] bg-[var(--antd-card-bg)] px-[11px] text-sm leading-[22px] text-[var(--antd-text)] outline-none transition-colors placeholder:text-[var(--antd-placeholder)]';

/** 横向表单项：label 100 右对齐 + 控制区 p-px + 行底距 16 */
function FormItem({
  label,
  children,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="relative flex shrink-0 flex-row items-center pb-4">
      <label className="mr-2 flex w-[100px] shrink-0 items-center justify-end text-sm leading-6 font-medium">
        {label}
      </label>
      <div className="flex-auto overflow-hidden p-px">{children}</div>
    </div>
  );
}

export function ProfileBaseSetting() {
  const userStore = useUserStore();
  const [realName, setRealName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [roles, setRoles] = React.useState<string[]>([]);
  const [introduction, setIntroduction] = React.useState('');

  // 对齐官方 onMounted：拉取用户信息回填表单
  React.useEffect(() => {
    void (async () => {
      const data = await getUserInfoApi();
      setRealName(data?.realName ?? '');
      setUsername(data?.username ?? '');
      setRoles(data?.roles ?? []);
      setIntroduction((data as { introduction?: string })?.introduction ?? '');
    })();
  }, []);

  const toggleRole = (value: string) => {
    setRoles((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  return (
    <div className="antd-ui">
      <FormItem label="姓名">
        <input
          className={`${FIELD} h-8 py-1`}
          placeholder="请输入"
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
        />
      </FormItem>
      <FormItem label="用户名">
        <input
          className={`${FIELD} h-8 py-1`}
          placeholder="请输入"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </FormItem>
      <FormItem label="角色">
        {/* 对齐官方 antd Select mode="tags"：multiple 无下拉箭头，仅展示已选标签 + 尾部搜索框 */}
        <div className="flex h-8 w-full items-center rounded-lg border border-[var(--antd-border)] bg-[var(--antd-card-bg)] px-1 py-px">
          {roles.map((role) => {
            const option = MOCK_ROLES_OPTIONS.find((o) => o.value === role);
            return (
              <span
                className="mr-1 flex h-6 shrink-0 items-center gap-1 rounded-md border border-[var(--antd-tag-border)] bg-[var(--antd-tag-bg)] pr-1 pl-2 text-sm leading-[22px] text-[var(--antd-text)]"
                key={role}
              >
                {option?.label ?? role}
                <X
                  className="size-3 cursor-pointer opacity-45 hover:opacity-85"
                  onClick={() => toggleRole(role)}
                />
              </span>
            );
          })}
          <input
            className="h-6 min-w-1 flex-1 border-0 bg-transparent text-sm leading-[22px] text-[var(--antd-text)] outline-none placeholder:text-[var(--antd-placeholder)]"
            placeholder=""
          />
        </div>
      </FormItem>
      <FormItem label="个人简介">
        <textarea
          className={`${FIELD} block resize-none py-1`}
          placeholder="请输入"
          rows={2}
          value={introduction}
          onChange={(e) => setIntroduction(e.target.value)}
        />
      </FormItem>
      <Button
        className="mt-4"
        onClick={() => {
          userStore.setUserInfo(
            userStore.userInfo
              ? { ...userStore.userInfo, realName, roles, username }
              : null,
          );
        }}
      >
        更新基本信息
      </Button>
    </div>
  );
}
