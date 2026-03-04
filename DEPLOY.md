# 深红港任务公会 - 部署指南

## 🚀 快速部署选项

### 选项一：本地部署（开发/测试）

```bash
# 一键部署
./deploy-full.sh

# 启动服务
cd server
npm start

# 访问 http://localhost:3001
```

### 选项二：Docker 部署（推荐生产环境）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 选项三：Vercel 部署（Serverless）

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 生产环境部署
vercel --prod
```

### 选项四：云服务器部署（Linux + PM2）

```bash
# 1. 上传代码到服务器
scp -r . root@your-server:/var/www/crimson-harbor

# 2. SSH登录服务器
ssh root@your-server

# 3. 进入目录并部署
cd /var/www/crimson-harbor
./deploy-full.sh

# 4. 使用PM2启动
cd server
npm install -g pm2
pm2 start dist/index.js --name crimson-harbor
pm2 startup
pm2 save

# 5. 配置Nginx反向代理（可选）
sudo cp server/nginx.conf /etc/nginx/conf.d/crimson-harbor.conf
sudo nginx -t
sudo systemctl restart nginx
```

---

## ⚙️ 环境变量配置

创建 `server/.env` 文件：

```env
PORT=3001
NODE_ENV=production
DATABASE_PATH=./data/crimson_harbor.db
JWT_SECRET=your-super-secret-key-here
```

---

## 🔒 生产环境安全配置

### 1. 修改 JWT_SECRET

```bash
# 生成强密钥
openssl rand -base64 32

# 复制到 .env 文件
```

### 2. 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 3001/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. 使用 HTTPS

#### 使用 Let's Encrypt（Certbot）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📊 监控与日志

### PM2 监控

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs crimson-harbor

# 监控面板
pm2 monit
```

### 日志轮转

```bash
# 安装 logrotate
sudo apt install logrotate

# 配置
sudo tee /etc/logrotate.d/crimson-harbor << EOF
/var/www/crimson-harbor/server/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
}
EOF
```

---

## 🔄 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
cd server
npm install
npm run build

# 3. 重启服务
pm2 restart crimson-harbor

# 或 Docker
docker-compose down
docker-compose up -d --build
```

---

## 🌐 域名配置

### DNS 记录

| 类型 | 主机 | 值 |
|------|------|-----|
| A | @ | 你的服务器IP |
| A | www | 你的服务器IP |

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📱 访问地址

部署完成后，可以通过以下地址访问：

- **Web界面**: `http://your-domain.com` 或 `http://your-server-ip:3001`
- **API文档**: `http://your-domain.com/api/health`

---

## 🆘 常见问题

### 端口被占用

```bash
# 查找占用3001端口的进程
sudo lsof -i :3001

# 杀死进程
sudo kill -9 <PID>
```

### 数据库权限错误

```bash
# 修复权限
sudo chown -R www-data:www-data /var/www/crimson-harbor/server/data
```

### CORS错误

检查 `server/src/index.ts` 中的 CORS 配置，确保包含你的域名。

---

## 📞 技术支持

有问题？联系：
- GitHub Issues
- 邮箱: support@example.com
