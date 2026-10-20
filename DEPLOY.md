# GitHub Pages 公共预览

本仓库使用 GitHub Pages 发布 `frontend/` 静态前端，网站地址为：

`https://yuheng-123.github.io/xuanying-inner-atlas/`

推送到 `main` 分支后，`.github/workflows/deploy-pages.yml` 会自动构建并发布。也可以在 GitHub 仓库的 **Actions** 页面手动运行 `Deploy GitHub Pages`。

## 当前部署范围

- Pages 能托管静态文件，不能运行本项目的 FastAPI 后端。因此网站外观、三维场景和不依赖后端的前端交互可以公开访问；需要 `/api/v1/...` 服务的排盘解读、人际分析和部分星次内容暂时不能完整运行。
- 档案数据保存在访问者自己的浏览器中，不会同步到云端。
- GitHub 仓库现在是公开的，源码、网页脚本、模型和静态素材都可被查看或下载。
- 不需要设置 AI 密钥；项目原有 Mock 模式仍不产生外部模型费用。

## 发布检查

1. 确认 GitHub 仓库 **Settings → Pages** 的构建来源设为 **GitHub Actions**。
2. 打开 **Actions → Deploy GitHub Pages**，确认构建和部署两个任务都成功。
3. 访问上方网址，检查首页、三维场景与模型素材是否正常加载。
4. 需要后端的功能在后端托管并完成跨域配置前，不能视为线上可用。

GitHub Pages 与 Next.js 静态导出的边界见 [Next.js 静态导出文档](https://nextjs.org/docs/14/app/building-your-application/deploying/static-exports) 和 [GitHub Pages 自定义工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
