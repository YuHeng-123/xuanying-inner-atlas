# 私有源码与公开网页部署

部署结构：GitHub 保存私有源码；Vercel 托管 Next.js 前端；Render 托管 FastAPI。访问者不需要 GitHub 账号即可打开网站。部署不需要配置 AI 密钥，留空时沿用项目的本地 Mock 解读。

## 发布前检查

- 仓库根目录是本项目目录，不能把 `work/`、`outputs/`、`.env`、`frontend/.env.local` 或本地构建缓存提交上去。根 `.gitignore` 已排除这些内容；`frontend/assets-archive/` 仅是未被页面使用的旧模型，也不会提交。
- 当前项目没有 Git 元数据。首次上传前先在 GitHub 创建空的 **Private** 仓库，再从本机初始化 Git、提交并推送本项目。
- Vercel 与 Render 都需要在各自网站连接 GitHub，并仅授予该私有仓库访问权限。不要把账号密码或 Token 发到聊天里。

## 部署顺序

1. 在个人 GitHub 账号下创建空的 Private 仓库，例如 `xuanying-bazi`。不要勾选初始化 README、`.gitignore` 或 License；本项目已经有这些文件。
2. 将项目根目录推送到该仓库。推送前检查 `git status`、`git check-ignore` 和暂存文件清单，确认环境文件、工作记录、截图、缓存没有进入提交。
3. 在 Vercel 导入该私有仓库。将 **Root Directory** 设为 `frontend`，保留 Next.js 默认构建设置。可先部署一次以取得正式站点地址；这次构建的 API 地址尚未配置，功能接口在完成第 6 步前不可用。
4. 在 Render 用仓库根目录的 `render.yaml` 创建 Blueprint，并在创建流程中只选择免费实例。配置已固定到本地验证过的 Python 3.11.11。`CORS_ORIGINS` 填 Vercel 正式站点的完整来源，例如 `https://your-project.vercel.app`，不要填写路径或末尾 `/`。
5. 等待 Render 部署完成，打开 Render 服务的 Events/Logs，确认 `/healthz` 健康检查通过，并复制服务的 HTTPS 地址。
6. 在 Vercel 项目的 **Settings → Environment Variables** 中设置 `NEXT_PUBLIC_API_BASE_URL` 为 Render 后端 HTTPS 地址（只填 origin，不加 `/api/v1`），然后重新部署前端。
7. 打开公开站点，分别检查首页、排盘、关系分析、问卦与档案页面；确认浏览器控制台没有 CORS 或 API 地址错误。修改代码后，推送到默认分支会触发托管平台重新部署。

如果先部署了 Render、之后才得到 Vercel 地址，可先用临时来源创建服务，再到 Render 环境变量中把 `CORS_ORIGINS` 改为 Vercel 的精确正式域名并重新部署。不要把生产 CORS 长期留为 `*`。

## 公开访问与数据

- 私有仓库限制的是 GitHub 源码仓库访问；网站本身是公开的。浏览器必须下载前端 JavaScript、样式和展示素材，因此这些已发布资源仍可被查看或保存。
- 出生资料和关系资料没有项目账号或云端同步功能。档案保存在访问者自己的浏览器中；使用排盘、关系分析等 API 时，相关请求会发到公开的 Render 后端处理。
- Render 免费 Web Service 连续 15 分钟无请求后会休眠，下次访问通常需要约一分钟唤醒；免费实例文件系统不持久。当前项目把个人记录存在浏览器，不依赖后端磁盘。
- 不配置 `LLM_API_KEY` 或 `OPENAI_API_KEY`，避免外部模型费用，并继续使用项目已有的 Mock 模式。
- Vercel Hobby 可用于个人 GitHub 仓库；若仓库属于 GitHub 组织，Vercel 对私有仓库部署有额外计划限制，先核实当前账号条件。
