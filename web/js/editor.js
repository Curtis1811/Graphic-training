// A lightweight code editor: a transparent <textarea> over a syntax-highlighted
// <pre>. No dependencies, works with touch keyboards, keeps native undo.

const GLSL_KEYWORDS = new Set(
  ('attribute const uniform varying layout centroid flat smooth break continue do for while ' +
    'if else in out inout true false invariant discard return struct precision highp mediump lowp switch case default').split(' '),
);
const GLSL_TYPES = new Set(
  ('float int uint bool void vec2 vec3 vec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 bvec2 bvec3 bvec4 ' +
    'mat2 mat3 mat4 mat2x2 mat3x3 mat4x4 sampler2D sampler3D samplerCube sampler2DArray').split(' '),
);
const GLSL_BUILTINS = new Set(
  ('gl_Position gl_PointSize gl_FragCoord gl_FrontFacing gl_PointCoord gl_VertexID gl_InstanceID ' +
    'radians degrees sin cos tan asin acos atan pow exp log exp2 log2 sqrt inversesqrt abs sign floor ceil ' +
    'fract mod min max clamp mix step smoothstep length distance dot cross normalize reflect refract ' +
    'transpose inverse texture textureLod texelFetch textureSize dFdx dFdy fwidth round trunc').split(' '),
);
const JS_KEYWORDS = new Set(
  ('const let var function return if else for while do new class this true false null undefined ' +
    'of in typeof instanceof break continue switch case default try catch throw async await').split(' '),
);
const CPP_KEYWORDS = new Set(
  ('auto const constexpr return if else for while do new delete class struct this true false nullptr ' +
    'int float double char bool void unsigned sizeof static include using namespace std break continue').split(' '),
);
const JS_BUILTINS = new Set('gl canvas shaders H Math Float32Array Uint16Array Uint8Array Int32Array Array'.split(' '));

const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(^[ \t]*#[^\n]*)|(\b\d+\.?\d*(?:e[+-]?\d+)?[uf]?\b|\.\d+\b|\b0x[\da-f]+\b)|([A-Za-z_$][\w$]*)/gim;

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlight(code, lang) {
  const kw = lang === 'glsl' ? GLSL_KEYWORDS : lang === 'cpp' ? CPP_KEYWORDS : JS_KEYWORDS;
  const builtins = lang === 'glsl' ? GLSL_BUILTINS : JS_BUILTINS;
  let out = '', last = 0;
  TOKEN_RE.lastIndex = 0;
  for (let m; (m = TOKEN_RE.exec(code)); ) {
    out += escapeHtml(code.slice(last, m.index));
    last = TOKEN_RE.lastIndex;
    const [tok, comment, str, pre, num, ident] = m;
    let cls = '';
    if (comment) cls = 'tk-com';
    else if (str) cls = lang === 'glsl' ? '' : 'tk-str';
    else if (pre) cls = lang === 'js' ? '' : 'tk-pre';
    else if (num) cls = 'tk-num';
    else if (ident) {
      if (kw.has(ident)) cls = 'tk-kw';
      else if (lang === 'glsl' && GLSL_TYPES.has(ident)) cls = 'tk-type';
      else if (builtins.has(ident)) cls = 'tk-fn';
      else if (lang === 'cpp' && /^(gl[A-Z]|glfw|GL_|GLFW_)/.test(ident)) cls = 'tk-fn';
      else if (lang === 'js' && /^[A-Z][A-Z0-9_]+$/.test(ident)) cls = 'tk-const';
      else if (/^[ua][A-Z]/.test(ident) || /^v[A-Z]/.test(ident)) cls = 'tk-var';
    }
    out += cls ? `<span class="${cls}">${escapeHtml(tok)}</span>` : escapeHtml(tok);
    if (tok.length === 0) TOKEN_RE.lastIndex++;
  }
  return out + escapeHtml(code.slice(last));
}

export class Editor {
  constructor(root, { onChange, onRun } = {}) {
    this.onChange = onChange;
    this.onRun = onRun;
    this.lang = 'js';
    root.classList.add('editor');
    root.innerHTML = `
      <div class="ed-gutter" aria-hidden="true"></div>
      <div class="ed-code">
        <div class="ed-err" hidden></div>
        <pre class="ed-hl" aria-hidden="true"></pre>
        <textarea class="ed-input" spellcheck="false" autocapitalize="off" autocomplete="off"
          autocorrect="off" wrap="off" aria-label="Code editor"></textarea>
      </div>`;
    this.root = root;
    this.gutter = root.querySelector('.ed-gutter');
    this.hl = root.querySelector('.ed-hl');
    this.err = root.querySelector('.ed-err');
    this.ta = root.querySelector('.ed-input');
    this.errorLine = 0;

    this.ta.addEventListener('input', () => {
      this.render();
      this.onChange?.(this.ta.value);
    });
    this.ta.addEventListener('keydown', (e) => this.onKey(e));
  }

  setValue(code, lang) {
    this.lang = lang;
    this.ta.value = code;
    this.errorLine = 0;
    this.render();
  }

  getValue() {
    return this.ta.value;
  }

  setError(line) {
    this.errorLine = line || 0;
    this.render();
  }

  render() {
    const code = this.ta.value;
    // A trailing space makes sure a final empty line still has height.
    this.hl.innerHTML = highlight(code, this.lang) + ' ';
    const lines = code.split('\n').length;
    let g = '';
    for (let i = 1; i <= lines; i++) g += i === this.errorLine ? `<b>${i}</b>\n` : `${i}\n`;
    this.gutter.innerHTML = g;
    if (this.errorLine > 0 && this.errorLine <= lines) {
      this.err.hidden = false;
      this.err.style.top = `calc(var(--ed-pad) + ${(this.errorLine - 1)} * var(--ed-lh))`;
    } else {
      this.err.hidden = true;
    }
  }

  // Insert text at the caret, keeping the browser's undo history when possible.
  insert(text, { select = 0 } = {}) {
    this.ta.focus();
    const ok = document.execCommand?.('insertText', false, text);
    if (!ok) {
      this.ta.setRangeText(text, this.ta.selectionStart, this.ta.selectionEnd, 'end');
      this.ta.dispatchEvent(new Event('input'));
    }
    if (select) {
      const p = this.ta.selectionStart - select;
      this.ta.setSelectionRange(p, p);
    }
  }

  onKey(e) {
    const ta = this.ta;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) {
      e.preventDefault();
      this.onRun?.();
      return;
    }
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (e.shiftKey) this.dedent();
      else this.insert('  ');
      return;
    }
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      const before = ta.value.slice(0, ta.selectionStart);
      const lineStart = before.lastIndexOf('\n') + 1;
      const indent = /^[ \t]*/.exec(before.slice(lineStart))[0];
      const opens = /[{([]\s*$/.test(before);
      const after = ta.value.slice(ta.selectionEnd);
      if (opens && /^\s*[})\]]/.test(after)) {
        this.insert(`\n${indent}  \n${indent}`, { select: indent.length + 1 });
      } else {
        this.insert(`\n${indent}${opens ? '  ' : ''}`);
      }
    }
  }

  dedent() {
    const ta = this.ta;
    const v = ta.value;
    const lineStart = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    const spaces = /^ {1,2}/.exec(v.slice(lineStart))?.[0].length || 0;
    if (!spaces) return;
    const caret = ta.selectionStart;
    ta.setSelectionRange(lineStart, lineStart + spaces);
    this.insert('');
    const p = Math.max(lineStart, caret - spaces);
    ta.setSelectionRange(p, p);
  }
}
