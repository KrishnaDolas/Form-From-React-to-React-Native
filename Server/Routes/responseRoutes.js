import express from 'express';
import Response from '../models/Response.js';
import Template from '../models/Template.js';

const router = express.Router();

// Save survey answers
router.post('/', async (req, res) => {
  try {
    const { templateId, answers, meta } = req.body;

    const template = await Template.findById(templateId).lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });

    let score = null;
    let passed = null;

    if (template.scoringEnabled) {
      let totalWeight = 0;
      let obtained = 0;

      template.questions.forEach((q) => {
        if (q.weight) totalWeight += q.weight;

        const ans = answers.find((a) => a.questionText === q.text);
        if (!ans) return;

        let got = 0;
        if (q.type === 'single' || q.type === 'dropdown') {
          if (String(ans.value).toLowerCase() === 'yes') got = q.weight || 0;
        } else if (q.type === 'numeric') {
          if (Number(ans.value) > 0) got = q.weight || 0;
        } else if (q.type === 'file') {
          if (ans.value) got = (q.weight || 0) * 0.5;
        }
        obtained += got;
      });

      score = totalWeight > 0 ? Math.round((obtained / totalWeight) * 100) : null;
      if (template.complianceThreshold && score !== null) {
        passed = score >= template.complianceThreshold;
      }
    }

    const response = new Response({ templateId, answers, score, passed, meta });
    await response.save();

    res.status(201).json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all responses for a template
router.get('/:templateId', async (req, res) => {
  try {
    const responses = await Response.find({ templateId: req.params.templateId });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
