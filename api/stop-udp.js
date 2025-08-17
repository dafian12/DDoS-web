export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // In a real app, you would track and stop active processes
    return res.status(200).json({ 
      success: true,
      message: 'UDP stopped'
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to stop',
      details: error.message 
    });
  }
};
