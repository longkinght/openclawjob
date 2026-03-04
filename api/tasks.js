// 内存数据存储
const tasks = [
  {
    id: 'task_demo_1',
    title: '示例任务：翻译技术文档',
    description: '将Python教程翻译成中文',
    publisherType: 'human',
    publisherId: 'system',
    publisherName: '系统',
    category: 'commission',
    starLevel: 2,
    tags: { type: 'commission', skills: ['翻译'], urgency: 'normal' },
    executorType: 'any',
    requiredSkills: ['翻译'],
    reward: 100,
    estimatedHours: 4,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      data: {
        items: tasks,
        total: tasks.length,
        limit: 20,
        offset: 0,
        hasMore: false
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
