const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: "user" },
    interviewCount: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};


const questionSchema = new mongoose.Schema({
  id: String,
  text: String,
  category: String, 
  difficulty: { type: String, enum: ["easy", "medium", "hard"] },
  answer: { type: String, default: null },
  transcript: { type: String, default: null },
  audioUrl: { type: String, default: null },
  score: {
    overall: Number,
    bert: Number,
    keyword: Number,
    llm: Number,
    feedback: String,
  },
  answeredAt: Date,
  duration: Number, 
});

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobTitle: { type: String, required: true },
    jobDescription: String,
    resumeText: String,
    resumeUrl: String,
    status: { type: String, enum: ["setup", "active", "completed", "abandoned"], default: "setup" },
    questions: [questionSchema],
    startedAt: Date,
    completedAt: Date,
    totalDuration: Number,
    overallScore: Number,
    atsScore: Number,
  },
  { timestamps: true }
);


const reportSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scores: {
      overall: Number,
      bert: Number,
      keyword: Number,
      llm: Number,
      ats: Number,
      communication: Number,
      technical: Number,
      behavioral: Number,
    },
    strengths: [String],
    improvements: [String],
    recommendations: [String],
    questionBreakdown: [
      {
        questionId: String,
        text: String,
        score: Number,
        feedback: String,
      },
    ],
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);
const Report = mongoose.model("Report", reportSchema);

module.exports = { User, Session, Report };
