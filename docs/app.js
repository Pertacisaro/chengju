/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} originalText
 * @property {string} romaji
 * @property {string} translation
 * @property {string} structure
 * @property {Array<Object>} words
 * @property {Array<Object>} verbs
 * @property {Array<Object>} grammarPoints
 * @property {string} summary
 * @property {string[]} tags
 * @property {boolean} isFavorite
 * @property {number} reviewCount
 * @property {string | null} lastReviewedAt
 * @property {string} createdAt
 */

/**
 * @typedef {Object} PracticeQuestion
 * @property {string} id
 * @property {string} noteId
 * @property {string} questionText
 * @property {string[]} options
 * @property {string} answer
 * @property {string} explanation
 * @property {"word_blank"} type
 */

/**
 * @typedef {Object} CheckIn
 * @property {string} date
 * @property {boolean} completed
 * @property {string | null} completedPracticeId
 */

const NOTES_KEY = "jp_learning_notes";
const CHECKINS_KEY = "jp_learning_checkins";
const WRONG_ANSWERS_KEY = "jp_learning_wrong_answers";

const routeLinks = document.querySelectorAll("[data-route]");
const routeJumpButtons = document.querySelectorAll("[data-route-jump]");
const views = document.querySelectorAll("[data-view]");
const analyzeButton = document.querySelector("#analyze-button");
const clearButton = document.querySelector("#clear-button");
const saveNoteButton = document.querySelector("#save-note-button");
const japaneseInput = document.querySelector("#japanese-input");
const inputMessage = document.querySelector("#input-message");
const analysisEmpty = document.querySelector("#analysis-empty");
const analysisPreview = document.querySelector("#analysis-preview");
const previewRuby = document.querySelector("#preview-ruby");
const previewTranslation = document.querySelector("#preview-translation");
const previewStructure = document.querySelector("#preview-structure");
const previewWords = document.querySelector("#preview-words");
const previewVerbs = document.querySelector("#preview-verbs");
const previewGrammar = document.querySelector("#preview-grammar");
const saveStatus = document.querySelector("#save-status");
const noteList = document.querySelector("#note-list");
const noteSearch = document.querySelector("#note-search");
const noteModal = document.querySelector("#note-modal");
const closeNoteModalButton = document.querySelector("#close-note-modal");
const noteDetail = document.querySelector("#note-detail");
const tagEditor = document.querySelector("#tag-editor");
const saveTagsButton = document.querySelector("#save-tags-button");
const tagMessage = document.querySelector("#tag-message");
const startPracticeButton = document.querySelector("#start-practice-button");
const practicePanel = document.querySelector("#practice-panel");
const practiceProgressLabel = document.querySelector("#practice-progress-label");
const practiceProgressCount = document.querySelector("#practice-progress-count");
const practiceQuestion = document.querySelector("#practice-question");
const practiceOptions = document.querySelector("#practice-options");
const practiceExplanation = document.querySelector("#practice-explanation");
const nextQuestionButton = document.querySelector("#next-question-button");
const practiceRedoStatus = document.querySelector("#practice-redo-status");
const practiceCorrectCount = document.querySelector("#practice-correct-count");
const monthlyCheckinCount = document.querySelector("#monthly-checkin-count");
const streakCheckinCount = document.querySelector("#streak-checkin-count");
const calendarGrid = document.querySelector(".calendar-grid");
const wrongList = document.querySelector("#wrong-list");
const wrongCountEl = document.querySelector("#wrong-count");

let currentAnalysis = null;
let activeNoteId = null;
let practiceQuestions = [];
let practiceIndex = 0;
let practiceCorrect = 0;
let practiceWrong = [];
let practiceRedoMode = false;
let selectedCurrentQuestion = false;
let practiceResultVisible = false;

