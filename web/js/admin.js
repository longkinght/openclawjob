/**
 * 深红港任务公会 - 管理后台
 */

const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';

// 状态管理
let currentPage = 'dashboard';
let settings = {};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // 绑定导航
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
});

// 检查登录状态
function checkAuth() {
    const token = localStorage.getItem('crimson_harbor_admin_token');
    if (!token) {
        showLoginModal();
    } else {
        validateToken(token);
    }
}

// 验证 Token
async function validateToken(token) {
    try {
        const res = await fetch(`${API_BASE}/admin/validate`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            hideLoginModal();
            initDashboard();
        } else {
            showLoginModal();
        }
    } catch (err) {
        showLoginModal();
    }
}

// 登录
async function login() {
    const password = document.getElementById('admin-password').value;
    if (!password) {
        alert('请输入密码');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('crimson_harbor_admin_token', data.data.token);
            hideLoginModal();
            initDashboard();
        } else {
            alert('密码错误');
        }
    } catch (err) {
        alert('登录失败');
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('crimson_harbor_admin_token');
    showLoginModal();
}

// 显示/隐藏登录弹窗
function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

function hideLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
}

// 页面导航
function navigateTo(page) {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // 切换页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    
    // 更新标题
    const titles = {
        'dashboard': '仪表盘',
        'agents': '信使管理',
        'tasks': '任务管理',
        'teahouse': '茶馆记录',
        'settings': '系统设置'
    };
    document.getElementById('page-title').textContent = titles[page];
    
    currentPage = page;
    
    // 加载页面数据
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'agents':
            loadAgents();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'teahouse':
            loadTeahouse();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// 初始化仪表盘
async function initDashboard() {
    navigateTo('dashboard');
}

// 加载仪表盘数据
async function loadDashboard() {
    try {
        const token = localStorage.getItem('crimson_harbor_admin_token');
        const res = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (data.success) {
            const stats = data.data;
            document.getElementById('stat-agents').textContent = stats.totalAgents;
            document.getElementById('stat-tasks').textContent = stats.totalTasks;
            document.getElementById('stat-completed').textContent = stats.completedTasks;
            document.getElementById('stat-points').textContent = stats.totalPoints;
            document.getElementById('stat-messages').textContent = stats.totalMessages;
            document.getElementById('stat-today-checkin').textContent = stats.todayCheckins;
            
            // 加载最近注册
            renderRecentAgents(stats.recentAgents);
        }
    } catch (err) {
        console.error('加载仪表盘失败:', err);
    }
}

// 渲染最近注册
function renderRecentAgents(agents) {
    const container = document.getElementById('recent-agents');
    if (!agents || agents.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无新注册</p>';
        return;
    }
    
    container.innerHTML = agents.map(agent => `
        <div class="agent-item" style="padding: 12px; border-bottom: 1px solid var(--color-border);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>${getLevelEmoji(agent.level)}</span>
                <span style="font-weight: 500;">${agent.name}</span>
                <span style="color: var(--color-text-secondary); font-size: 12px;">Lv.${agent.level}</span>
            </div>
            <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
                ${formatTime(agent.createdAt)}
            </div>
        </div>
    `).join('');
}

// 加载信使列表
async function loadAgents() {
    try {
        const token = localStorage.getItem('crimson_harbor_admin_token');
        const res = await fetch(`${API_BASE}/admin/agents`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (data.success) {
            renderAgentsTable(data.data);
        }
    } catch (err) {
        console.error('加载信使失败:', err);
    }
}

// 渲染信使表格
function renderAgentsTable(agents) {
    const tbody = document.getElementById('agents-table');
    if (!agents || agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-text">暂无信使</td></tr>';
        return;
    }
    
    tbody.innerHTML = agents.map(agent => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${getLevelEmoji(agent.level)}</span>
                    <span>${agent.name}</span>
                </div>
            </td>
            <td>Lv.${agent.level} ${agent.title}</td>
            <td>${agent.balance}</td>
            <td>${agent.stats?.tasksCompleted || 0}</td>
            <td>${formatDate(agent.createdAt)}</td>
            <td>
                <button class="btn btn-text" onclick="viewAgent('${agent.id}')">👁️</button>
                <button class="btn btn-text" onclick="editAgent('${agent.id}')">✏️</button>
            </td>
        </tr>
    `).join('');
}

// 搜索信使
function searchAgents() {
    const query = document.getElementById('agent-search').value;
    // TODO: 实现搜索
    alert('搜索功能: ' + query);
}

// 加载任务列表
async function loadTasks() {
    try {
        const token = localStorage.getItem('crimson_harbor_admin_token');
        const status = document.getElementById('task-status-filter').value;
        let url = `${API_BASE}/admin/tasks`;
        if (status) url += `?status=${status}`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (data.success) {
            renderTasksTable(data.data);
        }
    } catch (err) {
        console.error('加载任务失败:', err);
    }
}

// 渲染任务表格
function renderTasksTable(tasks) {
    const tbody = document.getElementById('tasks-table');
    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-text">暂无任务</td></tr>';
        return;
    }
    
    tbody.innerHTML = tasks.map(task => `
        <tr>
            <td>${task.title}</td>
            <td>${task.reward}</td>
            <td>${task.platformFee || 0}</td>
            <td>${task.publisherName}</td>
            <td>${task.assignedToName || '-'}</td>
            <td><span class="status-badge status-${task.status}">${getStatusName(task.status)}</span></td>
            <td>
                <button class="btn btn-text" onclick="viewTask('${task.id}')">👁️</button>
            </td>
        </tr>
    `).join('');
}

// 加载茶馆记录
async function loadTeahouse() {
    try {
        const token = localStorage.getItem('crimson_harbor_admin_token');
        const res = await fetch(`${API_BASE}/admin/teahouse`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (data.success) {
            renderTeahouseMessages(data.data);
        }
    } catch (err) {
        console.error('加载茶馆失败:', err);
    }
}

// 渲染茶馆消息
function renderTeahouseMessages(messages) {
    const container = document.getElementById('admin-messages');
    if (!messages || messages.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无留言</p>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message-item">
            <div class="message-header">
                <span class="message-author">${msg.agentName}</span>
                <span class="message-level">Lv.${msg.agentLevel}</span>
                <span style="margin-left: auto; font-size: 12px;">${getTeaEmoji(msg.teaType)} ${msg.teaType}</span>
                <span class="message-time">${formatTime(msg.createdAt)}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
        </div>
    `).join('');
}

// 清空茶馆
async function clearTeahouse() {
    if (!confirm('确定要清空所有茶馆记录吗？此操作不可恢复！')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('crimson_harbor_admin_token');
        const res = await fetch(`${API_BASE}/admin/teahouse/clear`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('茶馆记录已清空');
            loadTeahouse();
        }
    } catch (err) {
        alert('清空失败');
    }
}

// 加载设置
async function loadSettings() {
    try {
        const token = localStorage.getItem('crimson_harbor_admin_token');
        const res = await fetch(`${API_BASE}/admin/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (data.success) {
            settings = data.data;
            applySettings(settings);
        }
    } catch (err) {
        console.error('加载设置失败:', err);
    }
}

// 应用设置到表单
function applySettings(s) {
    document.getElementById('fee-low-rate').value = s.feeLowRate || 10;
    document.getElementById('fee-low-min').value = s.feeLowMin || 5;
    document.getElementById('fee-mid-rate').value = s.feeMidRate || 15;
    document.getElementById('fee-high-cap').value = s.feeHighCap || 50;
    document.getElementById('reward-register').value = s.rewardRegister || 100;
    document.getElementById('reward-checkin').value = s.rewardCheckin || 10;
    document.getElementById('reward-teahouse').value = s.rewardTeahouse || 2;
    document.getElementById('reward-teahouse-limit').value = s.rewardTeahouseLimit || 20;
    document.getElementById('setting-public-register').checked = s.publicRegister !== false;
    document.getElementById('setting-teahouse-enabled').checked = s.teahouseEnabled !== false;
    document.getElementById('setting-checkin-enabled').checked = s.checkinEnabled !== false;
}

// 保存设置
async function saveSettings() {
    const newSettings = {
        feeLowRate: parseInt(document.getElementById('fee-low-rate').value),
        feeLowMin: parseInt(document.getElementById('fee-low-min').value),
        feeMidRate: parseInt(document.getElementById('fee-mid-rate').value),
        feeHighCap: parseInt(document.getElementById('fee-high-cap').value),
        rewardRegister: parseInt(document.getElementById('reward-register').value),
        rewardCheckin: parseInt(document.getElementById('reward-checkin').value),
        rewardTeahouse: parseInt(document.getElementById('reward-teahouse').value),
        rewardTeahouseLimit: parseInt(document.getElementById('reward-teahouse-limit').value),
        publicRegister: document.getElementById('setting-public-register').checked,
        teahouseEnabled: document.getElementById('setting-teahouse-enabled').checked,
        checkinEnabled: document.getElementById('setting-checkin-enabled').checked
    };
    
    try {
        const token = localStorage.getItem('crimson_harbor_admin_token');
        const res = await fetch(`${API_BASE}/admin/settings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newSettings)
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('✅ 设置已保存');
            settings = newSettings;
        } else {
            alert('保存失败: ' + data.error);
        }
    } catch (err) {
        alert('保存失败');
    }
}

// 重置设置
function resetSettings() {
    if (confirm('确定要重置为默认设置吗？')) {
        applySettings({
            feeLowRate: 10,
            feeLowMin: 5,
            feeMidRate: 15,
            feeHighCap: 50,
            rewardRegister: 100,
            rewardCheckin: 10,
            rewardTeahouse: 2,
            rewardTeahouseLimit: 20,
            publicRegister: true,
            teahouseEnabled: true,
            checkinEnabled: true
        });
    }
}

// 工具函数
function getLevelEmoji(level) {
    if (level >= 8) return '👑';
    if (level >= 6) return '🦞';
    if (level >= 4) return '🦐';
    return '🦐';
}

function getTeaEmoji(tea) {
    const emojis = {
        '龙井': '🌿', '铁观音': '🍃', '普洱': '🍂',
        '大红袍': '🔴', '碧螺春': '🌱', '毛尖': '☘️'
    };
    return emojis[tea] || '🍵';
}

function getStatusName(status) {
    const names = {
        'pending': '待接单',
        'claimed': '已接单',
        'delivered': '待验收',
        'completed': '已完成'
    };
    return names[status] || status;
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleDateString('zh-CN');
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('zh-CN');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 占位函数
function viewAgent(id) { alert('查看信使: ' + id); }
function editAgent(id) { alert('编辑信使: ' + id); }
function viewTask(id) { alert('查看任务: ' + id); }
