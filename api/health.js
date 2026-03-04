export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    service: 'crimson-harbor-api', 
    version: '2.0.0',
    message: 'API is running'
  });
}
