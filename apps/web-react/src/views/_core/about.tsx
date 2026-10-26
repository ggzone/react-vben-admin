/**
 * 关于项目页
 * 与官方 apps/web-antd/src/views/_core/about/index.vue + common-ui about.vue 1:1 对齐
 * 元数据来源：官方由 vite inject-metadata 插件注入 __VBEN_ADMIN_METADATA__，
 * web-react 用 VITE_APP_VERSION / VITE_APP_BUILD_TIME + package.json 等价实现
 */
import { Page } from '#/components/page';
import { VBEN_DOC_URL, VBEN_GITHUB_URL, VBEN_PREVIEW_URL } from '#/constants';
// package.json 位于 apps/web-react，相对本文件为 ../../../package.json
import pkg from '../../../package.json';

const metadata = {
  authorEmail: pkg.author?.email ?? '',
  authorName: pkg.author?.name ?? '',
  authorUrl: pkg.author?.url ?? '',
  buildTime: import.meta.env.VITE_APP_BUILD_TIME ?? '',
  dependencies: (pkg.dependencies ?? {}) as Record<string, string>,
  devDependencies: (pkg.devDependencies ?? {}) as Record<string, string>,
  homepage: pkg.homepage ?? '',
  license: pkg.license ?? '',
  repositoryUrl: pkg.repository?.url ?? '',
  version: import.meta.env.VITE_APP_VERSION ?? pkg.version ?? '',
};

function renderLink(href: string, text: string) {
  return (
    <a className="vben-link" href={href} rel="noreferrer" target="_blank">
      {text}
    </a>
  );
}

const vbenDescriptionItems = [
  { content: metadata.version, title: '版本号' },
  { content: metadata.license, title: '开源许可协议' },
  { content: metadata.buildTime, title: '最后构建时间' },
  { content: renderLink(metadata.homepage, '点击查看'), title: '主页' },
  { content: renderLink(VBEN_DOC_URL, '点击查看'), title: '文档地址' },
  { content: renderLink(VBEN_PREVIEW_URL, '点击查看'), title: '预览地址' },
  { content: renderLink(VBEN_GITHUB_URL, '点击查看'), title: 'Github' },
  {
    content: (
      <div>
        {renderLink(metadata.authorUrl, `${metadata.authorName}  `)}
        {renderLink(`mailto:${metadata.authorEmail}`, metadata.authorEmail)}
      </div>
    ),
    title: '作者',
  },
];

const dependenciesItems = Object.keys(metadata.dependencies).map((key) => ({
  content: metadata.dependencies[key],
  title: key,
}));

const devDependenciesItems = Object.keys(metadata.devDependencies).map(
  (key) => ({
    content: metadata.devDependencies[key],
    title: key,
  }),
);

function DescriptionGrid({
  items,
  itemClass,
  dtClass,
  ddClass,
}: {
  items: { content: React.ReactNode; title: string }[];
  itemClass: string;
  dtClass: string;
  ddClass: string;
}) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.title} className={cnBorder(itemClass)}>
          <dt className={dtClass}>{item.title}</dt>
          <dd className={ddClass}>{item.content}</dd>
        </div>
      ))}
    </dl>
  );
}

function cnBorder(itemClass: string) {
  return `border-t border-border px-4 sm:col-span-1 sm:px-0 ${itemClass}`;
}

export default function About() {
  return (
    <Page
      title="关于项目"
      descriptionSlot={
        <p className="mt-3 text-sm/6 text-foreground">
          <a
            className="vben-link"
            href={VBEN_GITHUB_URL}
            rel="noreferrer"
            target="_blank"
          >
            Vben Admin
          </a>
          是一个现代化开箱即用的中后台解决方案，采用最新的技术栈，包括 Vue
          3.0、Vite、TailwindCSS 和 TypeScript
          等前沿技术，代码规范严谨，提供丰富的配置选项，旨在为中大型项目的开发提供现成的开箱即用解决方案及丰富的示例，同时，它也是学习和深入前端技术的一个极佳示例。
        </p>
      }
    >
      <div className="card-box p-5">
        <div>
          <h5 className="text-lg text-foreground">基本信息</h5>
        </div>
        <div className="mt-4">
          <DescriptionGrid
            items={vbenDescriptionItems}
            itemClass="py-6"
            dtClass="text-sm/6 font-medium text-foreground"
            ddClass="mt-1 text-sm/6 text-foreground sm:mt-2"
          />
        </div>
      </div>

      <div className="card-box mt-6 p-5">
        <div>
          <h5 className="text-lg text-foreground">生产环境依赖</h5>
        </div>
        <div className="mt-4">
          <DescriptionGrid
            items={dependenciesItems}
            itemClass="py-3"
            dtClass="text-sm text-foreground"
            ddClass="mt-1 text-sm text-foreground/80 sm:mt-2"
          />
        </div>
      </div>

      <div className="card-box mt-6 p-5">
        <div>
          <h5 className="text-lg text-foreground">开发环境依赖</h5>
        </div>
        <div className="mt-4">
          <DescriptionGrid
            items={devDependenciesItems}
            itemClass="py-3"
            dtClass="text-sm text-foreground"
            ddClass="mt-1 text-sm text-foreground/80 sm:mt-2"
          />
        </div>
      </div>
    </Page>
  );
}