const CONJUGATION_RULES = [
  {
    keywords: ["可能形", "可能"],
    title: "可能形",
    body: "表示“能做某事”。一类动词把词尾う段变え段后加る，例如 読む→読める；二类动词去る加られる，例如 食べる→食べられる；する→できる，来る→来られる。",
  },
  {
    keywords: ["過去形", "过去形", "た形"],
    title: "过去形 / た形",
    body: "表示过去发生或已经完成。动词按て形规则变成た形，例如 書く→書いた、読む→読んだ、食べる→食べた、する→した、来る→来た。",
  },
  {
    keywords: ["ている", "ている形"],
    title: "ている形",
    body: "由动词て形加いる构成。可以表示正在进行，也可以表示结果状态持续，例如 見ている、覚えている。",
  },
  {
    keywords: ["て形"],
    title: "て形",
    body: "用于连接句子、请求、进行体等。一类动词按词尾变化：く→いて、ぐ→いで、む/ぶ/ぬ→んで、う/つ/る→って、す→して；二类动词去る加て；する→して，来る→来て。",
  },
  {
    keywords: ["辞書形", "辞书形", "原形", "基本形"],
    title: "辞书形",
    body: "动词最基础的形式，也就是词典里查询到的形式，例如 見る、読む、書く、する、来る。",
  },
  {
    keywords: ["ない形", "否定形"],
    title: "ない形",
    body: "表示否定。一类动词把词尾う段变あ段后加ない，例如 読む→読まない；う结尾变わない，例如 買う→買わない；二类动词去る加ない；する→しない，来る→来ない。",
  },
  {
    keywords: ["ます形", "丁寧形"],
    title: "ます形",
    body: "表示礼貌说法。一类动词把词尾う段变い段后加ます，例如 読む→読みます；二类动词去る加ます；する→します，来る→来ます。",
  },
  {
    keywords: ["意志形", "意向形", "よう形"],
    title: "意志形",
    body: "表示“想要做、来做吧”。一类动词把词尾う段变お段后加う，例如 読む→読もう；二类动词去る加よう；する→しよう，来る→来よう。",
  },
  {
    keywords: ["被动形", "受身形"],
    title: "被动形",
    body: "表示“被……”。一类动词把词尾う段变あ段后加れる，例如 読む→読まれる；二类动词去る加られる；する→される，来る→来られる。",
  },
  {
    keywords: ["使役形"],
    title: "使役形",
    body: "表示“让某人做”。一类动词把词尾う段变あ段后加せる，例如 読む→読ませる；二类动词去る加させる；する→させる，来る→来させる。",
  },
  {
    keywords: ["命令形"],
    title: "命令形",
    body: "表示命令。一类动词把词尾う段变え段，例如 読む→読め；二类动词去る加ろ，例如 食べる→食べろ；する→しろ，来る→来い。",
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setRoute(route) {
  const nextRoute = route || "analyze";

  routeLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.route === nextRoute);
  });

  views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === nextRoute);
  });
}

function handleHashChange() {
  setRoute(window.location.hash.replace("#", "") || "analyze");
}

function getNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY)) || [];
  } catch {
    return [];
  }
}

function setNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function getCheckins() {
  try {
    return JSON.parse(localStorage.getItem(CHECKINS_KEY)) || [];
  } catch {
    return [];
  }
}

function setCheckins(checkins) {
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkins));
}

function getWrongAnswers() {
  try {
    return JSON.parse(localStorage.getItem(WRONG_ANSWERS_KEY)) || [];
  } catch {
    return [];
  }
}

function setWrongAnswers(answers) {
  localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(answers));
}

function addWrongAnswer(question) {
  const answers = getWrongAnswers();
  const dedupKey = `${question.noteId}_${question.answer}`;
  const existing = answers.findIndex((a) => a.id === dedupKey);
  const entry = {
    id: dedupKey,
    noteId: question.noteId,
    questionText: question.questionText,
    answer: question.answer,
    explanation: question.explanation,
    wrongAt: new Date().toISOString(),
  };
  if (existing !== -1) {
    answers[existing] = entry;
  } else {
    answers.unshift(entry);
  }
  setWrongAnswers(answers);
  renderWrongAnswers();
}

function removeWrongAnswer(id) {
  setWrongAnswers(getWrongAnswers().filter((a) => a.id !== id));
  renderWrongAnswers();
}

function renderWrongAnswers() {
  const answers = getWrongAnswers();
  wrongCountEl.textContent = answers.length ? `${answers.length} 题` : "";

  if (!answers.length) {
    wrongList.innerHTML =
      '<div class="wrong-empty">还没有错题记录。完成一次练习后，答错的题目会出现在这里。</div>';
    return;
  }

  wrongList.innerHTML = answers
    .map(
      (a) => `
        <article class="wrong-card">
          <div class="wrong-card-meta">
            <span>${formatDate(a.wrongAt)}</span>
            <button class="text-button" type="button" data-action="dismiss-wrong" data-wrong-id="${escapeHtml(a.id)}">已掌握</button>
          </div>
          <p class="wrong-question">${escapeHtml(a.questionText)}</p>
          <div class="wrong-answer-row">
            <span class="wrong-label">正确答案</span>
            <strong class="wrong-answer-text">${escapeHtml(a.answer)}</strong>
          </div>
          <p class="wrong-explanation">${escapeHtml(a.explanation)}</p>
        </article>
      `,
    )
    .join("");
}

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function completeTodayCheckin() {
  const today = toDateKey();
  const checkins = getCheckins();
  const exists = checkins.some((item) => item.date === today);

  if (!exists) {
    setCheckins([
      ...checkins,
      {
        date: today,
        completed: true,
        completedPracticeId: `practice_${Date.now()}`,
      },
    ]);
  }

  renderCalendar();
}

