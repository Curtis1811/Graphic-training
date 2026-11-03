export default {
  id: 'triangle',
  title: 'Hello Triangle',
  summary: 'Buffers, shaders, programs and the graphics pipeline: the "hello world" of OpenGL.',
  minutes: 15,
  content: `
<p>GPUs draw almost everything with <b>triangles</b>. A triangle is the simplest shape that is
always flat, and any surface can be built from enough of them. Getting one triangle on screen
involves every core idea in OpenGL, so this lesson is the most important one.</p>

<h3>The graphics pipeline</h3>
<div class="pipeline">
  <span>Vertex data<small>buffers</small></span>
  <span class="prog">Vertex shader<small>your code, per vertex</small></span>
  <span>Primitive assembly<small>vertices → triangles</small></span>
  <span>Rasterisation<small>triangles → fragments</small></span>
  <span class="prog">Fragment shader<small>your code, per pixel</small></span>
  <span>Tests &amp; blending<small>depth, alpha</small></span>
  <span>Framebuffer<small>the screen</small></span>
</div>
<p>The highlighted stages are <b>programmable</b>. You write them as <b>shaders</b> in
<b>GLSL</b> (OpenGL Shading Language), a C-like language that runs on the GPU. The other stages
are fixed, but you configure them with state calls.</p>

<h3>1. Vertex data → buffers</h3>
<p>Vertices are just numbers in a <code>Float32Array</code>. To get them to the GPU, you create a
<b>buffer object</b>, <i>bind</i> it to the <code>ARRAY_BUFFER</code> target, and upload with
<code>bufferData</code>. "Binding" is how you choose which object the following calls affect:
the state-machine idea again.</p>

<h3>2. The vertex shader</h3>
<p>Runs once per vertex. Its job is to output <code>gl_Position</code>, the vertex's position in
<b>clip space</b>. After the GPU divides by <code>w</code>, everything with x and y between
<code>-1</code> and <code>+1</code> is on screen. (0, 0) is the centre and (1, 1) is the top-right
corner.</p>

<h3>3. The fragment shader</h3>
<p>After rasterisation works out which pixels the triangle covers, the fragment shader runs once
for each of those <b>fragments</b> and outputs a colour.</p>

<h3>4. Program, VAO, draw</h3>
<p>The two shaders are compiled and <b>linked</b> into a <b>program</b>. A <b>Vertex Array Object
(VAO)</b> records how to read the buffer: "attribute <code>aPosition</code> is 2 floats per vertex,
starting at byte 0". Finally <code>gl.drawArrays(gl.TRIANGLES, 0, 3)</code> runs the whole
pipeline on 3 vertices.</p>

<div class="note"><b>Break it on purpose.</b> Delete a semicolon in <code>shader.frag</code>. The
console shows the compiler error and the editor marks the line. Reading shader errors is half
of graphics programming!</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `// ---- 1. Compile each shader stage --------------------------------
function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // (H.compileError lets the editor highlight the broken line)
    throw H.compileError(type, gl.getShaderInfoLog(shader));
  }
  return shader;
}

// ---- 2. Link them into a program ----------------------------------
const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, shaders.vs));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, shaders.fs));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program));
}

// ---- 3. Upload vertex data into a buffer on the GPU ---------------
const vertices = new Float32Array([
  //  x     y
   0.0,  0.6,   // top
  -0.6, -0.5,   // bottom left
   0.6, -0.5,   // bottom right
]);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// ---- 4. Describe the vertex layout in a Vertex Array Object -------
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const aPosition = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(aPosition);
// size 2, type FLOAT, normalise false, stride 0 (packed), offset 0
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

// ---- 5. Draw every frame ------------------------------------------
return function frame() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.08, 0.09, 0.12, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3); // mode, first vertex, count
};
`,
    },
    {
      key: 'vs',
      name: 'shader.vert',
      lang: 'glsl',
      code: `#version 300 es
// The vertex shader runs once per vertex.
// 'in' variables are attributes, read from vertex buffers.
in vec2 aPosition;

