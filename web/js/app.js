import { lessons, modules, playground, allLessons } from './lessons/index.js';
import { reference } from './reference.js';
import { Editor, highlight } from './editor.js';
import { Runner } from './runner.js';

const $ = (sel, root = document) => root.querySelector(sel);
const main = $('#main');
const sidebar = $('#sidebar');
const scrim = $('#scrim');

// ---------------------------------------------------------------- storage
// localStorage can throw (private mode, blocked storage), so every access is guarded.
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`glt:${key}`);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`glt:${key}`, JSON.stringify(value)); } catch { /* ignore */ }
  },
  remove(key) {
    try { localStorage.removeItem(`glt:${key}`); } catch { /* ignore */ }
  },
};

// True inside the Android APK (its WebView adds this to the user agent).
const inApp = /GLTrainerApp/.test(navigator.userAgent);
if (inApp) document.documentElement.classList.add('in-app');

let progress = store.get('progress', {});
const settings = Object.assign({ autorun: true }, store.get('settings', {}));

function lessonProgress(id) {
  return (progress[id] ||= { done: false, quiz: {}, challenges: [] });
}
function saveProgress() {
  store.set('progress', progress);
  renderProgressPill();
  renderSidebar();
}
const doneCount = () => lessons.filter((l) => progress[l.id]?.done).length;

// ---------------------------------------------------------------- chrome
function renderProgressPill() {
  const n = doneCount();
  $('#progressPill').innerHTML =
    `<span class="ring" style="--p:${n / lessons.length}"></span>${n}/${lessons.length}`;
  $('#progressPill').title = `${n} of ${lessons.length} lessons complete`;
}

function renderSidebar() {
  const current = location.hash;
  let html = '';
  for (const mod of modules) {
    html += `<div class="nav-group"><div class="nav-title">${mod.title}</div>`;
    for (const id of mod.ids) {
      const i = lessons.findIndex((l) => l.id === id);
      const l = lessons[i];
      const href = `#/lesson/${l.id}`;
      html += `<a href="${href}" class="nav-item${current === href ? ' active' : ''}">
        <span class="nav-num${progress[l.id]?.done ? ' done' : ''}">${progress[l.id]?.done ? '✓' : i + 1}</span>
        <span>${l.title}</span></a>`;
    }
    html += '</div>';
  }
  html += `<div class="nav-group"><div class="nav-title">Tools</div>
    <a href="#/lesson/playground" class="nav-item${current === '#/lesson/playground' ? ' active' : ''}"><span class="nav-num">✦</span><span>Shader Playground</span></a>
    <a href="#/reference" class="nav-item${current === '#/reference' ? ' active' : ''}"><span class="nav-num">?</span><span>Cheat Sheet</span></a>
  </div>`;
  sidebar.innerHTML = html;
}

function openDrawer(open) {
  document.body.classList.toggle('drawer-open', open);
  scrim.hidden = !open;
}
$('#menuBtn').addEventListener('click', () => openDrawer(!document.body.classList.contains('drawer-open')));
scrim.addEventListener('click', () => openDrawer(false));
sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) openDrawer(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openDrawer(false); });

function highlightSnippets(root) {
  root.querySelectorAll('pre.snippet').forEach((pre) => {
    pre.innerHTML = highlight(pre.textContent, pre.dataset.lang || 'glsl');
  });
}

// ---------------------------------------------------------------- views
let activeRunner = null;
function teardown() {
  activeRunner?.stop();
  activeRunner = null;
  document.body.classList.remove('stage-full');
}