function updateNote(noteId, updater) {
  const notes = getNotes().map((note) => (note.id === noteId ? updater(note) : note));
  setNotes(notes);
  renderNotes();
  return notes.find((note) => note.id === noteId) || null;
}

function deleteNote(noteId) {
  setNotes(getNotes().filter((note) => note.id !== noteId));
  if (activeNoteId === noteId) {
    closeNoteModal();
  }
  renderNotes();
}

function parseTags(value) {
  const tags = value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set(tags)];
}

function createMockAnalysis(text) {
  const isSample = text.includes("君") || text.includes("くれた") || text.includes("覚えて");

  if (isSample) {
    return {
      id: `note_${Date.now()}`,
      originalText: text,
      romaji: "Kimi ga kureta kotoba o, ima demo zutto oboete iru.",
      translation: "你给我的话语，直到现在我也一直记得。",
      structure: "「君がくれた」修饰「言葉」；「言葉を」是宾语；「今でもずっと」说明时间和持续感；「覚えている」是句子的核心谓语。",
      words: [
        { surface: "君", reading: "きみ", partOfSpeech: "名词", meaning: "你" },
        { surface: "くれた", reading: "くれた", partOfSpeech: "动词", meaning: "给了我" },
        { surface: "言葉", reading: "ことば", partOfSpeech: "名词", meaning: "话语" },
        { surface: "覚えている", reading: "おぼえている", partOfSpeech: "动词", meaning: "记得，仍然记着" },
      ],
      verbs: [
        {
          surface: "くれた",
          dictionaryForm: "くれる",
          conjugation: "过去形",
          reason: "表示对方过去给了说话者某物或某种情感上的给予。",
          role: "修饰「言葉」的从句谓语",
        },
        {
          surface: "覚えている",
          dictionaryForm: "覚える",
          conjugation: "ている形",
          reason: "「覚える」变为て形「覚えて」后接「いる」，表示记住后的状态持续到现在。",
          role: "主句谓语",
        },
      ],
      grammarPoints: [
        {
          pattern: "名词 + が + 动词 + 名词",
          meaning: "前面的动词小句修饰后面的名词",
          explanation: "「君がくれた」整体作为定语，说明是什么样的「言葉」。",
        },
        {
          pattern: "今でもずっと",
          meaning: "直到现在也一直",
          explanation: "强调某个状态从过去延续到现在，和「覚えている」搭配自然。",
        },
      ],
      summary: "这句话的重点是小句修饰名词，以及「ている」表示结果状态持续。",
      tags: ["动词", "语法"],
      isFavorite: false,
      reviewCount: 0,
      lastReviewedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: `note_${Date.now()}`,
    originalText: text,
    romaji: "Romaji will be generated by the AI service later.",
    translation: "这里先显示模拟释义，后续会替换成真实 AI 拆解结果。",
    structure: "当前版本会先把输入内容整理成主干、修饰成分、谓语和补充信息几个部分，方便页面流程先跑通。",
    words: [
      { surface: text.slice(0, 6) || "見る", reading: "よみかた", partOfSpeech: "短语", meaning: "从输入句子中提取的复习片段" },
      { surface: text.slice(-6) || "見る", reading: "よみかた", partOfSpeech: "短语", meaning: "从输入句子中提取的复习片段" },
      { surface: "見る", reading: "みる", partOfSpeech: "动词", meaning: "看，理解" },
    ],
    verbs: [
      {
        surface: "見る",
        dictionaryForm: "見る",
        conjugation: "辞书形",
        reason: "示例动词，用于占位展示动词原型、变形和原因的结构。",
        role: "示例谓语",
      },
    ],
    grammarPoints: [
      {
        pattern: "句子拆解",
        meaning: "把长句拆成更容易理解的小块",
        explanation: "真实 AI 接入后，这里会显示从句、助词、动词变化和语法表达。",
      },
    ],
    summary: "这是一条模拟拆解笔记，用来验证保存、展示和后续练习流程。",
    tags: ["语法"],
    isFavorite: false,
    reviewCount: 0,
    lastReviewedAt: null,
    createdAt: new Date().toISOString(),
  };
}

function normalizeAnalysis(analysis, originalText) {
  return {
    id: analysis.id || `note_${Date.now()}`,
    originalText: analysis.originalText || originalText,
    romaji: analysis.romaji || "",
    translation: analysis.translation || "",
    structure: analysis.structure || "",
    words: asArray(analysis.words),
    verbs: asArray(analysis.verbs),
    grammarPoints: asArray(analysis.grammarPoints),
    summary: analysis.summary || "",
    tags: asArray(analysis.tags).length ? analysis.tags : ["AI拆解"],
    isFavorite: Boolean(analysis.isFavorite),
    reviewCount: Number(analysis.reviewCount || 0),
    lastReviewedAt: analysis.lastReviewedAt || null,
    createdAt: analysis.createdAt || new Date().toISOString(),
  };
}

function renderRubyText(analysis) {
  const originalText = analysis.originalText || "";
  const words = asArray(analysis.words).filter((word) => word.surface && word.romaji);

  if (!words.length) {
    return `<ruby>${escapeHtml(originalText)}<rt>${escapeHtml(analysis.romaji || "")}</rt></ruby>`;
  }

  let cursor = 0;
  let html = "";

  for (const word of words) {
    const surface = String(word.surface);
    const index = originalText.indexOf(surface, cursor);

    if (index === -1) {
      continue;
    }

    html += escapeHtml(originalText.slice(cursor, index));
    html += `<ruby>${escapeHtml(surface)}<rt>${escapeHtml(word.romaji)}</rt></ruby>`;
    cursor = index + surface.length;
  }

  html += escapeHtml(originalText.slice(cursor));

  if (!html.trim()) {
    return `<ruby>${escapeHtml(originalText)}<rt>${escapeHtml(analysis.romaji || "")}</rt></ruby>`;
  }

  return html;
}

function getConjugationRule(conjugation = "") {
  const text = String(conjugation);
  return (
    CONJUGATION_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword))) || {
      title: conjugation || "变形规则",
      body: "当前变形暂时没有内置规则。可以先参考 AI 给出的变化原因，后续会继续补充更多变形说明。",
    }
  );
}

