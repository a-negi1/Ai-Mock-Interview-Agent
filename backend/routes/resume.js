const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { protect } = require("../middleware/auth");
const { analyzeResumeJD } = require("../services/ai/groq.service");
const { atsScore } = require("../services/scoring/scoring.service");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".docx", ".doc", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

async function extractText(buffer, mimetype) {
  if (mimetype === "application/pdf" || mimetype.includes("pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimetype.includes("word") || mimetype.includes("docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  return buffer.toString("utf-8");
}


router.post("/upload", protect, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const text = await extractText(req.file.buffer, req.file.mimetype);
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ message: "Could not extract meaningful text from resume" });
    }

    res.json({
      success: true,
      filename: req.file.originalname,
      size: req.file.size,
      textLength: text.length,
      resumeText: text,
      preview: text.substring(0, 500) + "...",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



router.post("/analyze", protect, async (req, res) => {
  try {
    const { resumeText, jobDescription, jobTitle } = req.body;
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ message: "resumeText and jobDescription required" });
    }

    const [analysis, ats] = await Promise.all([
      analyzeResumeJD({ resumeText, jobDescription, jobTitle }),
      Promise.resolve(atsScore(resumeText, jobDescription)),
    ]);

    res.json({ analysis, ats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
