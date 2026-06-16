
const { evaluateAnswer } = require("../ai/groq.service");


const STOPWORDS = new Set([
  "i", "me", "my", "we", "our", "you", "he", "she", "they", "it",
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
  "for", "of", "with", "by", "from", "is", "was", "are", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function cosineSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const allTokens = new Set([...setA, ...setB]);

  const vecA = [...allTokens].map((t) => (setA.has(t) ? 1 : 0));
  const vecB = [...allTokens].map((t) => (setB.has(t) ? 1 : 0));

  const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(vecB.reduce((s, v) => s + v * v, 0));

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function keywordScore(answer, questionText, domainKeywords = []) {
  const answerTokens = new Set(tokenize(answer));
  const questionTokens = tokenize(questionText);

  
  const targetKeywords = new Set([...questionTokens, ...domainKeywords.map((k) => k.toLowerCase())]);
  const matched = [...targetKeywords].filter((k) => answerTokens.has(k));

  return targetKeywords.size > 0 ? matched.length / targetKeywords.size : 0;
}

function fluencyScore(answer) {
  const words = answer.split(/\s+/).filter(Boolean);
  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 3);

  if (words.length < 20) return 0.3; 
  if (words.length > 300) return 0.9; 
  if (sentences.length < 2) return 0.5; 

  const avgSentenceLen = words.length / sentences.length;
  if (avgSentenceLen < 5) return 0.4; 
  if (avgSentenceLen > 30) return 0.7; 

  return 0.85;
}

async function scoreAnswer({ question, answer, jobTitle, domainKeywords = [] }) {
  if (!answer || answer.trim().length < 10) {
    return { overall: 0, bert: 0, keyword: 0, llm: 0, fluency: 0, feedback: "No answer provided." };
  }

  
  const qTokens = tokenize(question);
  const aTokens = tokenize(answer);
  const bertRaw = cosineSimilarity(qTokens, aTokens);
  const bertScore = Math.min(5, bertRaw * 6); 

  
  const kwRaw = keywordScore(answer, question, domainKeywords);
  const kwScore = Math.min(5, kwRaw * 5);

  
  const fluencyRaw = fluencyScore(answer);
  const fluencyScoreVal = fluencyRaw * 5;

  
  let llmResult = { score: 3.5, feedback: "", strengths: [], improvements: [], keywords_missing: [] };
  try {
    llmResult = await evaluateAnswer({ question, answer, jobTitle });
  } catch (err) {
    console.warn("LLM scoring failed, using heuristics:", err.message);
  }

  // Weighted hybrid: BERTScore 25% + Keyword 20% + LLM 45% + Fluency 10%
  const overall = bertScore * 0.25 + kwScore * 0.2 + (llmResult.score || 3.5) * 0.45 + fluencyScoreVal * 0.1;

  return {
    overall: Math.round(overall * 10) / 10,
    bert: Math.round(bertScore * 10) / 10,
    keyword: Math.round(kwScore * 10) / 10,
    llm: llmResult.score || 0,
    fluency: Math.round(fluencyScoreVal * 10) / 10,
    feedback: llmResult.feedback || "Answer scored via heuristics.",
    strengths: llmResult.strengths || [],
    improvements: llmResult.improvements || [],
    keywordsMissing: llmResult.keywords_missing || [],
  };
}

function atsScore(resumeText, jobDescription) {
  const jdTokens = tokenize(jobDescription);
  const resumeTokens = new Set(tokenize(resumeText));

  const jdSet = new Set(jdTokens);
  const matched = [...jdSet].filter((t) => resumeTokens.has(t));
  const matchRate = matched.length / jdSet.size;

  
  const score = Math.round(matchRate * 120); 
  return {
    score: Math.min(100, score),
    matchedKeywords: matched.slice(0, 20),
    totalJDKeywords: jdSet.size,
    matchRate: Math.round(matchRate * 100),
  };
}

module.exports = { scoreAnswer, atsScore };