function renderVerbCards(verbs) {
  return asArray(verbs)
    .map((verb) => {
      const rule = getConjugationRule(verb.conjugation);

      return `
        <article class="verb-card">
          <strong>${escapeHtml(verb.surface)} / 原型：${escapeHtml(verb.dictionaryForm)}</strong>
          <span class="verb-line">
            变形：
            <button class="conjugation-button" type="button" data-conjugation-rule="${escapeHtml(rule.title)}">
              ${escapeHtml(verb.conjugation)}
            </button>
          </span>
          <div class="conjugation-rule is-hidden" data-rule-panel="${escapeHtml(rule.title)}">
            <strong>${escapeHtml(rule.title)}的规则</strong>
            <p>${escapeHtml(rule.body)}</p>
          </div>
          <span>原因：${escapeHtml(verb.reason)}</span>
          <span>作用：${escapeHtml(verb.role)}</span>
        </article>
      `;
    })
    .join("");
}

function isServerMode() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

async function requestAiAnalysis(text) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "AI 拆解失败");
  }

  return normalizeAnalysis(payload, text);
}

function renderAnalysis(analysis) {
  previewRuby.innerHTML = renderRubyText(analysis);
  previewTranslation.textContent = analysis.translation;
  previewStructure.textContent = analysis.structure;

  previewWords.innerHTML = analysis.words
    .map(
      (word) => `
        <tr>
          <td>${escapeHtml(word.surface)}</td>
          <td>${escapeHtml(word.reading)}</td>
          <td>${escapeHtml(word.partOfSpeech)}</td>
          <td>${escapeHtml(word.meaning)}</td>
        </tr>
      `,
    )
    .join("");

  previewVerbs.innerHTML = renderVerbCards(analysis.verbs);

  previewGrammar.innerHTML = analysis.grammarPoints
    .map(
      (grammar) => `
        <article class="grammar-card">
          <strong>${escapeHtml(grammar.pattern)}</strong>
          <span>${escapeHtml(grammar.meaning)}</span>
          <span>${escapeHtml(grammar.explanation)}</span>
        </article>
      `,
    )
    .join("");

  saveStatus.textContent = "";
  analysisEmpty.classList.add("is-hidden");
  analysisPreview.classList.remove("is-hidden");
}

async function showMockAnalysis() {
  const text = japaneseInput.value.trim();

  if (!text) {
    inputMessage.textContent = "先输入一句日语，再开始拆解。";
    japaneseInput.focus();
    return;
  }

  // 离线演示版：不调用任何 AI 接口，直接展示内置示例拆解。
  inputMessage.textContent = "";
  currentAnalysis = createMockAnalysis(text);
  inputMessage.textContent = "离线演示模式：展示的是内置示例拆解结果，无需 API。";
  renderAnalysis(currentAnalysis);
}

