<div align="center">
  <a href="https://github.com/anncwb/vue-vben-admin">
    <img alt="VbenAdmin Logo" width="215" src="https://unpkg.com/@vbenjs/static-source@0.1.7/source/logo-v1.webp">
  </a>
  <br>
  <br>

[![license](https://img.shields.io/github/license/anncwb/vue-vben-admin.svg)](LICENSE)

  <h1>Vue Vben Admin</h1>
</div>

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vbenjs_vue-vben-admin&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vbenjs_vue-vben-admin) [![codeql](https://github.com/vbenjs/vue-vben-admin/actions/workflows/codeql.yml/badge.svg)](https://github.com/vbenjs/vue-vben-admin/actions/workflows/codeql.yml) [![build](https://github.com/vbenjs/vue-vben-admin/actions/workflows/build.yml/badge.svg)](https://github.com/vbenjs/vue-vben-admin/actions/workflows/build.yml) [![ci](https://github.com/vbenjs/vue-vben-admin/actions/workflows/ci.yml/badge.svg)](https://github.com/vbenjs/vue-vben-admin/actions/workflows/ci.yml) [![deploy](https://github.com/vbenjs/vue-vben-admin/actions/workflows/deploy.yml/badge.svg)](https://github.com/vbenjs/vue-vben-admin/actions/workflows/deploy.yml)

**English** | [中文](./README.zh-CN.md) | [日本語](./README.ja-JP.md)

## Introduction

Vue Vben Admin is a free and open source middle and back-end template. Using the latest `vue3`, `vite`, `TypeScript` and other mainstream technology development, the out-of-the-box middle and back-end front-end solutions can also be used for learning reference.

## Customized Branch: React Frontend + Rust Backend

> This fork keeps the official `v5.7.0` baseline and, on the `feat/web-react` branch, replaces the frontend with **React 18 + TypeScript** and the backend with **Rust (axum + sqlx + SQLite)**.

| Item | Location | Note |
| --- | --- | --- |
| Branch | `feat/web-react` | All custom work lives here |
| Frontend | `apps/web-react` | React 18 + TS + Tailwind v4, dev port `5667` |
| Backend | `apps/backend-rust` | axum 0.8 + sqlx + SQLite, default port `5330` |
| Baseline | `apps/web-antd` and other Vue apps | Untouched, used as a visual/behavior reference |

Start both sides separately; the Vite dev server proxies `/api` to the Rust backend:

```bash
# 1) Backend: creates the SQLite DB, runs migrations and seeds on first boot
cargo run --manifest-path apps/backend-rust/Cargo.toml

# 2) Frontend
pnpm -F @vben/web-react dev
```

The frontend picks its backend through the `VITE_API_TARGET` environment variable:

| Mode | Trigger | `/api` target |
| --- | --- | --- |
| rust (default) | unset | `http://127.0.0.1:5330` |
| custom | `VITE_API_TARGET=http://host:port` | the given address |
| built-in mock | `VITE_API_TARGET=off` | none, `vite-mock` takes over |

Switching backends also required non-trivial adjustments — dynamic proxy generation, per-mode Vite `cacheDir`, Bearer-token auth with automatic `/api/auth/refresh` retry, loop guards around refresh failures, Argon2id password hashing, login lockout, explicit CORS allow-lists and seed data that never overwrites an existing database.

Full details (API routes, table list, configuration matrix, known limits) are documented in Chinese in [README.zh-CN.md](./README.zh-CN.md#本项目定制react-前端--rust-后端).

## Upgrade Notice

This is the latest version, 5.0, and it is not compatible with previous versions. If you are starting a new project, it is recommended to use the latest version. If you wish to view the old version, please use the [v2 branch](https://github.com/vbenjs/vue-vben-admin/tree/v2).

## Features

- **Latest Technology Stack**: Developed with cutting-edge front-end technologies like Vue 3 and Vite
- **TypeScript**: A language for application-scale JavaScript
- **Themes**: Multiple theme colors available with customizable options
- **Internationalization**: Comprehensive built-in internationalization support
- **Permissions**: Built-in solution for dynamic route-based permission generation

## Preview

- [Vben Admin](https://vben.pro/) - Full version Chinese site

Test Account: vben/123456

<div align="center">
  <img alt="VbenAdmin Logo" width="100%" src="https://anncwb.github.io/anncwb/images/preview1.png">
  <img alt="VbenAdmin Logo" width="100%" src="https://anncwb.github.io/anncwb/images/preview2.png">
  <img alt="VbenAdmin Logo" width="100%" src="https://anncwb.github.io/anncwb/images/preview3.png">
</div>

### Use Gitpod

Open the project in Gitpod (free online dev environment for GitHub) and start coding immediately.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/vbenjs/vue-vben-admin)

## Documentation

[Document](https://doc.vben.pro/)

## Install and Use

1. Get the project code

```bash
git clone https://github.com/vbenjs/vue-vben-admin.git
```

2. Install dependencies

```bash
cd vue-vben-admin
npm i -g corepack
pnpm install
```

3. Run

```bash
pnpm dev
```

4. Build

```bash
pnpm build
```

## Change Log

[CHANGELOG](https://github.com/vbenjs/vue-vben-admin/releases)

## How to Contribute

You are very welcome to join! [Raise an issue](https://github.com/anncwb/vue-vben-admin/issues/new/choose) or submit a Pull Request.

**Pull Request Process:**

1. Fork the code
2. Create your branch: `git checkout -b feat/xxxx`
3. Submit your changes: `git commit -am 'feat(function): add xxxxx'`
4. Push your branch: `git push origin feat/xxxx`
5. Submit `pull request`

## Git Contribution Submission Specification

Reference [vue](https://github.com/vuejs/vue/blob/dev/.github/COMMIT_CONVENTION.md) specification ([Angular](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular))

- `feat` Add new features
- `fix` Fix the problem/BUG
- `style` The code style is related and does not affect the running result
- `perf` Optimization/performance improvement
- `refactor` Refactor
- `revert` Undo edit
- `test` Test related
- `docs` Documentation/notes
- `chore` Dependency update/scaffolding configuration modification etc.
- `ci` Continuous integration
- `types` Type definition file changes

## Browser Support

The `Chrome 80+` browser is recommended for local development

Support modern browsers, not IE

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Safari |
| :-: | :-: | :-: | :-: |
| last 2 versions | last 2 versions | last 2 versions | last 2 versions |

## Maintainer

[@Vben](https://github.com/anncwb)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=vbenjs/vue-vben-admin&type=Date)](https://star-history.com/#vbenjs/vue-vben-admin&Date)

## Donate

If you think this project is helpful to you, you can help the author buy a cup of coffee to show your support!

![donate](https://unpkg.com/@vbenjs/static-source@0.1.7/source/sponsor.png)

<a style="display: block;width: 100px;height: 50px;line-height: 50px; color: #fff;text-align: center; background: #408aee;border-radius: 4px;" href="https://www.paypal.com/paypalme/cvvben">Paypal Me</a>

## Contributors

<a href="https://openomy.app/github/vbenjs/vue-vben-admin" target="_blank" style="display: block; width: 100%;" align="center">
  <img src="https://openomy.app/svg?repo=vbenjs/vue-vben-admin&chart=bubble&latestMonth=3" target="_blank" alt="Contribution Leaderboard" style="display: block; width: 100%;" />
 </a>

<a href="https://github.com/vbenjs/vue-vben-admin/graphs/contributors">
  <img alt="Contributors" src="https://contrib.rocks/image?repo=vbenjs/vue-vben-admin" />
</a>

## Discord

- [Github Discussions](https://github.com/anncwb/vue-vben-admin/discussions)

## License

[MIT © Vben-2020](./LICENSE)
