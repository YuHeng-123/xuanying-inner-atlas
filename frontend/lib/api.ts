const LOCAL_DEVELOPMENT_API = "http://127.0.0.1:8000";

/** NEXT_PUBLIC_* values are embedded into the browser bundle at build time. */
export function apiEndpoint(path: string): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = configuredBase || (process.env.NODE_ENV === "development" ? LOCAL_DEVELOPMENT_API : "");
  if (!base) {
    throw new Error("未配置后端地址。请在构建前设置 NEXT_PUBLIC_API_BASE_URL 为浏览器可访问的后端 HTTPS 地址。");
  }
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
