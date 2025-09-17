import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema({
  value: String,
});

const QuestionSchema = new mongoose.Schema({
  section: String,
  type: String,
  text: { type: String, required: true },
  options: [OptionSchema],
  mandatory: Boolean,
  min: Number,
  max: Number,
  critical: Boolean,
  weight: Number,
});

const LogicRuleSchema = new mongoose.Schema({
  question: { type: String, required: true }, // main question this logic rule is for
  conditions: [
    {
      question: { type: String, required: true },
      operator: { type: String, enum: ["==", "!=", "<", ">", "<=", ">="], required: true },
      value: { type: mongoose.Schema.Types.Mixed, required: true },
      logicOp: { type: String, enum: ["AND", "OR"], default: "AND" },
    },
  ],
  action: {
    type: { type: String, enum: ["show", "hide"], required: true }, // show/hide follow-up
    target: { type: String, required: true }, // follow-up question text
  },
});


const SectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
});

const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  auditCategory: String,
  sections: [SectionSchema],
  questions: [QuestionSchema],
  logicRules: [LogicRuleSchema],
  scoringEnabled: Boolean,
  complianceThreshold: Number,
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
});

const Template = mongoose.model('Template', TemplateSchema);

export default Template;
