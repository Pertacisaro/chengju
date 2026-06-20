const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 5180);
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

loadDotEnv();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/analyze") {
      await handleAnalyze(req, res);
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { error: "不支持的请求方法" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "服务暂时不可用" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`澄句本地服务已启动：http://localhost:${PORT}`);
});

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const safePath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  });
}

async function handleAnalyze(req, res) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    sendJson(res, 401, { error: "缺少 DeepSeek API Key。请在 .env 中设置 DEEPSEEK_API_KEY。" });
    return;
  }

  const body = await readJsonBody(req);
  const text = String(body.text || "").trim();

  if (!text) {
    sendJson(res, 400, { error: "请先输入日语句子。" });
    return;
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: text,
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || "DeepSeek 请求失败";
    sendJson(res, response.status, { error: message });
    return;
  }

  const content = payload?.choices?.[0]?.message?.content;
  let analysis;

  try {
    analysis = parseJsonContent(content);
  } catch (error) {
    console.error("DeepSeek JSON 解析失败：", error.message);
    sendJson(res, 502, { error: "DeepSeek 返回格式不是有效 JSON，请重试。" });
    return;
  }

  sendJson(res, 200, normalizeAnalysis(analysis, text));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;

      if (raw.length > 80_000) {
        reject(new Error("输入内容过长，请分段分析。"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("请求格式不正确"));
      }
    });
  });
}

function parseJsonContent(content) {
  if (!content) {
    throw new Error("DeepSeek 没有返回拆解结果");
  }

  const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  if (!cleaned.startsWith("{")) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
  }

  return JSON.parse(cleaned);
}

function normalizeAnalysis(analysis, originalText) {
  return {
    id: `note_${Date.now()}`,
    originalText: analysis.originalText || originalText,
    romaji: analysis.romaji || "",
    translation: analysis.translation || "",
    structure: analysis.structure || "",
    words: ensureArray(analysis.words).map((word) => ({
      surface: word.surface || "",
      reading: word.reading || "",
      romaji: word.romaji || "",
      partOfSpeech: word.partOfSpeech || "",
      meaning: word.meaning || "",
    })),
    verbs: ensureArray(analysis.verbs).map((verb) => ({
      surface: verb.surface || "",
      dictionaryForm: verb.dictionaryForm || "",
      conjugation: verb.conjugation || "",
      reason: verb.reason || "",
      role: verb.role || "",
    })),
    grammarPoints: ensureArray(analysis.grammarPoints).map((grammar) => ({
      pattern: grammar.pattern || "",
      meaning: grammar.meaning || "",
      explanation: grammar.explanation || "",
    })),
    summary: analysis.summary || "",
    tags: ensureArray(analysis.tags).length ? analysis.tags : ["AI拆解"],
    isFavorite: false,
    reviewCount: 0,
    lastReviewedAt: null,
    createdAt: new Date().toISOString(),
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildSystemPrompt() {
  return `
你是一个严谨、温和的日语老师。请拆解用户输入的日语长难句、歌词或段落。

只返回 JSON，不要返回 Markdown，不要解释 JSON 外的内容。JSON 结构必须完全符合：
{
  "originalText": "原文",
  "romaji": "整句罗马音",
  "translation": "自然中文释义",
  "structure": "句子结构拆解，说明主干、修饰关系、助词作用、从句关系",
  "words": [
    {
      "surface": "原文中的词或短语",
      "reading": "假名读音",
      "romaji": "罗马音",
      "partOfSpeech": "词性",
      "meaning": "中文含义"
    }
  ],
  "verbs": [
    {
      "surface": "原文中的动词形式",
      "dictionaryForm": "动词原型",
      "conjugation": "变形名称",
      "reason": "为什么这样变化",
      "role": "在句子中的作用"
    }
  ],
  "grammarPoints": [
    {
      "pattern": "语法表达",
      "meaning": "中文含义",
      "explanation": "结合原句说明用法"
    }
  ],
  "summary": "适合保存到笔记本的一小段复习摘要",
  "tags": ["语法", "动词"]
}

要求：
- 优先分析原句中真实出现的词，不要发明词。
- words 必须尽量按照原句顺序列出可标注片段，surface 必须是原句中连续出现的文字，romaji 必须能标在该 surface 上方。
- 不要把整句只作为一个 word；请按词或自然短语切分，便于前端逐段 ruby 标注。
- 动词必须说明原型、当前变形、变化原因。
- 罗马音用常见 Hepburn 风格。
- 如果输入是歌词，只分析用户提供的片段，不续写歌词。
`.trim();
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}
