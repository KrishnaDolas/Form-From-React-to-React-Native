import express from 'express';
import Template from '../models/Template.js';

const router = express.Router();

// Create new template
router.post('/', async (req, res) => {
  try {
    // Ensure action has proper format
    const body = { ...req.body };
    if (body.logicRules && Array.isArray(body.logicRules)) {
      body.logicRules = body.logicRules.map((rule) => {
        // Normalize action
        const action = rule.action?.type && rule.action?.target
          ? rule.action
          : { type: 'show', target: rule.action?.show || '' };
        return { ...rule, action };
      });
    }

    const template = new Template(body);
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all templates
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single template
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ error: 'Not found' });

    const logicRules = (template.logicRules || []).map((rule) => {
      // Ensure every rule has question and action in proper format
      const questionText = rule.question || rule.conditions?.[0]?.question || '';
      const action = rule.action?.type && rule.action?.target
        ? rule.action
        : { type: 'show', target: rule.action?.show || '' };
      return { ...rule, question: questionText, action };
    });

    res.json({ ...template, logicRules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.logicRules && Array.isArray(body.logicRules)) {
      body.logicRules = body.logicRules.map((rule) => {
        const action = rule.action?.type && rule.action?.target
          ? rule.action
          : { type: 'show', target: rule.action?.show || '' };
        return { ...rule, action };
      });
    }

    const template = await Template.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
