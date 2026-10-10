# TabMate 分账拍档

这是一个日常记账与多人分账应用。未配置 Supabase 时使用本地示例模式；配置 Supabase 后启用邮箱注册登录、云端账本、好友码申请和共同账本。

## 启动

需要 Node.js 18 或更高版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址（默认 `http://localhost:3000`）。

## 功能

- 添加支出，支持均分、按份额和自定义金额。
- 管理账本与成员，查看总览和统计。
- 记录分摊确认和调整建议。
- 使用顶部搜索和账单列表筛选。
- 本地示例模式的数据保存在当前浏览器；“恢复示例数据”会覆盖本地账单、成员和账本。
- Supabase 模式支持邮箱注册、邮箱验证、登录、密码重置、好友码申请/确认和跨设备账本同步。

## 配置 Supabase

1. 在 Supabase 项目设置中复制 Project URL 和 publishable/anon key，填入 `.env.local`（格式见 `.env.example`）。前端不要填写 service role key。
2. 在 Supabase SQL Editor 执行 [`supabase/schema.sql`](supabase/schema.sql)，创建数据表、RLS 策略和好友码 RPC。
3. 在 Supabase Auth 设置 Site URL 为你的本地站点地址，并启用邮箱验证。添加本地及正式站点的 Redirect URL。
4. 重启 `npm run dev`。配置完成后应用会显示邮箱注册/登录页，而不是本地示例数据。

清除浏览器站点数据会删除本地示例账本；Supabase 模式数据存于云端。
