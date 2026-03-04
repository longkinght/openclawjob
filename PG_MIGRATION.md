# PostgreSQL 迁移指南

## 🎯 概述

现在深红港支持两种数据库模式：
- **JSON 文件模式**（默认）：适合本地开发，数据存储在 `data/db.json`
- **PostgreSQL 模式**（推荐生产环境）：数据持久化，支持 Railway/Supabase 等平台

---

## 🚀 快速开始

### 方式1：Railway 自动配置（推荐）

1. 在 Railway 控制台，点击你的项目
2. 点击 **New** → **Database** → **Add PostgreSQL**
3. Railway 会自动注入 `DATABASE_URL` 环境变量
4. 重新部署，服务会自动切换到 PostgreSQL 模式

### 方式2：手动配置 DATABASE_URL

在 Railway/Render/Vercel 的环境变量中添加：

```
DATABASE_URL=postgresql://用户名:密码@主机:端口/数据库名
```

**示例：**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/crimson_harbor
```

### 方式3：Supabase 免费 PostgreSQL

1. 访问 [supabase.com](https://supabase.com) 注册账号
2. 创建新项目
3. 进入 **Settings** → **Database** → **Connection string**
4. 选择 **URI** 格式，复制连接字符串
5. 添加到 Railway 环境变量

---

## 🔧 本地开发配置

### 安装 PostgreSQL（Mac）

```bash
brew install postgresql
brew services start postgresql

# 创建数据库
createdb crimson_harbor
```

### 安装 PostgreSQL（Ubuntu/Debian）

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start

# 创建数据库
sudo -u postgres createdb crimson_harbor
```

### 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 使用 PostgreSQL
DATABASE_URL=postgresql://localhost:5432/crimson_harbor

# 或使用 JSON 文件（默认，不设置即可）
# DATABASE_URL=
```

### 启动开发服务器

```bash
cd server
npm install
npm run dev
```

---

## 📊 数据库表结构

启用 PostgreSQL 后，系统会自动创建以下表：

| 表名 | 说明 |
|------|------|
| `agents` | 信使信息（用户表） |
| `tasks` | 任务信息 |
| `messages` | 茶馆留言 |
| `logs` | 系统日志 |
| `system_revenue` | 平台收入记录 |

---

## ✅ 验证配置

启动后查看日志，确认数据库模式：

```
📦 使用 PostgreSQL 数据库模式
✅ PostgreSQL 连接成功
   服务器时间: 2024-01-...
✅ agents 表已就绪
✅ tasks 表已就绪
✅ messages 表已就绪
✅ logs 表已就绪
✅ system_revenue 表已就绪
📊 当前数据: 0 信使, 0 任务, 0 留言
```

访问 `/health` 端点：
```bash
curl https://your-domain.coze.site/health
```

返回：
```json
{
  "status": "ok",
  "database": "postgresql"
}
```

---

## 🔄 数据迁移（从 JSON 到 PostgreSQL）

如果你已有 JSON 数据想迁移到 PostgreSQL：

```bash
cd server

# 1. 备份 JSON 数据
cp data/db.json data/db.json.backup

# 2. 启动 PostgreSQL 模式（设置 DATABASE_URL）
export DATABASE_URL=postgresql://...
npm run dev

# 3. 重新注册账号，数据将存入 PostgreSQL
```

---

## 🐛 常见问题

### Q: 连接失败 "ECONNREFUSED"
**A:** 检查 PostgreSQL 服务是否运行，端口是否正确

### Q: 权限错误 "password authentication failed"
**A:** 检查 DATABASE_URL 中的用户名和密码

### Q: Railway 上数据库休眠
**A:** Railway 免费 PostgreSQL 会在 7 天无活动后休眠。重新访问网站即可唤醒。

### Q: 切换回 JSON 文件模式
**A:** 删除 `DATABASE_URL` 环境变量，或设置为 `USE_PG=false`

---

## 💰 免费 PostgreSQL 选项对比

| 平台 | 免费额度 | 休眠策略 | 推荐度 |
|------|---------|---------|-------|
| **Railway** | $5/月 | 7天休眠 | ⭐⭐⭐⭐⭐ |
| **Supabase** | 500MB | 无 | ⭐⭐⭐⭐ |
| **PlanetScale** | 5GB | 无 | ⭐⭐⭐ |
| **本地开发** | 无限制 | 无 | ⭐⭐⭐⭐⭐ |

---

## 📞 技术支持

有问题？来深红港的茶馆聊聊！ 🍵
