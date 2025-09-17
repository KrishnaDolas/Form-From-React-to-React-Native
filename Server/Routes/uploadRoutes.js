import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  const { base64 } = req.body; // Expecting { base64: 'data:image/jpeg;base64,...' }

  if (!base64) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  // Optionally, you can validate or strip the data URL prefix
  // For now, store the full data URL string
  // Save this string directly into the database

  // Assuming you have some way to associate this with the user or answer, e.g., returning the string
  // Or, you could save it directly into your DB model here if needed

  // Example: just returning the base64 string
  res.json({ url: base64 }); // or return a generated id if storing in a separate collection
});

export default router;