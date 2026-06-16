const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { Session, User } = require("../models");
const { generateQuestions } = require("../services/ai/groq.service");
const { scoreAnswer } = require("../services/scoring/scoring.service");



router.post("/start", protect, async (req, res) => {
  try {
    const { jobTitle, jobDescription, resumeText } = req.body;
    if (!jobTitle) return res.status(400).json({ message: "jobTitle is required" });

    
    const rawQuestions = await generateQuestions({ jobTitle, jobDescription, resumeText });

    const session = await Session.create({
      userId: req.user._id,
      jobTitle,
      jobDescription,
      resumeText,
      questions: rawQuestions,
      status: "active",
      startedAt: new Date(),
    });

    res.status(201).json({
      sessionId: session._id,
      questions: session.questions.map(({ id, text, category, difficulty }) => ({
        id,
        text,
        category,
        difficulty,
      })),
      totalQuestions: session.questions.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get("/:sessionId", protect, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



router.post("/:sessionId/answer", protect, async (req, res) => {
  try {
    const { questionId, answer, duration } = req.body;
    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const question = session.questions.find((q) => q.id === questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    
    const scoreResult = await scoreAnswer({
      question: question.text,
      answer,
      jobTitle: session.jobTitle,
    });

    question.answer = answer;
    question.duration = duration;
    question.answeredAt = new Date();
    question.score = scoreResult;

    await session.save();

    
    req.io?.to(session._id.toString()).emit("answer-scored", { questionId, score: scoreResult });

    res.json({ questionId, score: scoreResult });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



router.post("/:sessionId/transcribe", protect, async (req, res) => {
  try {
    const { questionId, transcript, duration } = req.body;
    if (!transcript) return res.status(400).json({ message: "No transcript provided" });

    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const question = session.questions.find((q) => q.id === questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    
    const scoreResult = await scoreAnswer({
      question: question.text,
      answer: transcript,
      jobTitle: session.jobTitle,
    });

    question.transcript = transcript;
    question.answer = transcript;
    question.duration = parseInt(duration) || 0;
    question.answeredAt = new Date();
    question.score = scoreResult;

    await session.save();

    req.io?.to(session._id.toString()).emit("transcription-done", { questionId, transcript, score: scoreResult });

    res.json({ questionId, transcript, score: scoreResult });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});





router.post("/:sessionId/end", protect, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const answeredQuestions = session.questions.filter((q) => q.score?.overall != null);
    const overallScore =
      answeredQuestions.length > 0
        ? answeredQuestions.reduce((sum, q) => sum + q.score.overall, 0) / answeredQuestions.length
        : 0;

    session.status = "completed";
    session.completedAt = new Date();
    session.overallScore = Math.round(overallScore * 10) / 10;
    session.totalDuration = Math.floor((session.completedAt - session.startedAt) / 1000);
    await session.save();

    
    const user = await User.findById(req.user._id);
    const totalSessions = user.interviewCount + 1;
    user.avgScore = Math.round(((user.avgScore * user.interviewCount + overallScore) / totalSessions) * 10) / 10;
    user.interviewCount = totalSessions;
    await user.save();

    res.json({
      sessionId: session._id,
      overallScore: session.overallScore,
      answeredCount: answeredQuestions.length,
      totalQuestions: session.questions.length,
      duration: session.totalDuration,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get("/", protect, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .select("jobTitle status overallScore createdAt totalDuration questions")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