function clearAnalysis() {
  japaneseInput.value = "";
  currentAnalysis = null;
  inputMessage.textContent = "";
  saveStatus.textContent = "";
  previewRuby.innerHTML = "";
  analysisPreview.classList.add("is-hidden");
  analysisEmpty.classList.remove("is-hidden");
  japaneseInput.focus();
}

function saveCurrentNote() {
  if (!currentAnalysis) {
    saveStatus.textContent = "先拆解一句日语。";
    japaneseInput.focus();
    return;
  }

  const notes = getNotes();
  const alreadySaved = notes.some((note) => note.originalText === currentAnalysis.originalText);

  if (alreadySaved) {
    saveStatus.textContent = "这句已经在笔记本里。";
    return;
  }

  setNotes([currentAnalysis, ...notes]);
  saveStatus.textContent = "已保存到笔记本。";
  renderNotes();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderNotes() {
  const query = noteSearch.value.trim().toLowerCase();
  const notes = getNotes().filter((note) => {
    const target = [note.originalText, note.translation, note.summary, note.tags.join(" ")]
      .join(" ")
      .toLowerCase();
    return target.includes(query);
  });

  if (!notes.length) {
    noteList.innerHTML = `
        <article class="note-card muted-card">
          <header>
            <span class="note-tag">暂无</span>
          </header>
          <h2>还没有匹配的笔记</h2>
          <p>保存一次拆解结果后，笔记会出现在这里。</p>
      </article>
    `;
    return;
  }

  noteList.innerHTML = notes
    .map(
      (note) => `
        <article class="note-card" data-note-id="${escapeHtml(note.id)}">
          <header>
            <span class="note-tag">${escapeHtml(note.tags[0] || "笔记")}</span>
            <span class="meta-label">${note.isFavorite ? '<span class="favorite-mark">已收藏</span> · ' : ""}${formatDate(note.createdAt)}</span>
          </header>
          <div class="note-actions">
            <button class="text-button" type="button" data-action="detail" data-note-id="${escapeHtml(note.id)}">查看</button>
            <button class="text-button" type="button" data-action="favorite" data-note-id="${escapeHtml(note.id)}">${note.isFavorite ? "取消收藏" : "收藏"}</button>
            <button class="danger-button" type="button" data-action="delete" data-note-id="${escapeHtml(note.id)}">删除</button>
          </div>
          <h2>${escapeHtml(note.originalText)}</h2>
          <p>${escapeHtml(note.translation)}</p>
          <p>${escapeHtml(note.summary)}</p>
          <div class="note-meta">
            ${note.tags.map((tag) => `<span class="note-tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function getNoteById(noteId) {
  return getNotes().find((note) => note.id === noteId) || null;
}

function renderNoteDetail(note) {
  noteDetail.innerHTML = `
    <section class="detail-section">
      <span class="meta-label">原文</span>
      <p>${escapeHtml(note.originalText)}</p>
    </section>
    <section class="detail-section">
      <span class="meta-label">罗马音</span>
      <p>${escapeHtml(note.romaji)}</p>
    </section>
    <section class="detail-section">
      <span class="meta-label">中文释义</span>
      <p>${escapeHtml(note.translation)}</p>
    </section>
    <section class="detail-section">
      <span class="meta-label">句子结构</span>
      <p>${escapeHtml(note.structure)}</p>
    </section>
    <section class="detail-section">
      <span class="meta-label">重点词汇</span>
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>单词</th>
              <th>读音</th>
              <th>词性</th>
              <th>含义</th>
            </tr>
          </thead>
          <tbody>
            ${note.words
              .map(
                (word) => `
                  <tr>
                    <td>${escapeHtml(word.surface)}</td>
                    <td>${escapeHtml(word.reading)}</td>
                    <td>${escapeHtml(word.partOfSpeech)}</td>
                    <td>${escapeHtml(word.meaning)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="detail-section">
      <span class="meta-label">动词变形</span>
      <div class="verb-list">
        ${renderVerbCards(note.verbs)}
      </div>
    </section>
    <section class="detail-section">
      <span class="meta-label">语法点</span>
      <div class="grammar-list">
        ${note.grammarPoints
          .map(
            (grammar) => `
              <article class="grammar-card">
                <strong>${escapeHtml(grammar.pattern)}</strong>
                <span>${escapeHtml(grammar.meaning)}</span>
                <span>${escapeHtml(grammar.explanation)}</span>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
  tagEditor.value = note.tags.join(", ");
}

function openNoteModal(noteId) {
  const note = getNoteById(noteId);

  if (!note) {
    return;
  }

  activeNoteId = noteId;
  tagMessage.textContent = "";
  renderNoteDetail(note);
  noteModal.classList.remove("is-hidden");
}

function closeNoteModal() {
  activeNoteId = null;
  noteModal.classList.add("is-hidden");
}

function handleNoteAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const { action, noteId } = actionButton.dataset;

  if (action === "detail") {
    openNoteModal(noteId);
  }

  if (action === "favorite") {
    updateNote(noteId, (note) => ({ ...note, isFavorite: !note.isFavorite }));
  }

  if (action === "delete") {
    const note = getNoteById(noteId);
    const preview = note ? `「${note.originalText.slice(0, 18)}」` : "这条笔记";

    if (window.confirm(`确定删除 ${preview} 吗？`)) {
      deleteNote(noteId);
    }
  }
}

function toggleConjugationRule(event) {
  const button = event.target.closest("[data-conjugation-rule]");

  if (!button) {
    return;
  }

  const card = button.closest(".verb-card");
  const panel = card?.querySelector(".conjugation-rule");

  if (panel) {
    panel.classList.toggle("is-hidden");
  }
}

function saveTagsForActiveNote() {
  if (!activeNoteId) {
    return;
  }

  const nextTags = parseTags(tagEditor.value);

  if (!nextTags.length) {
    tagMessage.textContent = "至少保留一个标签。";
    return;
  }

  const updatedNote = updateNote(activeNoteId, (note) => ({ ...note, tags: nextTags }));

  if (updatedNote) {
    renderNoteDetail(updatedNote);
    tagMessage.textContent = "标签已保存。";
  }
}

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPracticeCandidate(value) {
  const text = String(value || "").trim();
  const blocked = new Set(["输入文本", "文", "句子", "文本", "选项", "选项1", "选项2", "选项3", "选项4"]);

  return text.length > 0 && !blocked.has(text);
}

function getCandidateText(value) {
  const text = String(value || "").trim();

  if (!isPracticeCandidate(text)) {
    return "";
  }

  return text.length > 12 ? "" : text;
}

function makeBlank(text, answer) {
  if (text.includes(answer)) {
    return text.replace(answer, "____");
  }

  return `${text}  ____`;
}

function buildOptions(answer, candidates) {
  const fallback = ["見る", "見ていた", "くれた", "覚えている", "です", "ます", "言葉", "君"];
  const options = uniqueItems([answer, ...shuffleItems(candidates), ...fallback].filter(isPracticeCandidate)).slice(0, 4);

  while (options.length < 4) {
    options.push(`选项${options.length + 1}`);
  }

  return shuffleItems(options);
}

function generatePracticeQuestions() {
  const notes = getNotes();
  const candidates = notes.flatMap((note) => {
    const verbs = asArray(note.verbs);
    const words = asArray(note.words);

    return [
      ...verbs.map((verb) => verb.surface),
      ...verbs.map((verb) => verb.dictionaryForm),
      ...words.map((word) => word.surface),
    ].map(getCandidateText).filter(Boolean);
  });

  const sourceQuestions = notes.flatMap((note) => {
    const verbs = asArray(note.verbs);
    const words = asArray(note.words);
    const originalText = note.originalText || "这条笔记";
    const validWords = words.filter((word) => getCandidateText(word.surface));
    const validVerbs = verbs.filter((verb) => getCandidateText(verb.surface));
    const fallbackAnswer = validWords[0]?.surface || validVerbs[0]?.surface || originalText.slice(0, 2);

    const verbQuestions = validVerbs.map((verb, index) => ({
      id: `practice_${note.id}_verb_${index}`,
      noteId: note.id,
      questionText: makeBlank(originalText, verb.surface),
      options: buildOptions(verb.surface, candidates),
      answer: verb.surface,
      explanation: `${verb.surface} 的原型是 ${verb.dictionaryForm}。这里是${verb.conjugation}，因为${verb.reason}`,
      type: "word_blank",
    }));

    const wordQuestions = validWords.slice(0, 3).map((word, index) => ({
      id: `practice_${note.id}_word_${index}`,
      noteId: note.id,
      questionText: makeBlank(originalText, word.surface),
      options: buildOptions(word.surface, candidates),
      answer: word.surface,
      explanation: `${word.surface} 读作 ${word.reading}，意思是“${word.meaning}”。`,
      type: "word_blank",
    }));

    const fallbackQuestion = {
      id: `practice_${note.id}_fallback`,
      noteId: note.id,
      questionText: makeBlank(originalText, fallbackAnswer),
      options: buildOptions(fallbackAnswer, candidates),
      answer: fallbackAnswer,
      explanation: "这是一道根据当前笔记生成的复习题。",
      type: "word_blank",
    };

    return [...verbQuestions, ...wordQuestions, fallbackQuestion].filter((question) => question.answer);
  });

  const shuffled = shuffleItems(sourceQuestions);

  if (!shuffled.length) {
    return [];
  }

  const questions = [];
  for (let i = 0; questions.length < 5; i += 1) {
    const baseQuestion = shuffled[i % shuffled.length];
    questions.push({ ...baseQuestion, id: `${baseQuestion.id}_${i}` });
  }

  return questions;
}

function renderPracticeEmpty(message) {
  practicePanel.classList.remove("is-hidden");
  practiceQuestions = [];
  practiceIndex = 0;
  practiceCorrect = 0;
  practiceWrong = [];
  practiceRedoMode = false;
  selectedCurrentQuestion = false;
  practiceResultVisible = false;
  practiceProgressLabel.textContent = "准备开始";
  practiceProgressCount.textContent = "0 / 5";
  practiceQuestion.textContent = message;
  practiceOptions.innerHTML = `
    <button type="button" disabled>选项</button>
    <button type="button" disabled>选项</button>
    <button type="button" disabled>选项</button>
    <button type="button" disabled>选项</button>
  `;
  practiceExplanation.textContent = "";
  nextQuestionButton.classList.add("is-hidden");
  practiceRedoStatus.textContent = "待开始";
  practiceCorrectCount.textContent = "0";
}

function renderCurrentPracticeQuestion() {
  practicePanel.classList.remove("is-hidden");
  const question = practiceQuestions[practiceIndex];
  selectedCurrentQuestion = false;
  practiceResultVisible = false;

  if (!question) {
    renderPracticeResult();
    return;
  }

  practiceProgressLabel.textContent = practiceRedoMode ? `错题重做 第 ${practiceIndex + 1} 题` : `第 ${practiceIndex + 1} 题`;
  practiceProgressCount.textContent = `${practiceIndex + 1} / ${practiceQuestions.length}`;
  practiceQuestion.textContent = question.questionText;
  practiceExplanation.textContent = "";
  nextQuestionButton.textContent = practiceIndex === practiceQuestions.length - 1 ? "查看结果" : "下一题";
  nextQuestionButton.classList.add("is-hidden");

  practiceOptions.innerHTML = question.options
    .map((option) => `<button type="button" data-option="${escapeHtml(option)}">${escapeHtml(option)}</button>`)
    .join("");
}

function startPractice() {
  practicePanel.classList.remove("is-hidden");
  const notes = getNotes();

  if (!notes.length) {
    renderPracticeEmpty("先保存一条拆解笔记，再开始练习。");
    return;
  }

  let questions = [];

  try {
    questions = generatePracticeQuestions();
  } catch {
    renderPracticeEmpty("练习题生成失败。请先保存一条新的拆解笔记，再回来练习。");
    return;
  }

  if (!questions.length) {
    renderPracticeEmpty("当前笔记还没有足够的词汇或动词可以出题。");
    return;
  }

  practiceQuestions = questions;
  practiceIndex = 0;
  practiceCorrect = 0;
  practiceWrong = [];
  practiceRedoMode = false;
  practiceResultVisible = false;
  practiceRedoStatus.textContent = "本轮进行中";
  practiceCorrectCount.textContent = "0";
  renderCurrentPracticeQuestion();
}

function choosePracticeOption(optionButton) {
  if (selectedCurrentQuestion) {
    return;
  }

  const question = practiceQuestions[practiceIndex];

  if (!question) {
    return;
  }

  selectedCurrentQuestion = true;
  const selected = optionButton.dataset.option;
  const isCorrect = selected === question.answer;

  [...practiceOptions.querySelectorAll("button")].forEach((button) => {
    button.disabled = true;
    if (button.dataset.option === question.answer) {
      button.classList.add("is-correct");
    }
  });

  if (!isCorrect) {
    optionButton.classList.add("is-wrong");
    practiceWrong.push(question);
    addWrongAnswer(question);
  } else {
    practiceCorrect += 1;
    practiceCorrectCount.textContent = String(practiceCorrect);
  }

  practiceExplanation.textContent = isCorrect ? `答对了。${question.explanation}` : `这里应选择「${question.answer}」。${question.explanation}`;
  nextQuestionButton.classList.remove("is-hidden");
}

function goToNextPracticeQuestion() {
  practiceIndex += 1;
  renderCurrentPracticeQuestion();
}

function renderPracticeResult() {
  const total = practiceQuestions.length;
  const wrongCount = practiceWrong.length;
  practiceResultVisible = true;

  practiceProgressLabel.textContent = practiceRedoMode ? "错题重做结果" : "本轮结果";
  practiceProgressCount.textContent = `${total - wrongCount} / ${total}`;

  if (wrongCount > 0) {
    startWrongRedo();
    return;
  }

  practiceQuestion.textContent = practiceRedoMode ? "错题全部完成。" : "本轮 5 道练习完成。";
  practiceOptions.innerHTML = "";
  practiceExplanation.textContent = "练习完成，今日打卡已记录。";
  nextQuestionButton.classList.add("is-hidden");
  practiceRedoStatus.textContent = "已完成";
  completeTodayCheckin();
}

function startWrongRedo() {
  practiceQuestions = practiceWrong;
  practiceWrong = [];
  practiceIndex = 0;
  practiceCorrect = 0;
  practiceRedoMode = true;
  practiceResultVisible = false;
  practiceCorrectCount.textContent = "0";
  practiceRedoStatus.textContent = "重做中";
  renderCurrentPracticeQuestion();
}

function handlePracticeNext() {
  if (practiceResultVisible) {
    return;
  }

  if (practiceIndex >= practiceQuestions.length) {
    return;
  }

  if (practiceIndex === practiceQuestions.length - 1 && selectedCurrentQuestion) {
    practiceIndex += 1;
    renderPracticeResult();
    return;
  }

  goToNextPracticeQuestion();
}

function handlePracticeResultAction() {
  if (practiceResultVisible && practiceWrong.length > 0) {
    startWrongRedo();
    return true;
  }

  return false;
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const today = now.getDate();
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const completedDays = new Set(
    getCheckins()
      .filter((item) => item.completed && item.date.startsWith(monthPrefix))
      .map((item) => Number(item.date.slice(-2))),
  );

  calendarGrid.innerHTML = `
    <span class="weekday">一</span>
    <span class="weekday">二</span>
    <span class="weekday">三</span>
    <span class="weekday">四</span>
    <span class="weekday">五</span>
    <span class="weekday">六</span>
    <span class="weekday">日</span>
  `;

  monthlyCheckinCount.textContent = `${completedDays.size} 天`;
  streakCheckinCount.textContent = `${calculateCheckinStreak()} 天`;

  for (let i = 0; i < mondayFirstOffset; i += 1) {
    const blank = document.createElement("span");
    blank.className = "day-cell is-blank";
    calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = document.createElement("span");
    cell.className = "day-cell";
    cell.textContent = String(day);
    cell.classList.toggle("is-done", completedDays.has(day));
    cell.classList.toggle("is-today", day === today);
    calendarGrid.appendChild(cell);
  }
}

function calculateCheckinStreak() {
  const completed = new Set(getCheckins().filter((item) => item.completed).map((item) => item.date));
  let streak = 0;
  const cursor = new Date();

  while (completed.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

window.addEventListener("hashchange", handleHashChange);
analyzeButton.addEventListener("click", showMockAnalysis);
clearButton.addEventListener("click", clearAnalysis);
saveNoteButton.addEventListener("click", saveCurrentNote);
previewVerbs.addEventListener("click", toggleConjugationRule);
noteSearch.addEventListener("input", renderNotes);
noteList.addEventListener("click", handleNoteAction);
closeNoteModalButton.addEventListener("click", closeNoteModal);
saveTagsButton.addEventListener("click", saveTagsForActiveNote);
noteDetail.addEventListener("click", toggleConjugationRule);
noteModal.addEventListener("click", (event) => {
  if (event.target === noteModal) {
    closeNoteModal();
  }
});
wrongList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='dismiss-wrong']");
  if (button) {
    removeWrongAnswer(button.dataset.wrongId);
  }
});
startPracticeButton.addEventListener("click", startPractice);
practiceOptions.addEventListener("click", (event) => {
  const optionButton = event.target.closest("[data-option]");

  if (optionButton) {
    choosePracticeOption(optionButton);
  }
});
nextQuestionButton.addEventListener("click", () => {
  if (!handlePracticeResultAction()) {
    handlePracticeNext();
  }
});
routeJumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    window.location.hash = button.dataset.routeJump;
  });
});

handleHashChange();
renderCalendar();
renderNotes();
renderWrongAnswers();
