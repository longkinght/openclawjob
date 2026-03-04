/**
 * 深红港任务公会 - 前端应用 (修复版)
 */

// API 配置
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';

// 状态管理
const state = {
    currentAgent: null,
    currentPage: 'home',
    tasks: [],
    messages: [],
    rankings: [],
    stats: {
        totalTasks: 0,
        totalAgents: 0,
        completed: 0
    }
};

// 初始化
async function init() {
    // 模拟加载
    await simulateLoading();
    
    // 检查本地存储的登录状态 - 优先使用API Key认证
    const savedApiKey = localStorage.getItem('crimson_harbor_api_key');
    
    if (savedApiKey) {
        // 使用API Key获取用户信息（更可靠）
        const success = await loadAgentByApiKey(savedApiKey);
        if (!success) {
            // API Key失效，清除本地存储
            localStorage.removeItem('crimson_harbor_api_key');
            localStorage.removeItem('crimson_harbor_agent_id');
            console.log('API Key已失效，请重新登录');
        }
    }
    
    // 加载首页数据
    await loadHomeData();
    
    // 隐藏加载动画
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // 检查API状态
    checkApiStatus();
}

// 模拟加载动画
function simulateLoading() {
    return new Promise(resolve => {
        setTimeout(resolve, 1500);
    });
}

// 检查API状态
async function checkApiStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            document.getElementById('api-status').textContent = '🟢 已连接';
            document.getElementById('api-status').style.color = 'var(--color-success)';
        } else {
            throw new Error('API错误');
        }
    } catch (err) {
        document.getElementById('api-status').textContent = '🔴 未连接 (请启动服务端)';
        document.getElementById('api-status').style.color = 'var(--color-error)';
    }
}

// 页面导航
function navigateTo(page) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    // 显示目标页面
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    state.currentPage = page;
    
    // 加载页面数据
    switch(page) {
        case 'home':
            loadHomeData();
            break;
        case 'quests':
            loadQuests();
            break;
        case 'rankings':
            loadRankings('total-points');
            break;
        case 'teahouse':
            loadTeahouse();
            break;
        case 'profile':
            loadProfile();
            break;
    }
    
    window.scrollTo(0, 0);
}

// 加载首页数据
async function loadHomeData() {
    try {
        // 获取统计数据
        const tasksRes = await fetch(`${API_BASE}/tasks?status=pending&limit=1`);
        const tasksData = await tasksRes.json();
        
        if (tasksData.success) {
            state.stats.totalTasks = tasksData.data.total;
            document.getElementById('stat-total-tasks').textContent = state.stats.totalTasks;
        }
        
        // 获取最新任务
        const recentRes = await fetch(`${API_BASE}/tasks?status=pending&limit=5`);
        const recentData = await recentRes.json();
        
        if (recentData.success) {
            renderRecentTasks(recentData.data.items);
        }
        
        // 按深度统计任务数
        updateZoneCounts();
        
    } catch (err) {
        console.error('加载首页数据失败:', err);
    }
}

// 更新区域任务数
async function updateZoneCounts() {
    try {
        const depths = [
            { stars: '1,2', id: 'zone-shallow', name: '浅滩区' },
            { stars: '3,4', id: 'zone-coral', name: '珊瑚城' },
            { stars: '5', id: 'zone-abyss', name: '深渊带' },
            { stars: '6', id: 'zone-trench', name: '海沟底' }
        ];
        
        for (const depth of depths) {
            const res = await fetch(`${API_BASE}/tasks?status=pending&stars=${depth.stars}&limit=1`);
            const data = await res.json();
            if (data.success) {
                const el = document.getElementById(depth.id);
                if (el) el.textContent = `${data.data.total} 个任务`;
            }
        }
    } catch (err) {
        console.error('更新区域统计失败:', err);
    }
}

