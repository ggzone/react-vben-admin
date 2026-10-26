/**
 * 登录页标题 —— 与官方 common-ui auth-title.vue 1:1 对齐
 */
export function AuthTitle({
  children,
  desc,
}: {
  children?: React.ReactNode;
  desc?: React.ReactNode;
}) {
  return (
    <div className="mb-7 sm:mx-auto sm:w-full sm:max-w-md">
      <h2 className="mb-3 text-3xl/9 font-bold tracking-tight text-foreground lg:text-4xl">
        {children}
      </h2>
      <p className="lg:text-md text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

export default AuthTitle;
