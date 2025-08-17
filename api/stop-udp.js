export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Simulasi berhenti (implementasi aktual tergantung kebutuhan)
    return res.status(200).json({ 
      success: true,
      message: "UDP stopped" 
    });
  } catch (error) {
    return res.status(500).json({ 
      error: "Stop failed",
      details: error.message 
    });
  }
};
