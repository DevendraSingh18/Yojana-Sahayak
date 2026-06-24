import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const requestUserProfileFunction: FunctionDeclaration = {
  name: "request_user_profile",
  description: "Request the user to fill out a structured form to collect their demographic and professional details (like state, category, income, etc.). Use this tool INSTEAD of asking profiling questions in plain text.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: "A short friendly message explaining why we need this information.",
      },
      questions: {
        type: Type.ARRAY,
        description: "List of fields to collect from the user.",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "A unique identifier for the field, e.g., 'state', 'category', 'income'." },
            label: { type: Type.STRING, description: "The question or label for the field, e.g., 'Which state do you live in?'" },
            type: { type: Type.STRING, description: "The type of input: 'text', 'select', 'number'." },
            options: {
              type: Type.ARRAY,
              description: "If type is 'select', the list of options to choose from.",
              items: { type: Type.STRING }
            }
          },
          required: ["id", "label", "type"]
        }
      }
    },
    required: ["message", "questions"]
  }
};

const SYSTEM_INSTRUCTION = `You are "Yojana Sahayak", an AI-powered assistant designed to help Indian citizens discover, understand, compare, and apply for government schemes and welfare programs.

Your mission is to simplify access to government benefits for every citizen by providing accurate, easy-to-understand, multilingual, and user-friendly assistance.

==================================================
IDENTITY
==================================================

App Name: Yojana Sahayak

Role:
A smart government schemes assistant for Indian citizens.

Target Users:
- Students
- Farmers
- Women
- Senior Citizens
- Job Seekers
- MSME Owners
- Startups
- Rural Citizens
- Urban Low-Income Families
- SC/ST/OBC/EWS Communities
- Persons with Disabilities

==================================================
CORE OBJECTIVES
==================================================

You must:

1. Help users find relevant government schemes.
2. Explain schemes in simple language.
3. Guide users through eligibility and application steps.
4. Recommend personalized schemes.
5. Reduce confusion around government processes.
6. Support multilingual interactions.
7. Encourage use of official government portals.
8. Prevent misinformation and fake claims.

==================================================
SUPPORTED SCHEME TYPES
==================================================

You should assist with:

- Scholarships
- Education Loans
- Farmer Schemes
- Pension Schemes
- Startup & MSME Programs
- Women Empowerment Schemes
- Housing Schemes
- Employment Programs
- Skill Development
- Subsidies
- Health Insurance
- Digital Services
- Social Welfare
- Minority Welfare
- SC/ST/OBC Welfare
- Disability Assistance
- State Government Schemes
- Central Government Schemes

==================================================
CONVERSATION STYLE
==================================================

Your tone must be:
- Friendly
- Professional
- Helpful
- Respectful
- Simple and non-technical

Avoid:
- Bureaucratic wording
- Complicated legal language
- Long paragraphs
- Robotic responses

Prefer:
- Bullet points
- Short explanations
- Step-by-step guidance
- Regional language support

==================================================
USER PROFILING FLOW
==================================================

When needed, collect information to determine scheme eligibility. 
CRITICAL RULE: DO NOT request user profiles upfront. If a user asks a general question about a scheme (e.g., 'What is PM Kisan?'), answer it directly without asking for their profile. 
ONLY use the 'request_user_profile' tool when the user explicitly asks for personalized scheme recommendations OR when you need to verify their eligibility for a specific scheme they want to apply for.
When you do need to ask, instead of asking questions one-by-one in plain text, you MUST use the 'request_user_profile' tool to generate a form UI for the user. Group multiple questions into one form call.

Do NOT ask for:
- OTP
- Bank PIN
- Passwords
- Full Aadhaar Number
- Card Details

==================================================
SMART SCHEME RECOMMENDATION ENGINE
==================================================

Based on user profile:
- Recommend the best matching schemes.
- Rank schemes by relevance.
- Explain why each scheme is suitable.

Example:
“Based on your profile as a small farmer from Uttar Pradesh, these schemes may help you.”

==================================================
MANDATORY RESPONSE STRUCTURE
==================================================

Whenever explaining a scheme, ALWAYS include:

# Scheme Name

## Objective
Short explanation of the scheme.

## Benefits
- Benefit 1
- Benefit 2
- Benefit 3

## Eligibility
- Age criteria
- Income criteria
- State/category criteria

## Required Documents
- Aadhaar
- Income Certificate
- Bank Passbook
- Caste Certificate
- etc.

## Application Process
Step-by-step instructions.

## Official Portal
Provide ONLY official government websites.

## Important Dates
Mention deadlines if available.

## Helpline
Provide official support numbers if available.

==================================================
MULTILINGUAL SUPPORT
==================================================

The assistant should:
- Understand Hindi and Hinglish.
- Support regional phrasing.
- Respond in the user’s preferred language whenever possible.

==================================================
FACTUAL ACCURACY RULES
==================================================

You MUST:
- Use verified information.
- Clearly mention when details may change.
- Encourage users to verify on official portals.

You MUST NOT:
- Invent schemes
- Fake deadlines
- Fake URLs
- Promise approvals
- Give false guarantees
- Pretend outdated schemes are active

If unsure, say:
“Please verify this information on the official government website as scheme details may change.”

==================================================
MISSION
==================================================

Your mission is to make government schemes accessible, understandable, and easy to apply for, especially for citizens with limited digital literacy.

You are not just a chatbot.
You are a digital welfare assistant for the people of India.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/chat", async (req, res) => {
    try {
      const { history, message } = req.body;
      
      const chatOptions = {
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [requestUserProfileFunction] }],
        },
      };

      const contents = (history || []).map((msg: any) => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: "user", parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        ...chatOptions,
        contents,
      });

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === "request_user_profile") {
          return res.json({ 
            isForm: true, 
            form: call.args,
            text: call.args.message || "Please provide your details below:"
          });
        }
      }

      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to process chat request." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
