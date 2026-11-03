export default {
  id: 'varyings',
  title: 'Attributes, Varyings & Interpolation',
  summary: 'Feed several values per vertex and let the GPU blend them across the triangle.',
  minutes: 12,
  content: `
<p>A vertex can carry more than a position. Colours, texture coordinates and normals are all
<b>vertex attributes</b>. This lesson gives every corner of the triangle its own colour.</p>

<h3>Interleaved buffers, stride and offset</h3>
<p>You could use one buffer per attribute, but it's common to <b>interleave</b> them, so that each
vertex's data sits together in memory:</p>
<pre class="snippet" data-lang="js">//  x     y      r    g    b
   0.0,  0.6,   1.0, 0.2, 0.3,   // vertex 0
  -0.6, -0.5,   0.2, 1.0, 0.3,   // vertex 1
   0.6, -0.5,   0.2, 0.4, 1.0,   // vertex 2</pre>
<p>Now each <code>vertexAttribPointer</code> call needs two more numbers:</p>
<ul>
  <li><b>stride</b>: bytes from one vertex to the next. Here that's 5 floats × 4 bytes = <code>20</code>.</li>
  <li><b>offset</b>: where this attribute starts inside a vertex. Position is at <code>0</code>; colour comes after 2 floats, so <code>8</code>.</li>
</ul>

<h3>Passing data between shaders</h3>
<p>A vertex shader can declare <code>out</code> variables. The fragment shader declares matching
<code>in</code> variables with the same name and type. (Older GLSL called these
<code>varying</code>.)</p>

<h3>Interpolation</h3>
<p>The triangle has 3 vertices but covers thousands of pixels. So what colour does a pixel in the
middle get? The rasteriser <b>interpolates</b> every <code>out</code> value using the pixel's
<i>barycentric coordinates</i>: how close it is to each corner. A pixel near the red corner gets
mostly red. That's why you see a smooth gradient, and it's the same mechanism that later
interpolates texture coordinates and normals.</p>

<div class="note">Put <code>flat</code> in front of <code>out vec3 vColor</code> <i>and</i>
<code>in vec3 vColor</code> to turn interpolation off. Every pixel then takes the colour of the
triangle's "provoking" (last) vertex.</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `// From now on we use H.createProgram: it does the compile/link steps from lesson 2.
const program = H.createProgram(gl, shaders.vs, shaders.fs);

// Interleaved data: position (2 floats) followed by colour (3 floats).
const data = new Float32Array([
  //  x     y      r    g    b
   0.0,  0.7,   1.0, 0.2, 0.3,
  -0.7, -0.6,   0.2, 1.0, 0.3,
   0.7, -0.6,   0.2, 0.4, 1.0,
]);
const FLOAT = 4;                 // bytes per float
const STRIDE = 5 * FLOAT;        // bytes per vertex

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

const aPosition = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, STRIDE, 0);

const aColor = gl.getAttribLocation(program, 'aColor');
gl.enableVertexAttribArray(aColor);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, STRIDE, 2 * FLOAT);

return function frame() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.08, 0.09, 0.12, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};
`,
    },
    {
      key: 'vs',
      name: 'shader.vert',
      lang: 'glsl',
      code: `#version 300 es
in vec2 aPosition;
in vec3 aColor;

// 'out' values are passed (interpolated) to the fragment shader.
out vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`,
    },
    {
      key: 'fs',
      name: 'shader.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

// Must match the vertex shader's 'out' by name and type.
in vec3 vColor;

out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
`,
    },
  ],
  challenges: [
    {
      task: 'Make a rectangle out of two triangles, with a different colour at each of its 4 corners.',
      hint: 'You need 6 vertices (two corners are repeated). Change the draw count to 6. Lesson 6 shows how index buffers avoid the repetition.',
    },
    { task: 'Turn off interpolation with <code>flat</code> and see what changes.', hint: 'Add <code>flat</code> before <code>out vec3 vColor</code> and <code>in vec3 vColor</code>.' },
    {
      task: 'Visualise the barycentric weights: make the fragment shader output only the largest colour channel.',
      hint: 'Use <code>step</code>: <code>vec3 c = step(max(max(vColor.r, vColor.g), vColor.b), vColor);</code>. The pure colours work best for this.',
    },
  ],
  quiz: [
    {
      q: 'Each vertex has 2 position floats and 3 colour floats, interleaved. What is the stride in bytes?',
      options: ['5', '12', '20', '8'],
      answer: 2,
      explain: '5 floats × 4 bytes each = 20 bytes from the start of one vertex to the next.',
    },
    {
      q: 'Why does a pixel in the middle of the triangle get a blended colour?',
      options: ['The fragment shader averages all vertices manually', 'The rasteriser interpolates vertex shader outputs across the triangle', 'Anti-aliasing blurs the colours', 'The GPU picks a random vertex'],
      answer: 1,
      explain: 'Values written to "out" variables are interpolated (using barycentric weights) for each fragment.',
    },
  ],
  cpp: `// Desktop GLSL 330 lets you fix attribute locations in the shader:
//   layout(location = 0) in vec2 aPosition;
//   layout(location = 1) in vec3 aColor;
// (WebGL2 supports this too!)

glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 5 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);
glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 5 * sizeof(float), (void*)(2 * sizeof(float)));
glEnableVertexAttribArray(1);`,
};
