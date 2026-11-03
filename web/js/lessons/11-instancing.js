export default {
  id: 'instancing',
  title: 'Instancing: Thousands of Objects',
  summary: 'Draw thousands of objects in a single draw call with per-instance attributes.',
  minutes: 15,
  content: `
<p>Every <code>draw*</code> call has a CPU cost: the driver validates state and sends commands to
the GPU. Drawing 10,000 cubes with 10,000 draw calls is slow. <b>Instancing</b> draws the same
mesh many times in <i>one</i> call:</p>
<pre class="snippet" data-lang="js">gl.drawElementsInstanced(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0, instanceCount);</pre>

<h3>Per-instance data</h3>
<p>Each copy needs to differ somehow, for example in position or colour. You put that data in a
buffer like any attribute and then tell OpenGL to advance it <b>once per instance</b> instead of
once per vertex:</p>
<pre class="snippet" data-lang="js">gl.vertexAttribDivisor(aOffset, 1); // 0 = per vertex (default), 1 = per instance</pre>
<p>Inside the vertex shader, <code>gl_InstanceID</code> tells you which copy you're working on.
You can use it to make procedural variation without any buffer at all.</p>

<h3>The demo</h3>
<p>A 40×40 grid of cubes is <b>1,600 instances</b>, drawn with <b>one draw call</b>. Each instance
has an offset and a colour in buffers. The wave animation happens entirely in the vertex shader
using <code>uTime</code>, so the CPU does almost nothing per frame.</p>

<div class="note">Raise <code>GRID</code> to 150 (22,500 cubes, 810,000 triangles) and check the
FPS counter. This is how games draw grass, crowds, particles and asteroid fields.</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `const GRID = 40;                     // GRID x GRID instances
const COUNT = GRID * GRID;
const program = H.createProgram(gl, shaders.vs, shaders.fs);
const { mat4, radians } = H;

const cube = H.cube();
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
H.attribute(gl, gl.getAttribLocation(program, 'aPosition'), cube.positions, 3);
H.attribute(gl, gl.getAttribLocation(program, 'aNormal'), cube.normals, 3);
H.indexBuffer(gl, cube.indices);

// ---- Per-instance data: an (x, z) offset and a colour for each cube ----
const offsets = new Float32Array(COUNT * 2);
const colors = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  const x = (i % GRID) - GRID / 2, z = Math.floor(i / GRID) - GRID / 2;
  offsets.set([x, z], i * 2);
  const h = Math.hypot(x, z) / GRID;
  colors.set([0.3 + 0.7 * h, 0.4 + 0.3 * Math.sin(x * 0.3), 1.0 - 0.6 * h], i * 3);
}
const aOffset = gl.getAttribLocation(program, 'aOffset');
H.attribute(gl, aOffset, offsets, 2);
gl.vertexAttribDivisor(aOffset, 1);     // advance once per INSTANCE
const aColor = gl.getAttribLocation(program, 'aColor');
H.attribute(gl, aColor, colors, 3);
gl.vertexAttribDivisor(aColor, 1);

const uViewProj = gl.getUniformLocation(program, 'uViewProj');
const uTime = gl.getUniformLocation(program, 'uTime');
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
H.log('Drawing', COUNT, 'cubes in 1 draw call');

return function frame(t) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.03, 0.03, 0.06, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);

  const d = GRID * 0.75;
  const eye = [Math.sin(t * 0.15) * d, GRID * 0.45, Math.cos(t * 0.15) * d];
  const vp = mat4.mul(
    mat4.perspective(radians(50), canvas.width / canvas.height, 0.1, GRID * 4),
    mat4.lookAt(eye, [0, 0, 0]),
  );
  gl.uniformMatrix4fv(uViewProj, false, vp);
  gl.uniform1f(uTime, t);

  gl.bindVertexArray(vao);
  gl.drawElementsInstanced(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0, COUNT);
};
`,
    },
    {
      key: 'vs',
      name: 'instanced.vert',
      lang: 'glsl',
      code: `#version 300 es
in vec3 aPosition;   // per vertex
in vec3 aNormal;     // per vertex
in vec2 aOffset;     // per INSTANCE (divisor 1)
in vec3 aColor;      // per INSTANCE

uniform mat4 uViewProj;
uniform float uTime;

out vec3 vColor;
out vec3 vNormal;

void main() {
  // A ripple travelling outwards from the centre.
  float dist = length(aOffset);
  float height = sin(dist * 0.5 - uTime * 2.5) * 1.5;

  vec3 scale = vec3(0.85, 1.0 + height * 0.5 + 1.0, 0.85);
  vec3 world = aPosition * scale + vec3(aOffset.x, height, aOffset.y);

  vColor = aColor;
  vNormal = aNormal;
  gl_Position = uViewProj * vec4(world, 1.0);
}
`,
    },
    {
      key: 'fs',
      name: 'instanced.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;
out vec4 outColor;

void main() {
  vec3 L = normalize(vec3(0.4, 1.0, 0.3));
  float diffuse = max(dot(normalize(vNormal), L), 0.0);
  outColor = vec4(vColor * (0.2 + 0.8 * diffuse), 1.0);
}
`,
    },
  ],
  challenges: [
    { task: 'Set <code>GRID</code> to 100, then 150. Watch the FPS counter.', hint: 'The CPU work stays the same. Only the GPU load grows.' },
    {
      task: 'Change the wave into a pattern based on x only, then on both x and z.',
      hint: '<code>sin(aOffset.x * 0.4 - uTime * 2.0) + sin(aOffset.y * 0.3 + uTime)</code>',
    },
    {
      task: 'Use <code>gl_InstanceID</code> to colour every 10th cube white.',
      hint: '<code>vColor = (gl_InstanceID % 10 == 0) ? vec3(1.0) : aColor;</code>',
    },
  ],
  quiz: [
    {
      q: 'What does gl.vertexAttribDivisor(loc, 1) do?',
      options: ['Halves the attribute value', 'Makes the attribute advance once per instance instead of per vertex', 'Disables the attribute', 'Divides the vertex count by 1'],
      answer: 1,
      explain: 'A divisor of N means the attribute advances once every N instances. 0 (the default) means per vertex.',
    },
    {
      q: 'Why is instancing faster than many separate draw calls?',
      options: ['The GPU skips lighting', 'It removes per-draw CPU and driver overhead', 'Instanced triangles are smaller', 'It uses lower precision'],
      answer: 1,
      explain: 'The GPU still processes every triangle, but the CPU issues one call instead of thousands.',
    },
  ],
  cpp: `glBindBuffer(GL_ARRAY_BUFFER, offsetVbo);
glEnableVertexAttribArray(2);
glVertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, 0, (void*)0);
glVertexAttribDivisor(2, 1);

glDrawElementsInstanced(GL_TRIANGLES, 36, GL_UNSIGNED_SHORT, 0, count);`,
};
