import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  questionText: String,
  questionId: Number,
  section: String,
  type: String,
  value: mongoose.Schema.Types.Mixed, // string, number, array, url, etc.
});

const ResponseSchema = new mongoose.Schema({
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
  answers: [AnswerSchema],
  score: Number,
  passed: Boolean,
  meta: {
    userId: String,
    location: { lat: Number, lng: Number },
    createdAt: { type: Date, default: Date.now },
  },
});

const Response = mongoose.model('Response', ResponseSchema);

export default Response;
