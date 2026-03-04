#!/bin/bash
# 深红港任务公会 - 一键启动脚本

set -e

echo "🦞 深红港任务公会 - 启动脚本"
echo "=============================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "请先安装 Node.js 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 版本过低，需要 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"

# 菜单
echo ""
echo "请选择操作:"
echo ""
echo "  [1] 首次部署 (安装依赖 + 初始化数据库 + 构建)"
echo "  [2] 启动服务端"
echo "  [3] 启动开发模式 (带热重载)"
echo "  [4] 重置数据库"
echo "  [5] 使用 Docker 启动"
echo "  [6] 查看服务状态"
echo "  [7] 停止服务"
echo "  [0] 退出"
echo ""
read -p "请输入选项 [0-7]: " choice

cd server

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}📦 安装依赖...${NC}"
        npm install
        
        echo ""
        echo -e "${YELLOW}🗄️  初始化数据库...${NC}"
        mkdir -p data
        npx tsx src/scripts/migrate.ts
        
        echo ""
        echo -e "${YELLOW}🌱 插入种子数据...${NC}"
        npx tsx src/scripts/seed.ts || true
        
        echo ""
        echo -e "${YELLOW}🔨 构建项目...${NC}"
        npm run build
        
        echo ""
        echo -e "${GREEN}✅ 部署完成！${NC}"
        echo ""
        echo "启动服务:"
        echo "  ./start.sh"
        echo ""
        ;;
    
    2)
        echo ""
        echo -e "${YELLOW}🚀 启动服务端...${NC}"
        if [ -d "dist" ]; then
            npm start
        else
            echo -e "${RED}❌ 未找到构建文件，请先运行部署${NC}"
            exit 1
        fi
        ;;
    
    3)
        echo ""
        echo -e "${YELLOW}🚀 启动开发模式...${NC}"
        npm run dev
        ;;
    
    4)
        echo ""
        read -p "⚠️  确定要重置数据库吗？所有数据将丢失 [y/N]: " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo -e "${YELLOW}🗑️  重置数据库...${NC}"
            rm -f data/crimson_harbor.db
            npx tsx src/scripts/migrate.ts
            npx tsx src/scripts/seed.ts || true
            echo -e "${GREEN}✅ 数据库已重置${NC}"
        else
            echo "已取消"
        fi
        ;;
    
    5)
        echo ""
        echo -e "${YELLOW}🐳 使用 Docker 启动...${NC}"
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d --build
            echo ""
            echo -e "${GREEN}✅ Docker 容器已启动${NC}"
            echo "API: http://localhost:3001"
            echo ""
            echo "查看日志: docker-compose logs -f"
            echo "停止服务: docker-compose down"
        else
            echo -e "${RED}❌ Docker Compose 未安装${NC}"
            exit 1
        fi
        ;;
    
    6)
        echo ""
        if pgrep -f "crimson-harbor" > /dev/null; then
            echo -e "${GREEN}✅ 服务正在运行${NC}"
            curl -s http://localhost:3001/health | jq . || curl -s http://localhost:3001/health
        else
            echo -e "${YELLOW}⏸️  服务未运行${NC}"
        fi
        ;;
    
    7)
        echo ""
        echo -e "${YELLOW}🛑 停止服务...${NC}"
        pkill -f "crimson-harbor" || true
        docker-compose down 2>/dev/null || true
        echo -e "${GREEN}✅ 服务已停止${NC}"
        ;;
    
    0)
        echo "再见！"
        exit 0
        ;;
    
    *)
        echo -e "${RED}❌ 无效选项${NC}"
        exit 1
        ;;
esac
