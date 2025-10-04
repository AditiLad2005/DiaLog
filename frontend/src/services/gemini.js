import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini using an environment variable. Do NOT hardcode keys in source.
// Create frontend/.env and set REACT_APP_GEMINI_API_KEY=your_key
const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
let genAIInstance = null;

export function getGenAI() {
  if (!apiKey) {
    throw new Error("Missing REACT_APP_GEMINI_API_KEY. Add it to your frontend/.env");
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

// messages: [{ role: 'user'|'model', content: string }]
export async function generateChatResponse(messages) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Convert messages into Gemini history format
  const history = (messages || [])
    .filter(m => m && m.role && m.content && m.role !== 'system')
    .slice(-10) // limit history
    .map(m => ({ role: m.role, parts: [{ text: m.content }] }));

  const chat = model.startChat({ history });

  const safetyPreamble = `You are DiaLog, a diabetes-focused assistant. 
- Keep recommendations safe, conservative, and low risk. 
- Avoid high glycemic load items; suggest lower-GL alternatives where helpful.
- This is not medical advice. Encourage consulting a healthcare professional for personalized guidance.
- Be concise and friendly. If a question is out of scope or unsafe, say so and suggest a safer path.`;

  const lastUser = messages && messages.length ? messages[messages.length - 1] : null;
  const userText = lastUser?.content || '';
  const prompt = `${safetyPreamble}\n\nUser: ${userText}`;

  const res = await chat.sendMessage(prompt);
  const out = await res.response;
  return out.text();
}