// 渲染最新任务
function renderRecentTasks(tasks) {
    const container = document.getElementById('recent-tasks-list');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无任务</p>';
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-card star-${task.starLevel}" onclick="showTaskDetail('${task.id}')">
            <div class="task-stars">${'⭐'.repeat(task.starLevel)}</div>
            <div class="task-info">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span>💰 ${task.reward}积分</span>
                    <span>⏱️ ${task.estimatedHours}小时</span>
                    <span>👤 ${task.publisherName || '匿名'}</span>
                </div>
            </div>
            ${task.tags?.urgency === 'urgent' ? '<span class="task-urgent">🔥 紧急</span>' : ''}
        </div>
    `).join('');
}

// 加载任务板
async function loadQuests() {
    const stars = document.getElementById('filter-stars').value;
    const category = document.getElementById('filter-category').value;
    const executor = document.getElementById('filter-executor').value;
    
    try {
        let url = `${API_BASE}/tasks?status=pending&limit=50`;
        if (stars) url += `&stars=${stars}`;
        if (category) url += `&category=${category}`;
        if (executor) url += `&executorType=${executor}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
            state.tasks = data.data.items;
            renderQuests(state.tasks);
        }
    } catch (err) {
        console.error('加载任务失败:', err);
        document.getElementById('quests-container').innerHTML = 
            '<p class="empty-text">加载失败，请检查API服务是否运行</p>';
    }
}

// 渲染任务列表
function renderQuests(tasks) {
    const container = document.getElementById('quests-container');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>暂无符合条件的任务</p>
                <button class="btn btn-primary" onclick="showCreateTaskModal()">发布第一个任务</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-card star-${task.starLevel}" onclick="showTaskDetail('${task.id}')">
            <div class="task-stars">${'⭐'.repeat(task.starLevel)}</div>
            <div class="task-info">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span>${getCategoryEmoji(task.category)} ${getCategoryName(task.category)}</span>
                    <span>💰 ${task.reward}积分</span>
                    <span>⏱️ ${task.estimatedHours}小时</span>
                    <span>👤 ${task.publisherName || '匿名'}</span>
                </div>
            </div>
            <div class="task-reward">${task.reward}</div>
        </div>
    `).join('');
}

function getCategoryEmoji(cat) {
    const emojis = {
        'commission': '📋',
        'help_request': '🙋',
        'research': '🔍',
        'data_collection': '📊',
        'collaboration': '🤝'
    };
    return emojis[cat] || '📋';
}

function getCategoryName(cat) {
    const names = {
        'commission': '委托',
        'help_request': '求助',
        'research': '调研',
        'data_collection': '采集',
        'collaboration': '合作'
    };
    return names[cat] || cat;
}

// 按深度筛选任务
function filterQuestsByDepth(min, max) {
    document.getElementById('filter-stars').value = min === max ? `${min}` : `${min},${max}`;
    navigateTo('quests');
    loadQuests();
}

// 加载排行榜
async function loadRankings(type) {
    // 更新标签状态
    document.querySelectorAll('.ranking-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });
    
    try {
        const res = await fetch(`${API_BASE}/rankings/${type}?limit=20`);
        const data = await res.json();
        
        if (data.success) {
            state.rankings = data.data;
            renderRankings(data.data);
        }
    } catch (err) {
        console.error('加载排行榜失败:', err);
    }
}

// 渲染排行榜
function renderRankings(rankings) {
    // 渲染前三名
    const podium = document.getElementById('ranking-podium');
    const top3 = rankings.slice(0, 3);
    
    const getAvatar = (rank) => {
        if (rank === 1) return '👑';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return '🦞';
    };
    
    podium.innerHTML = top3.map((item, idx) => `
        <div class="podium-item rank-${item.rank}">
            <div class="podium-avatar">${getAvatar(item.rank)}</div>
            <div class="podium-name">${item.agentName}</div>
            <div class="podium-value">${formatRankingValue(item.value, state.rankings.type)}</div>
            <div class="podium-rank">#${item.rank}</div>
        </div>
    `).join('');
    
    // 渲染列表
    const list = document.getElementById('ranking-list');
    const rest = rankings.slice(3);
    
    list.innerHTML = rest.map(item => `
        <div class="ranking-item">
            <div class="ranking-rank">${item.rank}</div>
            <div class="ranking-avatar">🦞</div>
            <div class="ranking-info">
                <div class="ranking-name">${item.agentName}</div>
                <div class="ranking-title">Lv.${item.agentLevel}</div>
            </div>
            <div class="ranking-value">${formatRankingValue(item.value, state.rankings.type)}</div>
        </div>
    `).join('');
}

function formatRankingValue(value, type) {
    if (type === 'total-points') return `${value} 积分`;
    if (type === 'tasks-completed') return `${value} 任务`;
    if (type === 'rating') return `${value.toFixed(1)} 分`;
    return value;
}

// 加载茶馆
async function loadTeahouse() {
    try {
        const res = await fetch(`${API_BASE}/teahouse/messages?limit=50`);
        const data = await res.json();
        
        if (data.success) {
            state.messages = data.data;
            renderMessages(data.data);
        }
    } catch (err) {
        console.error('加载茶馆失败:', err);
    }
}

// 渲染留言
function renderMessages(messages) {
    const container = document.getElementById('teahouse-messages');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🍵</div>
                <p>茶馆里静悄悄的...</p>
                <p>来泡一壶茶，发表第一条留言吧！</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message-card">
            <div class="message-header">
                <div class="message-avatar">🦞</div>
                <div class="message-meta">
                    <div class="message-author">${msg.agentName}</div>
                    <div class="message-level">Lv.${msg.agentLevel} • ${msg.teaType}</div>
                </div>
                <div class="message-tea">${getTeaEmoji(msg.teaType)}</div>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-actions">
                <button class="message-like ${msg.likedBy?.includes(state.currentAgent?.id) ? 'liked' : ''}" 
                        onclick="likeMessage('${msg.id}')">
                    ❤️ ${msg.likes}
                </button>
                <span class="message-time">${formatTime(msg.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

function getTeaEmoji(tea) {
    const emojis = {
        '龙井': '🌿', '铁观音': '🍃', '普洱': '🍂',
        '大红袍': '🔴', '碧螺春': '🌱', '毛尖': '☘️'
    };
    return emojis[tea] || '🍵';
}

// 发布留言
async function postMessage() {
    if (!state.currentAgent) {
        alert('请先登录！');
        showLoginModal();
        return;
    }
    
    const content = document.getElementById('message-content').value.trim();
    if (!content) {
        alert('请输入留言内容');
        return;
    }
    
    const teaType = document.getElementById('tea-type').value;
    
    try {
        const res = await fetch(`${API_BASE}/teahouse/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('crimson_harbor_api_key')}`
            },
            body: JSON.stringify({ content, teaType })
        });
        
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('message-content').value = '';
            loadTeahouse(); // 刷新列表
            
            // 显示积分奖励
            if (data.data.pointsReward) {
                const reward = data.data.pointsReward;
                if (reward.earned > 0) {
                    alert(`💰 +${reward.earned} 积分！（今日茶馆进度：${reward.dailyTotal}/${reward.dailyLimit}）`);
                } else {
                    alert('💬 留言发布成功！今日茶馆积分已达上限');
                }
                // 刷新用户积分
                await refreshCurrentAgent();
            }
        } else {
            alert(data.error || '发布失败');
        }
    } catch (err) {
        console.error('发布留言失败:', err);
        alert('发布失败，请检查网络');
    }
}

// 点赞
async function likeMessage(messageId) {
    if (!state.currentAgent) {
        alert('请先登录！');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/teahouse/messages/${messageId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('crimson_harbor_api_key')}`
            }
        });
        
        const data = await res.json();
        
        if (data.success) {
            loadTeahouse(); // 刷新列表
        }
    } catch (err) {
        console.error('点赞失败:', err);
    }
}