function route() {
  teardown();
  const hash = location.hash || '#/';
  const m = /^#\/lesson\/([\w-]+)/.exec(hash);
  if (m) {
    const lesson = allLessons.find((l) => l.id === m[1]);
    if (lesson) renderLesson(lesson);
    else renderHome();
  } else if (hash.startsWith('#/reference')) {
    renderReference();
  } else {
    renderHome();
  }
  renderSidebar();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

const HERO_SHADER = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
out vec4 outColor;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float t = uTime * 0.4;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 p = uv * (1.5 + fi * 0.6);
    p += vec2(sin(t + fi * 2.1), cos(t * 1.3 + fi)) * 0.4;
    float d = abs(length(p) - 0.5 - 0.1 * sin(atan(p.y, p.x) * 3.0 + t * 2.0));
    col[i] += 0.012 / d;
  }
  col += vec3(0.04, 0.05, 0.1);
  outColor = vec4(1.0 - exp(-col * 1.2), 1.0);
}`;

const HERO_JS = `const program = H.createProgram(gl, shaders.vs, shaders.fs);
const vao = gl.createVertexArray();
const uRes = gl.getUniformLocation(program, 'uResolution');
const uTime = gl.getUniformLocation(program, 'uTime');
return (t) => {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uTime, t);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};`;

function renderHome() {
  document.title = 'GL Trainer: learn graphics programming & OpenGL';
  const last = store.get('last', null);
  const next = lessons.find((l) => !progress[l.id]?.done) || lessons[0];
  const resume = allLessons.find((l) => l.id === last) || next;
  const n = doneCount();

  let modulesHtml = '';
  for (const mod of modules) {
    modulesHtml += `<section class="module"><h2>${mod.title}</h2><div class="cards">`;
    for (const id of mod.ids) {
      const i = lessons.findIndex((l) => l.id === id);
      const l = lessons[i];
      const done = progress[l.id]?.done;
      modulesHtml += `<a class="card${done ? ' done' : ''}" href="#/lesson/${l.id}">
        <div class="card-top"><span class="card-num">${done ? '✓' : String(i + 1).padStart(2, '0')}</span>
        <span class="card-min">${l.minutes} min</span></div>
        <h3>${l.title}</h3><p>${l.summary}</p></a>`;
    }
    modulesHtml += '</div></section>';
  }

  main.innerHTML = `
  <div class="home">
    <section class="hero">
      <div class="hero-stage" id="heroStage"></div>
      <div class="hero-text">
        <p class="eyebrow">Interactive course · ${lessons.length} lessons</p>
        <h1>Learn graphics programming by writing real OpenGL.</h1>
        <p>Every lesson runs live WebGL2 (OpenGL ES 3.0) code on your GPU. Read the idea, edit the
        shaders, see the result instantly, then see the same code in desktop C++ OpenGL.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#/lesson/${resume.id}">${n || last ? 'Continue' : 'Start'}: ${resume.title}</a>
          <a class="btn" href="#/lesson/playground">Shader playground</a>
        </div>
        <div class="home-progress"><div class="bar"><span style="width:${(n / lessons.length) * 100}%"></span></div>
          <span>${n} of ${lessons.length} complete</span></div>
      </div>
    </section>
    ${modulesHtml}
    <section class="module">
      <h2>Tools</h2>
      <div class="cards">
        <a class="card" href="#/lesson/playground"><div class="card-top"><span class="card-num">✦</span></div>
          <h3>Shader Playground</h3><p>${playground.summary}</p></a>
        <a class="card" href="#/reference"><div class="card-top"><span class="card-num">?</span></div>
          <h3>Cheat Sheet</h3><p>GLSL types and functions, draw calls, state, and a "why is my screen black" checklist.</p></a>
      </div>
    </section>
    ${inApp ? '' : `<section class="module install-help">
      <h2>Use it on your phone</h2>
      <div class="install-grid">
        <div><h3>iPhone / iPad (Safari)</h3><p>Tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</p></div>
        <div><h3>Android (Chrome)</h3><p>Tap <b>⋮</b> → <b>Install app</b> (or "Add to Home screen"). You can also use the Install button at the top.</p></div>
        <div><h3>Works offline</h3><p>Once installed, lessons, your code and your progress stay on your device.</p></div>
      </div>
    </section>`}
    <footer class="foot"><button class="link" id="resetAll">Reset all progress</button></footer>
  </div>`;

  $('#resetAll').addEventListener('click', () => {
    if (!confirm('Reset all lesson progress and saved code?')) return;
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('glt:')).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    progress = {};
    saveProgress();
    route();
  });

  const runner = new Runner($('#heroStage'), { onLog() {}, onError() {} });
  runner.run({ js: HERO_JS, shaders: { vs: playground.files.find((f) => f.key === 'vs').code, fs: HERO_SHADER } });
  activeRunner = runner;
}

function renderReference() {
  document.title = 'Cheat Sheet · GL Trainer';
  main.innerHTML = `<article class="reference prose">${reference}</article>`;
  highlightSnippets(main);
}

// ---------------------------------------------------------------- lesson
const KEYBAR = ['⇥', '{', '}', '(', ')', '[', ']', ';', '.', ',', '=', '+', '-', '*', '/', '<', '>', '"', "'", '_', '#', '&', '|'];

function renderLesson(lesson) {
  store.set('last', lesson.id);
  const index = lessons.indexOf(lesson);
  const isPlayground = !!lesson.playground;
  const hasCode = lesson.files.length > 0;
  const p = lessonProgress(lesson.id);
  document.title = `${lesson.title} · GL Trainer`;

  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const eyebrow = isPlayground ? 'Playground' : `Lesson ${index + 1} of ${lessons.length} · ${lesson.minutes} min`;

  main.innerHTML = `
  <div class="lesson${hasCode ? '' : ' no-code'}" data-view="learn">
    ${hasCode ? `<div class="mobile-tabs" role="tablist">
      <button role="tab" data-view="learn" aria-selected="true">Learn</button>
      <button role="tab" data-view="code" aria-selected="false">Code &amp; preview</button>
    </div>` : ''}
    <article class="learn-pane prose">
      <p class="eyebrow">${eyebrow}</p>
      <h1>${lesson.title}</h1>
      <p class="lead">${lesson.summary}</p>
      <div class="content">${lesson.content}</div>
      ${hasCode ? '<button class="btn primary try-it" data-goto="code">Open the code →</button>' : ''}
      ${lesson.challenges.length ? `<section class="challenges"><h2>Challenges</h2><p class="muted">Try these in the editor. Tick them off as you go.</p>
        ${lesson.challenges.map((c, i) => `
          <div class="challenge${p.challenges[i] ? ' checked' : ''}">
            <label><input type="checkbox" data-ch="${i}" ${p.challenges[i] ? 'checked' : ''}><span>${c.task}</span></label>
            <details><summary>Hint</summary><p>${c.hint}</p></details>
          </div>`).join('')}
      </section>` : ''}
      ${lesson.cpp ? `<details class="cpp"><summary>Desktop OpenGL (C++) version</summary>
        <pre class="snippet" data-lang="cpp">${escapeHtml(lesson.cpp)}</pre></details>` : ''}
      ${lesson.quiz.length ? `<section class="quiz"><h2>Check your understanding</h2>
        ${lesson.quiz.map((q, qi) => `
          <div class="q" data-q="${qi}">
            <p class="q-text"><b>${qi + 1}.</b> ${q.q}</p>
            <div class="options">${q.options.map((o, oi) => `<button class="opt" data-o="${oi}">${o}</button>`).join('')}</div>
            <p class="explain" hidden></p>
          </div>`).join('')}
        <div class="complete-banner" hidden>🎉 Lesson complete!</div>
      </section>` : ''}
      ${isPlayground ? '' : `<nav class="lesson-nav">
        ${prev ? `<a class="btn" href="#/lesson/${prev.id}">← ${prev.title}</a>` : '<span></span>'}
        ${next ? `<a class="btn primary" href="#/lesson/${next.id}">Next: ${next.title} →</a>` : '<a class="btn primary" href="#/lesson/playground">Open the playground →</a>'}
      </nav>`}
    </article>
    ${hasCode ? `<section class="work-pane">
      <div class="stage" id="stage">
        <div class="stage-hud">
          <span class="fps" id="fps"></span>
          <button class="icon-btn sm" id="pauseBtn" title="Pause / resume" aria-label="Pause">❚❚</button>
          <button class="icon-btn sm" id="fullBtn" title="Full screen preview" aria-label="Full screen">⤢</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="file-tabs" role="tablist">
          ${lesson.files.map((f, i) => `<button role="tab" class="file-tab${i === 0 ? ' active' : ''}" data-file="${f.key}">${f.name}<i class="dot" hidden></i></button>`).join('')}
        </div>
        <div class="actions">
          <label class="toggle" title="Re-run automatically as you type"><input type="checkbox" id="autorun" ${settings.autorun ? 'checked' : ''}><span>Auto</span></label>
          <button class="btn sm" id="resetBtn" title="Restore the original code">Reset</button>
          <button class="btn sm primary" id="runBtn" title="Run (Ctrl+Enter)">▶ Run</button>
        </div>
      </div>
      <div class="editor-host" id="editorHost"></div>
      <div class="keybar" id="keybar">${KEYBAR.map((k) => `<button tabindex="-1" data-k="${escapeHtml(k)}">${escapeHtml(k)}</button>`).join('')}</div>
      <div class="console" id="console" aria-live="polite"></div>
    </section>` : ''}
  </div>`;

  highlightSnippets(main);
  setupQuiz(lesson);
  setupChallenges(lesson);

  const lessonEl = $('.lesson', main);
  const setView = (view) => {
    lessonEl.dataset.view = view;
    lessonEl.querySelectorAll('.mobile-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
    window.scrollTo(0, 0);
    activeRunner?.setPaused(view !== 'code' && isNarrow());
  };
  lessonEl.querySelectorAll('[data-view]').forEach((b) => b.tagName === 'BUTTON' && b.addEventListener('click', () => setView(b.dataset.view)));
  lessonEl.querySelector('.try-it')?.addEventListener('click', () => {
    if (isNarrow()) setView('code');
    else $('#editorHost')?.querySelector('textarea')?.focus();
  });

  if (hasCode) setupWorkbench(lesson);
  if (isPlayground && isNarrow()) setView('code');
}

const isNarrow = () => window.matchMedia('(max-width: 899px)').matches;

// Rotating a tablet/phone can switch between the stacked and side-by-side layouts.
window.matchMedia('(max-width: 899px)').addEventListener?.('change', () => {
  const lessonEl = $('.lesson', main);
  if (!activeRunner || !lessonEl || $('#pauseBtn')?.classList.contains('paused')) return;
  activeRunner.setPaused(isNarrow() && lessonEl.dataset.view !== 'code');
});

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setupQuiz(lesson) {
  const p = lessonProgress(lesson.id);
  const banner = $('.complete-banner', main);
  const refresh = () => {
    const allRight = lesson.quiz.every((q, qi) => p.quiz[qi] === q.answer);
    if (banner) banner.hidden = !allRight;
    if (allRight && !p.done) {
      p.done = true;
      saveProgress();
    }
  };
  main.querySelectorAll('.q').forEach((qEl) => {
    const qi = Number(qEl.dataset.q);
    const q = lesson.quiz[qi];
    const show = (chosen) => {
      qEl.querySelectorAll('.opt').forEach((b) => {
        const oi = Number(b.dataset.o);
        b.classList.toggle('right', chosen != null && oi === q.answer && chosen === q.answer);
        b.classList.toggle('wrong', oi === chosen && chosen !== q.answer);
      });
      const ex = $('.explain', qEl);
      if (chosen == null) { ex.hidden = true; return; }
      ex.hidden = false;
      ex.className = `explain ${chosen === q.answer ? 'ok' : 'bad'}`;
      ex.innerHTML = chosen === q.answer ? `<b>Correct.</b> ${q.explain}` : '<b>Not quite.</b> Have another go.';
    };
    if (p.quiz[qi] != null) show(p.quiz[qi]);
    qEl.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      p.quiz[qi] = Number(b.dataset.o);
      show(p.quiz[qi]);
      store.set('progress', progress);
      refresh();
    }));
  });
  if (lesson.quiz.length) refresh();
}

function setupChallenges(lesson) {
  const p = lessonProgress(lesson.id);
  main.querySelectorAll('[data-ch]').forEach((cb) => cb.addEventListener('change', () => {
    p.challenges[Number(cb.dataset.ch)] = cb.checked;
    cb.closest('.challenge').classList.toggle('checked', cb.checked);
    store.set('progress', progress);
  }));
}

function setupWorkbench(lesson) {
  const codeKey = (fileKey) => `code:${lesson.id}:${fileKey}`;
  const original = Object.fromEntries(lesson.files.map((f) => [f.key, f.code]));
  const code = Object.fromEntries(lesson.files.map((f) => [f.key, store.get(codeKey(f.key), f.code)]));
  let current = lesson.files[0].key;
  let errorFor = null; // { key, line }

  const consoleEl = $('#console');
  const fpsEl = $('#fps');
  const tabs = [...main.querySelectorAll('.file-tab')];

  const markModified = () => tabs.forEach((t) => {
    $('.dot', t).hidden = code[t.dataset.file] === original[t.dataset.file];
  });

  const log = (msg, kind = 'log', jump) => {
    const row = document.createElement('div');
    row.className = `log ${kind}`;
    row.textContent = msg;
    if (jump) {
      row.classList.add('jump');
      row.title = 'Show in editor';
      row.addEventListener('click', () => { selectFile(jump.key); editor.setError(jump.line); });
    }
    consoleEl.append(row);
    while (consoleEl.childElementCount > 200) consoleEl.firstChild.remove();
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };

  const runner = new Runner($('#stage'), {
    onLog: (msg, kind) => log(msg, kind),
    onFps: (fps) => { fpsEl.textContent = `${fps} fps`; },
    onError: (err) => {
      let key = 'js';
      if (err.stage === 'vs' || err.stage === 'fs') {
        key = Object.keys(code).find((k) => k !== 'js' && code[k] === err.source)
          || (code[err.stage] != null ? err.stage : 'js');
      }
      const file = lesson.files.find((f) => f.key === key);
      const where = err.stage === 'link' ? 'Link error' : `${file?.name || key}${err.line ? `:${err.line}` : ''}`;
      errorFor = err.line ? { key, line: err.line } : null;
      log(`✖ ${where}\n${err.message}`, 'error', errorFor);
      editor.setError(errorFor && errorFor.key === current ? errorFor.line : 0);
      tabs.forEach((t) => t.classList.toggle('has-error', !!errorFor && t.dataset.file === errorFor.key));
      fpsEl.textContent = '';
    },
  });
  activeRunner = runner;

  const run = () => {
    consoleEl.innerHTML = '';
    errorFor = null;
    editor.setError(0);
    tabs.forEach((t) => t.classList.remove('has-error'));
    runner.lastGlError = null;
    const shaders = {};
    for (const f of lesson.files) if (f.key !== 'js') shaders[f.key] = code[f.key];
    runner.run({ js: code.js, shaders });
    if (!consoleEl.childElementCount) log('✔ Running', 'ok');
  };

  let runTimer = 0, saveTimer = 0;
  const editor = new Editor($('#editorHost'), {
    onRun: run,
    onChange: (value) => {
      code[current] = value;
      markModified();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (value === original[current]) store.remove(codeKey(current));
        else store.set(codeKey(current), value);
      }, 300);
      if (settings.autorun) {
        clearTimeout(runTimer);
        runTimer = setTimeout(run, 700);
      }
    },
  });

  function selectFile(key) {
    current = key;
    const f = lesson.files.find((x) => x.key === key);
    editor.setValue(code[key], f.lang);
    editor.setError(errorFor && errorFor.key === key ? errorFor.line : 0);
    tabs.forEach((t) => {
      t.classList.toggle('active', t.dataset.file === key);
      t.setAttribute('aria-selected', String(t.dataset.file === key));
    });
  }
  tabs.forEach((t) => t.addEventListener('click', () => selectFile(t.dataset.file)));
  selectFile(current);
  markModified();

  $('#runBtn').addEventListener('click', run);
  $('#autorun').addEventListener('change', (e) => {
    settings.autorun = e.target.checked;
    store.set('settings', settings);
  });
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Restore the original code for this lesson? Your edits will be lost.')) return;
    for (const f of lesson.files) {
      code[f.key] = f.code;
      store.remove(codeKey(f.key));
    }
    selectFile(current);
    markModified();
    run();
  });

  const pauseBtn = $('#pauseBtn');
  pauseBtn.addEventListener('click', () => {
    const paused = pauseBtn.classList.toggle('paused');
    pauseBtn.textContent = paused ? '▶' : '❚❚';
    runner.setPaused(paused);
  });
  $('#fullBtn').addEventListener('click', () => document.body.classList.toggle('stage-full'));

  // Symbol keys for touch keyboards. pointerdown + preventDefault keeps the
  // textarea focused so the on-screen keyboard doesn't close.
  $('#keybar').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();
    const k = b.dataset.k;
    editor.insert(k === '⇥' ? '  ' : k);
  });

  run();
  if (isNarrow() && $('.lesson', main).dataset.view !== 'code') runner.setPaused(true);
}

// ---------------------------------------------------------------- install / offline
let deferredPrompt = null;
const installBtn = $('#installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  if (inApp) return;
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; });

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !inApp) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

renderProgressPill();
route();
