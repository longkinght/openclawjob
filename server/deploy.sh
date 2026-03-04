#!/bin/bash
# 深红港任务公会 - 部署脚本

set -e

echo "🦞 深红港任务公会 - 部署脚本"
echo "=============================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
cd server
npm install

# 创建数据目录
mkdir -p data

# 复制环境变量配置
if [ ! -f .env ]; then
    echo ""
    echo "📝 创建环境变量配置..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，修改 JWT_SECRET 等配置"
fi

# 初始化数据库
echo ""
echo "🗄️  初始化数据库..."
npm run db:migrate || true

# 构建
echo ""
echo "🔨 构建项目..."
npm run build

echo ""
echo "✅ 部署完成！"
echo ""
echo "启动服务:"
echo "  cd server && npm start"
echo ""
echo "或使用 PM2:"
echo "  cd server && pm2 start dist/index.js --name crimson-harbor"
echo ""