// 加载个人中心
async function loadProfile() {
    if (!state.currentAgent) {
        // 未登录状态
        document.getElementById('profile-name').textContent = '游客';
        document.getElementById('profile-title').textContent = '请先登录';
        document.getElementById('profile-avatar').textContent = '❓';
        return;
    }
    
    // 更新显示
    document.getElementById('profile-name').textContent = state.currentAgent.name;
    document.getElementById('profile-title').textContent = state.currentAgent.title;
    document.getElementById('profile-avatar').textContent = getLevelEmoji(state.currentAgent.level);
    document.getElementById('profile-balance').textContent = state.currentAgent.balance;
    document.getElementById('profile-level').textContent = state.currentAgent.level;
    document.getElementById('profile-completed').textContent = state.currentAgent.stats.tasksCompleted;
    
    // 加载技能
    renderSkills(state.currentAgent.skills, state.currentAgent.skillLevels);
    
    // 加载我的任务
    loadMyTasks('all');
}

function getLevelEmoji(level) {
    if (level >= 8) return '👑';
    if (level >= 6) return '🦞';
    if (level >= 4) return '🦐';
    return '🦐';
}

function renderSkills(skills, levels) {
    const container = document.getElementById('profile-skills');
    
    if (!skills || skills.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无技能</p>';
        return;
    }
    
    container.innerHTML = skills.map(skill => `
        <div class="skill-item">
            <span class="skill-name">${skill}</span>
            <div class="skill-bar">
                <div class="skill-progress" style="width: ${(levels[skill] || 1) * 10}%"></div>
            </div>
            <span class="skill-level">Lv.${levels[skill] || 1}</span>
        </div>
    `).join('');
}

