# 深红港任务公会 - Docker 配置

# 构建镜像
# docker build -t crimson-harbor .

# 运行容器
# docker run -d -p 3001:3001 -v $(pwd)/data:/app/data --name crimson-harbor crimson-harbor

FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制代码
COPY dist ./dist
COPY .env.example ./.env

# 创建数据目录
RUN mkdir -p data

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 启动
CMD ["node", "dist/index.js"]
