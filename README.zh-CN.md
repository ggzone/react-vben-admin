<div align="center">
  <a href="https://github.com/anncwb/vue-vben-admin">
    <img alt="VbenAdmin Logo" width="215" src="https://unpkg.com/@vbenjs/static-source@0.1.7/source/logo-v1.webp">
  </a>
  <br>
  <br>

[![license](https://img.shields.io/github/license/anncwb/vue-vben-admin.svg)](LICENSE)

  <h1>Vue Vben Admin</h1>
</div>

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vbenjs_vue-vben-admin&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vbenjs_vue-vben-admin) ![codeql](https://github.com/vbenjs/vue-vben-admin/actions/workflows/codeql.yml/badge.svg) ![build](https://github.com/vbenjs/vue-vben-admin/actions/workflows/build.yml/badge.svg) ![ci](https://github.com/vbenjs/vue-vben-admin/actions/workflows/ci.yml/badge.svg) ![deploy](https://github.com/vbenjs/vue-vben-admin/actions/workflows/deploy.yml/badge.svg)

**中文** | [English](./README.md) | [日本語](./README.ja-JP.md)

## 简介

Vue Vben Admin 是 Vue Vben Admin 的升级版本。作为一个免费开源的中后台模板，它采用了最新的 Vue 3、Vite、TypeScript 等主流技术开发，开箱即用，可用于中后台前端开发，也适合学习参考。

## 本项目定制：React 前端 + Rust 后端

> 本仓库基于官方 `v5.7.0` 模板，在 `feat/web-react` 分支上做了一次「替换式」改造：前端由 Vue 换成 **React 18 + TypeScript**，后端由 Nitro mock 换成 **Rust（axum + sqlx + SQLite）**。目的是验证在同一套 UI 结构与接口契约下，前端框架与后端语言均可替换，而权限模型、路由、主题、国际化等能力保持不变。

### 1. 分支与目录

| 位置 | 内容 | 说明 |
| --- | --- | --- |
| 分支 | `feat/web-react` | 定制开发分支，改动集中于此 |
| `apps/web-react` | React 18 + TS + Tailwind v4 | 前端应用，端口 `5667`，内含本地 `vite-mock` |
| `apps/backend-rust` | axum 0.8 + sqlx + SQLite | 后端服务，默认端口 `5330` |
| `apps/web-antd` 等 | 官方 Vue 应用 | 保留原样，可作为视觉与行为对照基线 |

### 2. 启动方式

前后端分别启动，开发态由 Vite 反代，不依赖浏览器跨域：

```bash
# 1) 后端：首次启动自动建库、迁表、灌种子
cargo run --manifest-path apps/backend-rust/Cargo.toml

# 2) 前端
pnpm -F @vben/web-react dev
```

| 项 | 地址 / 值 |
| --- | --- |
| 前端 | http://localhost:5667 |
| 后端健康检查 | http://127.0.0.1:5330/api/health |
| 种子账号 | `vben` / `admin` / `jack`（口令取自 `SEED_PASSWORD`，未设置时用脚本内置默认值） |

### 3. 后端切换（三档）

前端通过 `VITE_API_TARGET` 决定 `/api` 的走向，切换后端不需要改代码：

| 模式 | 触发方式 | `/api` 目标 | 适用场景 |
| --- | --- | --- | --- |
| rust（默认） | 不设置变量 | `http://127.0.0.1:5330` | 常规开发 |
| 任意后端 | `VITE_API_TARGET=http://host:port` | 指定地址 | 联调他人或远程后端 |
| 内置 mock | `VITE_API_TARGET=off` | 无（启用 `vite-mock`） | 无后端时查看页面 |

> `off` 模式的权限码只有 `AC_*` 演示码，不含 `system:*:list`，因此「系统管理」菜单不可见 —— 属预期行为。

### 4. 切换后端带来的调整

从官方 mock 换接 Rust 后端，以下位置是实质性改动，不是配置搬运：

| # | 调整点 | 具体做法 |
| --- | --- | --- |
| 1 | 代理 | `vite.config.ts` 按 `VITE_API_TARGET` 动态生成 `/api` 反代，`changeOrigin: true` |
| 2 | 依赖预构建缓存 | 两种模式各用独立 `cacheDir`（`.vite-rust-api` / `.vite`），切后端不触发全量 re-optimize |
| 3 | 鉴权 | 请求头注入 `Authorization: Bearer <accessToken>`，accessToken 默认 120 分钟 |
| 4 | 续期 | 401 时调 `/api/auth/refresh`，拿到新 token 后重放原请求 |
| 5 | 防死循环 | refresh 接口自身不参与 401 重试；refresh 失败立即清空本地 token，避免「AuthGuard 见 token 非空 → 拉 `user/info` 又 401」的跳转循环 |
| 6 | 登录页预填 | 自动填充值改读 `VITE_DEMO_PASSWORD`，本地值放 `.env.development.local`（git 忽略），与后端 `SEED_PASSWORD` 保持一致 |
| 7 | 口令存储 | 后端统一 Argon2id 哈希，库中无明文口令 |
| 8 | 登录保护 | 15 分钟窗口内失败 5 次锁定 15 分钟；默认不采信 `X-Forwarded-For`，需显式开启 `TRUST_PROXY` |
| 9 | 权限模型 | 细粒度权限点 `system:{user,role,menu,dept,dict,audit}:{list,create,update,delete}`；`super` 全量、`admin` 读写不含审计、`user` 只读 |
| 10 | CORS | 显式白名单（`CORS_ALLOWED_ORIGINS`）+ `allow_credentials`，不使用 `any()` |
| 11 | 安全响应头 | 全局中间件统一注入 |
| 12 | 静态托管 | 生产可由 `SERVE_STATIC_DIR` 指向 `apps/web-react/dist`，后端直出 SPA |
| 13 | 种子数据 | 首次启动建表并灌入用户/角色/菜单/部门/字典/权限点，表非空则跳过，不覆盖现有数据 |

### 5. 接口与数据

| 分组 | 路径 |
| --- | --- |
| 认证 | `POST /api/auth/login`、`POST /api/auth/refresh`、`POST /api/auth/logout`、`GET /api/auth/codes` |
| 用户 | `GET /api/user/info`、`PUT /api/user/password` |
| 菜单 | `GET /api/menu/all` |
| 系统管理 | `/api/system/{user,role,menu,dept,dict}/list` 及对应 `POST/PUT/DELETE`；`GET/PUT /api/system/role/menu`；`GET /api/system/audit/list` |
| 健康检查 | `GET /api/health` |

数据表：`system_user`、`system_role`、`system_user_role`、`system_menu`、`system_role_menu`、`system_dept`、`system_dict`、`system_permission`、`system_role_permission`、`system_refresh_token`、`system_login_attempt`、`system_audit_log`。迁移脚本在 `apps/backend-rust/migrations/`，启动时按序执行。

### 6. 后端配置项

从环境变量或 `apps/backend-rust/.env` 读取，常用项如下（完整清单见 `apps/backend-rust/.env.example`）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` / `PORT` | `127.0.0.1` / `5330` | 监听地址 |
| `DATABASE_URL` | `sqlite:./data/vben.db?mode=rwc` | 预留切换 Postgres |
| `JWT_SECRET` | 开发默认值 | **生产必须替换**，短于 32 字符启动时告警 |
| `JWT_ACCESS_TTL_MINUTES` | `120` | accessToken 有效期 |
| `JWT_REFRESH_TTL_DAYS` | `7` | refreshToken 有效期 |
| `SEED_PASSWORD` | `123456` | 种子账号口令，仅建库时生效 |
| `SECURE_COOKIES` | `false` | HTTPS 部署须置 `true` |
| `TRUST_PROXY` | `false` | 仅在反向代理之后才可置 `true` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5667` | 逗号分隔白名单 |
| `SERVE_STATIC_DIR` | 空 | 配置后由后端托管前端构建产物 |

### 7. 已知边界

- 存储层当前只落地 SQLite；换 Postgres 需补对应 sqlx feature 与迁移脚本。
- 接口契约以 `apps/web-react/src/api/` 与 `apps/backend-rust/src/routes/` 双侧对齐为准，不含官方 mock 的演示型接口全集。
- 种子数据均为演示内容，不承载业务数据。
- `AppConfig.seed_password` 目前未被读取（种子口令实际由 `db/seed.rs` 直接读环境变量），两处默认值不同：`config.rs` 为 `123456`，生效值取 `seed.rs` 的 `123456`。改口令请以 `SEED_PASSWORD` 环境变量显式指定，不要依赖默认值。

### 8. 提交约定

以下属本机产物与临时文件，**不入库**（`.gitignore` 已覆盖）：`apps/backend-rust/.env`、`apps/backend-rust/data/`、`apps/backend-rust/target/`、`apps/web-react/.env.*.local`、`*.log`、构建临时脚本（`*.tmp-build.bat`）、本地探针脚本与截图（`shot/`、`.tmp/`）。

### 9. 持续集成

CI 定义在 `.github/workflows/ci-react-rust.yml`，只覆盖定制部分：

| Job | 内容 |
|---|---|
| `Web · typecheck & build` | `pnpm -F @vben/web-react run typecheck` + `run build` |
| `Rust · fmt / clippy / test` | `cargo fmt --check`（提示性）、`cargo clippy`、`cargo test`（13 个单测） |

触发条件为 `push` 到 `main` 与 `pull_request`，并按 `paths` 过滤（前端、后端、`packages/`、`internal/`、锁文件、workflow 自身）。同一分支的旧运行会被新提交自动取消。

两点需要说明：

- 官方 12 个 workflow（`ci.yml`、`codeql.yml`、`deploy.yml`、`draft.yml`、`stale.yml` 等）的每个 job 都带 `if: github.repository == 'vbenjs/vue-vben-admin'` 守卫，在本仓库永久空转，只会给每次 push 贡献数条 1 秒的 `skipped` 记录。已全部删除，`rerun.yml`（手动触发的重跑工具）保留。今后本仓库的 Actions 列表里只会出现本文件对应的运行。
- `fmt` 为**提示性**检查（`continue-on-error`），`clippy` 暂不加 `-D warnings`：现有代码有 15+ 处 rustfmt 风格差异与 21 处 clippy 告警（`seed_password`、`refresh_ttl_secs` 等未使用项，`audit()` 参数过多等）。清理后可依次去掉这两个放宽项，升级为硬门禁。

本地等价复现：

```bash
pnpm -F @vben/web-react run typecheck && pnpm -F @vben/web-react run build

cd apps/backend-rust
cargo fmt --all -- --check
cargo clippy --all-targets
cargo test --all-targets
```

仓库为 public，标准 GitHub 托管 runner 分钟数不限量，本 CI 不产生费用。

## 升级提示

该版本为最新版本 `5.0`，与其他版本不兼容，如果你是新项目，建议使用最新版本。如果你想查看旧版本，请使用 [v2 分支](https://github.com/vbenjs/vue-vben-admin/tree/v2)

## 特性

- **最新技术栈**：使用 Vue3/vite 等前端前沿技术开发
- **TypeScript**：应用程序级 JavaScript 的语言
- **主题**：提供多套主题色彩，可配置自定义主题
- **国际化**：内置完善的国际化方案
- **权限**：内置完善的动态路由权限生成方案

## 预览

- [Vben Admin](https://vben.pro/) - 完整版中文站点

测试账号：vben/123456

<div align="center">
  <img alt="VbenAdmin Logo" width="100%" src="https://anncwb.github.io/anncwb/images/preview1.png">
  <img alt="VbenAdmin Logo" width="100%" src="https://anncwb.github.io/anncwb/images/preview2.png">
  <img alt="VbenAdmin Logo" width="100%" src="https://anncwb.github.io/anncwb/images/preview3.png">
</div>

### 使用 Gitpod

在 Gitpod（适用于 GitHub 的免费在线开发环境）中打开项目，并立即开始编码。

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/vbenjs/vue-vben-admin)

## 文档

[文档地址](https://doc.vben.pro/)

## 安装使用

1. 获取项目代码

```bash
git clone https://github.com/vbenjs/vue-vben-admin.git
```

2. 安装依赖

```bash
cd vue-vben-admin
npm i -g corepack
pnpm install
```

3. 运行

```bash
pnpm dev
```

4. 打包

```bash
pnpm build
```

## 更新日志

[CHANGELOG](https://github.com/vbenjs/vue-vben-admin/releases)

## 如何贡献

非常欢迎你的加入！[提一个 Issue](https://github.com/anncwb/vue-vben-admin/issues/new/choose) 或者提交一个 Pull Request。

**Pull Request 流程：**

1. Fork 代码
2. 创建自己的分支：`git checkout -b feature/xxxx`
3. 提交你的修改：`git commit -am 'feat(function): add xxxxx'`
4. 推送您的分支：`git push origin feature/xxxx`
5. 提交 `pull request`

## Git 贡献提交规范

参考 [vue](https://github.com/vuejs/vue/blob/dev/.github/COMMIT_CONVENTION.md) 规范 ([Angular](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular))

- `feat` 增加新功能
- `fix` 修复问题/BUG
- `style` 代码风格相关无影响运行结果的
- `perf` 优化/性能提升
- `refactor` 重构
- `revert` 撤销修改
- `test` 测试相关
- `docs` 文档/注释
- `chore` 依赖更新/脚手架配置修改等
- `ci` 持续集成
- `types` 类型定义文件更改

## 浏览器支持

本地开发推荐使用 `Chrome 80+` 浏览器

支持现代浏览器，不支持 IE

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Safari |
| :-: | :-: | :-: | :-: |
| last 2 versions | last 2 versions | last 2 versions | last 2 versions |

## 维护者

[@Vben](https://github.com/anncwb)

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=vbenjs/vue-vben-admin&type=Date)](https://star-history.com/#vbenjs/vue-vben-admin&Date)

## 捐赠

如果你觉得这个项目对你有帮助，你可以帮作者买一杯咖啡表示支持！

![donate](https://unpkg.com/@vbenjs/static-source@0.1.7/source/sponsor.png)

<a style="display: block;width: 100px;height: 50px;line-height: 50px; color: #fff;text-align: center; background: #408aed;border-radius: 4px;" href="https://www.paypal.com/paypalme/cvvben">Paypal Me</a>

## 贡献者

<a href="https://openomy.app/github/vbenjs/vue-vben-admin" target="_blank" style="display: block; width: 100%;" align="center">
  <img src="https://openomy.app/svg?repo=vbenjs/vue-vben-admin&chart=bubble&latestMonth=3" target="_blank" alt="Contribution Leaderboard" style="display: block; width: 100%;" />
 </a>

<a href="https://github.com/vbenjs/vue-vben-admin/graphs/contributors">
  <img alt="Contributors" src="https://contrib.rocks/image?repo=vbenjs/vue-vben-admin" />
</a>

## Discord

- [Github Discussions](https://github.com/anncwb/vue-vben-admin/discussions)

## 许可证

[MIT © Vben-2020](./LICENSE)