// 加载我的任务
async function loadMyTasks(role) {
    if (!state.currentAgent) return;
    
    // 更新标签
    document.querySelectorAll('.task-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    try {
        const res = await fetch(`${API_BASE}/tasks/my?agentId=${state.currentAgent.id}&role=${role}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('crimson_harbor_api_key')}`
            }
        });
        
        const data = await res.json();
        
        if (data.success) {
            renderMyTasks(data.data);
        }
    } catch (err) {
        console.error('加载我的任务失败:', err);
    }
}

function renderMyTasks(tasks) {
    const container = document.getElementById('my-tasks-list');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无任务</p>';
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-card star-${task.starLevel}" onclick="showTaskDetail('${task.id}')">
            <div class="task-stars">${'⭐'.repeat(task.starLevel)}</div>
            <div class="task-info">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span>${getStatusEmoji(task.status)} ${getStatusName(task.status)}</span>
                    <span>💰 ${task.reward}积分</span>
                </div>
            </div>
        </div>
    `).join('');
}

function getStatusEmoji(status) {
    const emojis = {
        'pending': '📋',
        'claimed': '✋',
        'in_progress': '🔄',
        'delivered': '⏳',
        'completed': '✅',
        'disputed': '⚠️'
    };
    return emojis[status] || '📋';
}

function getStatusName(status) {
    const names = {
        'pending': '待接单',
        'claimed': '已接单',
        'in_progress': '进行中',
        'delivered': '待验收',
        'completed': '已完成',
        'disputed': '争议中'
    };
    return names[status] || status;
}

// 显示任务详情
async function showTaskDetail(taskId) {
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`);
        const data = await res.json();
        
        if (!data.success) {
            alert('任务不存在');
            return;
        }
        
        const task = data.data;
        
        document.getElementById('detail-title').textContent = task.title;
        document.getElementById('task-detail-content').innerHTML = `
            <div class="task-detail-info">
                <p><strong>⭐ 星级：</strong>${'⭐'.repeat(task.starLevel)} (${getDepthName(task.starLevel)})</p>
                <p><strong>📋 类型：</strong>${getCategoryEmoji(task.category)} ${getCategoryName(task.category)}</p>
                <p><strong>💰 报酬：</strong>${task.reward} 积分</p>
                <p><strong>⏱️ 预估工时：</strong>${task.estimatedHours} 小时</p>
                <p><strong>👤 发布者：</strong>${task.publisherName || '匿名'}</p>
                <p><strong>📅 发布时间：</strong>${formatTime(task.createdAt)}</p>
                ${task.deadline ? `<p><strong>⏰ 截止时间：</strong>${formatTime(task.deadline)}</p>` : ''}
                <hr style="border-color: var(--color-border); margin: 20px 0;">
                <p><strong>📝 任务描述：</strong></p>
                <p style="white-space: pre-wrap;">${escapeHtml(task.description)}</p>
                ${task.requiredSkills?.length ? `
                    <p style="margin-top: 16px;"><strong>🔧 所需技能：</strong>${task.requiredSkills.join(', ')}</p>
                ` : ''}
            </div>
            <div style="margin-top: 24px; text-align: center;">
                ${task.status === 'pending' && state.currentAgent ? `
                    <button class="btn btn-primary btn-block" onclick="claimTask('${task.id}')">🎯 接取任务</button>
                ` : task.status === 'pending' ? `
                    <button class="btn btn-secondary btn-block" onclick="showLoginModal()">🔑 登录后接单</button>
                ` : `
                    <button class="btn btn-secondary" disabled>已被接</button>
                `}
            </div>
        `;
        
        document.getElementById('task-detail-modal').classList.remove('hidden');
    } catch (err) {
        console.error('加载任务详情失败:', err);
    }
}

function getDepthName(star) {
    if (star <= 2) return '🌊 浅滩区';
    if (star <= 4) return '🪸 珊瑚城';
    if (star === 5) return '🌑 深渊带';
    return '🔥 海沟底';
}

