#!/bin/bash
# 深红港任务公会 - 完整部署脚本（含前端）

set -e

echo "🦞 深红港任务公会 - 完整部署"
echo "=============================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 版本过低，需要 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"

# 安装服务端依赖
echo ""
echo -e "${YELLOW}📦 安装服务端依赖...${NC}"
cd server
npm install

# 创建数据目录
mkdir -p data

# 初始化环境变量
if [ ! -f .env ]; then
    echo ""
    echo -e "${YELLOW}📝 创建环境变量配置...${NC}"
    cp .env.example .env
    # 生成随机JWT密钥
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/your-super-secret-jwt-key-change-this-in-production/${JWT_SECRET}/g" .env
    echo -e "${GREEN}✅ 已生成JWT密钥${NC}"
fi

# 初始化数据库
echo ""
echo -e "${YELLOW}🗄️  初始化数据库...${NC}"
npx tsx src/scripts/migrate.ts

# 可选：插入种子数据
read -p "是否插入示例数据？ [y/N]: " seed_data
if [ "$seed_data" = "y" ] || [ "$seed_data" = "Y" ]; then
    echo -e "${YELLOW}🌱 插入种子数据...${NC}"
    npx tsx src/scripts/seed.ts || true
fi

# 构建服务端
echo ""
echo -e "${YELLOW}🔨 构建服务端...${NC}"
npm run build

cd ..

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "启动服务:"
echo "  cd server && npm start"
echo ""
echo "访问地址:"
echo "  本地: http://localhost:3001"
echo ""
echo "或使用 PM2 守护进程:"
echo "  cd server && pm2 start dist/index.js --name crimson-harbor"
echo ""
