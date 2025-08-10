// moderation.js - Complete working version
require('dotenv').config();
const BadWord = require('./models/moderation');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

// Database bad word detection
async function containsBadWords(text, languages = ['en']) {
  try {
    const normalizedText = text.toLowerCase()
      .replace(/0/g, 'o').replace(/3/g, 'e').replace(/1/g, 'i')
      .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
      .replace(/[-_\.]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ');

    const words = normalizedText.split(/\s+/).filter(w => w.length > 1);
    const searchLanguages = [...new Set([...languages, 'en'])];
    
    const badWords = await BadWord.find({ 
      language: { $in: searchLanguages },
      isActive: true 
    }).lean();

    const badWordSet = new Set();
    badWords.forEach(badWord => {
      badWordSet.add(badWord.word);
      if (badWord.variations) {
        badWord.variations.forEach(v => badWordSet.add(v.toLowerCase()));
      }
    });
    
    const foundBadWords = words.filter(word => {
      if (badWordSet.has(word)) return true;
      return Array.from(badWordSet).some(badWord => 
        word.includes(badWord) && badWord.length > 3
      );
    });

    return {
      hasBadWords: foundBadWords.length > 0,
      foundWords: foundBadWords
    };
  } catch (error) {
    console.error("Database check failed:", error);
    return { hasBadWords: null, foundWords: [] };
  }
}

// Gemini AI moderation
async function isToxic(texts) {
  if (!Array.isArray(texts)) texts = [texts];

  const prompt = `You are a strict content moderation system.
For each sentence below, output only a JSON array of booleans.
Output true if toxic/inappropriate, false if safe.

Sentences:
${texts.map((t, i) => `${i + 1}. ${t}`).join("\n")}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const match = textOutput.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array found");

    const parsed = JSON.parse(match[0]);
    return parsed.map(v => v === true || v === "true");
  } catch (err) {
    console.error("AI moderation failed:", err.message);
    return texts.map(() => null);
  }
}

// COMBINED MODERATION FUNCTION - This is what was missing
async function moderateText(text, languages = ['en', 'kn', 'hi']) {
  console.log("🔍 Moderating:", text);
  
  const [dbCheck, aiCheck] = await Promise.all([
    containsBadWords(text, languages),
    isToxic(text)
  ]);

  console.log("📊 DB result:", dbCheck.hasBadWords, dbCheck.foundWords);
  console.log("🤖 AI result:", aiCheck[0]);

  return {
    isBlocked: dbCheck.hasBadWords === true || aiCheck[0] === true,
    reasons: {
      databaseMatch: dbCheck.hasBadWords === true,
      aiDetection: aiCheck[0] === true,
      foundWords: dbCheck.foundWords,
      aiResult: aiCheck[0]
    }
  };
}

// Image moderation
async function isImageUnsafe(imageBuffer, mimeType) {
  try {
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: "Analyze this image. Respond with only 'true' if inappropriate/unsafe, 'false' if safe." },
              { inlineData: { mimeType, data: base64Image } }
            ]
          }]
        })
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const match = textOutput.match(/(true|false)/i);
    return match ? match[0].toLowerCase() === 'true' : null;
  } catch (err) {
    console.error("Image moderation failed:", err.message);
    return null;
  }
}

// CRITICAL: Export all functions including moderateText
module.exports = { 
  isToxic, 
  containsBadWords, 
  moderateText,    // ← This was missing!
  isImageUnsafe 
};