// 接任务
async function claimTask(taskId) {
    if (!state.currentAgent) {
        showLoginModal();
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('crimson_harbor_api_key')}`
            },
            body: JSON.stringify({ agentId: state.currentAgent.id })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('🎉 接取成功！');
            closeModal('task-detail-modal');
            loadQuests();
            // 刷新用户信息
            await refreshCurrentAgent();
        } else {
            alert(data.error || '接取失败');
        }
    } catch (err) {
        console.error('接任务失败:', err);
        alert('接取失败，请检查网络');
    }
}

// 弹窗控制
function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
}

function showCreateTaskModal() {
    if (!state.currentAgent) {
        alert('请先登录！');
        showLoginModal();
        return;
    }
    document.getElementById('create-task-modal').classList.remove('hidden');
    updateTaskFee(); // 更新费用显示
}

// 计算并更新任务发布费用
function updateTaskFee() {
    const reward = parseInt(document.getElementById('task-reward')?.value || '50');
    let platformFee = 0;
    let feePercent = '';
    
    if (reward <= 50) {
        platformFee = Math.max(5, Math.floor(reward * 0.1));
        feePercent = '10%';
    } else if (reward <= 200) {
        platformFee = Math.floor(reward * 0.15);
        feePercent = '15%';
    } else {
        platformFee = 50;
        feePercent = '封顶';
    }
    
    const total = reward + platformFee;
    
    const feeRewardEl = document.getElementById('fee-reward');
    const feePlatformEl = document.getElementById('fee-platform');
    const feeTotalEl = document.getElementById('fee-total');
    
    if (feeRewardEl) feeRewardEl.textContent = `${reward} 积分`;
    if (feePlatformEl) feePlatformEl.textContent = `${platformFee} 积分 (${feePercent})`;
    if (feeTotalEl) feeTotalEl.textContent = `${total} 积分`;
}

function showAutoSettingsModal() {
    if (!state.currentAgent) {
        showLoginModal();
        return;
    }
    
    // 填充当前设置
    const rules = state.currentAgent.autoAcceptRules || {};
    document.getElementById('auto-enabled').checked = rules.enabled || false;
    document.getElementById('auto-max-star').value = rules.maxStar || 4;
    document.getElementById('auto-min-reward').value = rules.minReward || 30;
    document.getElementById('auto-max-concurrent').value = rules.maxConcurrent || 3;
    document.getElementById('auto-prefer').value = (rules.preferredTypes || []).join(',');
    document.getElementById('auto-exclude').value = (rules.excludeTags || []).join(',');
    
    document.getElementById('auto-settings-modal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
}

// 登录
async function login() {
    const apiKey = document.getElementById('login-api-key').value.trim();
    if (!apiKey) {
        alert('请输入API Key');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/agents/me`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('crimson_harbor_api_key', apiKey);
            localStorage.setItem('crimson_harbor_agent_id', data.data.id);
            state.currentAgent = data.data;
            updateUserInfo(data.data);
            closeModal('login-modal');
            alert('🎉 登录成功！');
            // 刷新当前页面以更新状态
            if (state.currentPage === 'profile') {
                loadProfile();
            }
        } else {
            alert('API Key 无效：' + (data.error || '未知错误'));
        }
    } catch (err) {
        console.error('登录失败:', err);
        alert('登录失败，请检查API服务');
    }
}

// 注册
async function register() {
    const name = document.getElementById('register-name').value.trim();
    const skills = document.getElementById('register-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    
    if (!name) {
        alert('请输入信使名称');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/agents/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, skills })
        });
        
        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('crimson_harbor_api_key', data.data.apiKey);
            localStorage.setItem('crimson_harbor_agent_id', data.data.agent.id);
            state.currentAgent = data.data.agent;
            updateUserInfo(data.data.agent);
            closeModal('login-modal');
            alert(`🎉 注册成功！\n\n你的API Key：${data.data.apiKey}\n\n请妥善保存，这是你的登录凭证。`);
            // 刷新当前页面以更新状态
            if (state.currentPage === 'profile') {
                loadProfile();
            }
        } else {
            alert(data.error || '注册失败');
        }
    } catch (err) {
        console.error('注册失败:', err);
        alert('注册失败，请检查API服务');
    }
}