void main() {
  // gl_Position is a vec4 in clip space: x and y from -1 to 1 are visible.
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`,
    },
    {
      key: 'fs',
      name: 'shader.frag',
      lang: 'glsl',
      code: `#version 300 es
// Fragment shaders must choose a default float precision.
precision highp float;

// The colour written for every fragment (pixel) of the triangle.
out vec4 outColor;

void main() {
  outColor = vec4(1.0, 0.5, 0.2, 1.0); // orange
}
`,
    },
  ],
  challenges: [
    { task: 'Make the triangle point downwards.', hint: 'Flip the sign of every y value in <code>vertices</code>.' },
    {
      task: 'Draw a second triangle next to the first, using the same buffer.',
      hint: 'Add 3 more (x, y) pairs to <code>vertices</code> and change the count in <code>drawArrays</code> to 6.',
    },
    {
      task: 'Draw the outline only, then try points.',
      hint: 'Use <code>gl.LINE_LOOP</code> instead of <code>gl.TRIANGLES</code>. For points use <code>gl.POINTS</code> and set <code>gl_PointSize = 20.0;</code> in the vertex shader.',
    },
    {
      task: 'Colour each fragment based on its screen position.',
      hint: 'In the fragment shader, <code>gl_FragCoord.xy</code> is the pixel position. Try <code>outColor = vec4(fract(gl_FragCoord.xy / 50.0), 0.5, 1.0);</code>',
    },
  ],
  quiz: [
    {
      q: 'Which stage decides the colour of each pixel a triangle covers?',
      options: ['Vertex shader', 'Primitive assembly', 'Fragment shader', 'bufferData'],
      answer: 2,
      explain: 'The fragment shader runs once per covered fragment and outputs its colour.',
    },
    {
      q: 'What is a VAO for?',
      options: ['Storing the pixels of the final image', 'Remembering how vertex attributes are read from buffers', 'Compiling shaders', 'Choosing the clear colour'],
      answer: 1,
      explain: 'A Vertex Array Object stores the attribute layout (which buffer, size, type, stride, offset) so you can rebind it with one call.',
    },
    {
      q: 'In clip space (after the divide by w), which point is the top-right corner of the viewport?',
      options: ['(0, 0)', '(1, 1)', '(width, height)', '(-1, 1)'],
      answer: 1,
      explain: 'Normalised device coordinates go from -1 to +1 on each axis, with (1, 1) at the top-right.',
    },
  ],
  cpp: `// Same steps in C++ (OpenGL 3.3 core). Shader sources are C strings.
const char* vsSrc = R"(#version 330 core
layout(location = 0) in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); })";

const char* fsSrc = R"(#version 330 core
out vec4 outColor;
void main() { outColor = vec4(1.0, 0.5, 0.2, 1.0); })";

GLuint compile(GLenum type, const char* src) {
  GLuint s = glCreateShader(type);
  glShaderSource(s, 1, &src, nullptr);
  glCompileShader(s);
  GLint ok; glGetShaderiv(s, GL_COMPILE_STATUS, &ok);
  if (!ok) { char log[1024]; glGetShaderInfoLog(s, 1024, nullptr, log); puts(log); }
  return s;
}

// ... after creating the window and loading glad:
GLuint program = glCreateProgram();
glAttachShader(program, compile(GL_VERTEX_SHADER, vsSrc));
glAttachShader(program, compile(GL_FRAGMENT_SHADER, fsSrc));
glLinkProgram(program);

float vertices[] = { 0.0f, 0.6f,  -0.6f, -0.5f,  0.6f, -0.5f };
GLuint vao, vbo;
glGenVertexArrays(1, &vao);
glBindVertexArray(vao);
glGenBuffers(1, &vbo);
glBindBuffer(GL_ARRAY_BUFFER, vbo);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
glEnableVertexAttribArray(0);
glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 0, (void*)0);

// in the render loop:
glUseProgram(program);
glBindVertexArray(vao);
glDrawArrays(GL_TRIANGLES, 0, 3);`,
};