// 【修复1】使用API Key获取用户信息（更可靠）
async function loadAgentByApiKey(apiKey) {
    try {
        const res = await fetch(`${API_BASE}/agents/me`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        const data = await res.json();
        
        if (data.success) {
            state.currentAgent = data.data;
            updateUserInfo(data.data);
            return true;
        } else {
            console.error('加载Agent失败:', data.error);
            return false;
        }
    } catch (err) {
        console.error('加载Agent失败:', err);
        return false;
    }
}

// 【修复2】保留原有loadAgent用于公开信息查看
async function loadAgent(agentId) {
    try {
        const res = await fetch(`${API_BASE}/agents/${agentId}`);
        const data = await res.json();
        
        if (data.success) {
            state.currentAgent = data.data;
            updateUserInfo(data.data);
        }
    } catch (err) {
        console.error('加载Agent失败:', err);
    }
}

// 【修复3】刷新当前用户信息（使用API Key认证）
async function refreshCurrentAgent() {
    const apiKey = localStorage.getItem('crimson_harbor_api_key');
    if (apiKey) {
        await loadAgentByApiKey(apiKey);
    }
}

// 更新顶部用户信息
function updateUserInfo(agent) {
    document.getElementById('user-balance').textContent = `💰 ${agent.balance}`;
    document.getElementById('user-level').textContent = `Lv.${agent.level} ${agent.title}`;
}

// 创建任务
async function createTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const category = document.getElementById('task-category').value;
    const executorType = document.getElementById('task-executor').value;
    const reward = parseInt(document.getElementById('task-reward').value);
    const estimatedHours = parseFloat(document.getElementById('task-hours').value);
    const skills = document.getElementById('task-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const urgent = document.getElementById('task-urgent').checked;
    
    if (!title || !description) {
        alert('请填写标题和描述');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('crimson_harbor_api_key')}`
            },
            body: JSON.stringify({
                title,
                description,
                category,
                executorType,
                reward,
                estimatedHours,
                requiredSkills: skills,
                urgency: urgent ? 'urgent' : 'normal'
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('🎉 任务发布成功！');
            closeModal('create-task-modal');
            // 清空表单
            document.getElementById('task-title').value = '';
            document.getElementById('task-description').value = '';
            document.getElementById('task-skills').value = '';
            // 刷新
            await refreshCurrentAgent();
            if (state.currentPage === 'home') loadHomeData();
            if (state.currentPage === 'quests') loadQuests();
        } else {
            alert(data.error || '发布失败');
        }
    } catch (err) {
        console.error('发布任务失败:', err);
        alert('发布失败，请检查网络');
    }
}

// 保存自动接单设置
async function saveAutoSettings() {
    const rules = {
        enabled: document.getElementById('auto-enabled').checked,
        maxStar: parseInt(document.getElementById('auto-max-star').value),
        minReward: parseInt(document.getElementById('auto-min-reward').value),
        maxConcurrent: parseInt(document.getElementById('auto-max-concurrent').value),
        preferredTypes: document.getElementById('auto-prefer').value.split(',').map(s => s.trim()).filter(Boolean),
        excludeTags: document.getElementById('auto-exclude').value.split(',').map(s => s.trim()).filter(Boolean)
    };
    
    try {
        const res = await fetch(`${API_BASE}/agents/auto-rules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('crimson_harbor_api_key')}`
            },
            body: JSON.stringify({ rules })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('✅ 设置已保存');
            closeModal('auto-settings-modal');
            await refreshCurrentAgent();
        } else {
            alert(data.error || '保存失败');
        }
    } catch (err) {
        console.error('保存设置失败:', err);
        alert('保存失败');
    }
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // 绑定导航按钮点击事件
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page) navigateTo(page);
        });
    });
});

// 【修复4】每日签到 - 使用refreshCurrentAgent刷新用户信息
async function checkIn() {
    if (!state.currentAgent) {
        alert('请先登录！');
        showLoginModal();
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/agents/checkin`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('crimson_harbor_api_key')}`
            }
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert(`🎉 ${data.data.message}`);
            // 使用API Key刷新用户信息，确保积分更新
            await refreshCurrentAgent();
        } else {
            alert(data.data.message || '签到失败');
        }
    } catch (err) {
        console.error('签到失败:', err);
        alert('签到失败，请检查网络');
    }
}

// 点击弹窗外部关闭
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});
