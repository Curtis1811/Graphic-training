export default {
  id: 'transforms',
  title: 'Transformations, Matrices & Index Buffers',
  summary: 'Translate, rotate and scale with 4×4 matrices, and build a tiny solar system.',
  minutes: 18,
  content: `
<p>Writing rotation code into every shader doesn't scale. Graphics code describes <b>all</b>
transformations (move, rotate, scale, project) as <b>4×4 matrices</b>. You multiply them
together on the CPU and upload the result as one uniform.</p>

<h3>Why 4×4 for 3D points?</h3>
<p>A 3×3 matrix can rotate and scale, but it can't <i>translate</i> (move). The trick is to write
points as <code>vec4(x, y, z, 1.0)</code>. The fourth component <code>w = 1</code> picks up the
translation in the matrix's last column. This is called <b>homogeneous coordinates</b>.</p>
<pre class="snippet" data-lang="glsl">| 1 0 0 tx |   | x |   | x + tx |
| 0 1 0 ty | × | y | = | y + ty |
| 0 0 1 tz |   | z |   | z + tz |
| 0 0 0 1  |   | 1 |   |   1    |</pre>

<h3>Order matters</h3>
<p>Matrix multiplication is <b>not commutative</b>. <code>M = T × R × S</code> is applied
<i>right to left</i>: first scale, then rotate, then translate. That's what you normally want for
an object. Swap them to <code>R × T</code> and the object is moved out first and then rotated
<i>around the origin</i>, so it orbits!</p>

<h3>Hierarchies</h3>
<p>The demo uses this for a solar system. The planet's matrix starts with the orbit
(<code>R(t) × T(1, 0)</code>). The moon's matrix starts with the <i>planet's</i> matrix and adds
its own orbit on the end. Every game engine's "scene graph" works the same way: child transform
= parent transform × local transform.</p>

<h3>Index buffers</h3>
<p>A square is 2 triangles = 6 vertices, but only 4 are unique. An <b>element (index) buffer</b>
lists which vertices make each triangle: <code>[0,1,2, 0,2,3]</code>. You draw with
<code>gl.drawElements</code>. On real models this saves a lot of memory and lets the GPU reuse
vertices it has already processed.</p>

<div class="note"><code>H.mat4</code> is a tiny matrix library included with the app. In C++ you'd
use <b>GLM</b>; in JavaScript, <b>gl-matrix</b>. They all use the same column-major layout as
OpenGL.</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `const program = H.createProgram(gl, shaders.vs, shaders.fs);
const { mat4 } = H;

// 4 unique corners of a square...
const corners = new Float32Array([
  -0.5, -0.5,   // 0 bottom-left
   0.5, -0.5,   // 1 bottom-right
   0.5,  0.5,   // 2 top-right
  -0.5,  0.5,   // 3 top-left
]);
// ...and which corners form each of the 2 triangles.
const indices = new Uint16Array([0, 1, 2,   0, 2, 3]);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'aPosition');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
// The VAO also remembers the bound ELEMENT_ARRAY_BUFFER.
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

const uProjection = gl.getUniformLocation(program, 'uProjection');
const uModel = gl.getUniformLocation(program, 'uModel');
const uColor = gl.getUniformLocation(program, 'uColor');

function drawSquare(model, r, g, b) {
  gl.uniformMatrix4fv(uModel, false, model);
  gl.uniform3f(uColor, r, g, b);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

return function frame(t) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.05, 0.06, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  // Orthographic projection that keeps a 3x3 area visible on any screen.
  const aspect = canvas.width / canvas.height;
  const s = 1.5;
  const proj = aspect >= 1
    ? mat4.orthographic(-s * aspect, s * aspect, -s, s, -1, 1)
    : mat4.orthographic(-s, s, -s / aspect, s / aspect, -1, 1);
  gl.uniformMatrix4fv(uProjection, false, proj);

  // Sun: spin in place (rotate, then scale up).
  const sun = mat4.mul(mat4.rotationZ(t * 0.5), mat4.scaling(0.5));
  drawSquare(sun, 1.0, 0.8, 0.2);

  // Planet: orbit = rotate(t) * translate(1, 0); then spin and shrink.
  const orbit = mat4.mul(mat4.rotationZ(t * 0.8), mat4.translation(1.0, 0, 0));
  const planet = mat4.mul(orbit, mat4.rotationZ(t * 3), mat4.scaling(0.25));
  drawSquare(planet, 0.3, 0.6, 1.0);

  // Moon: starts from the planet's orbit (the parent), adds its own.
  const moon = mat4.mul(orbit, mat4.rotationZ(t * 4), mat4.translation(0.3, 0, 0), mat4.scaling(0.08));
  drawSquare(moon, 0.8, 0.8, 0.85);
};
`,
    },
    {
      key: 'vs',
      name: 'shader.vert',
      lang: 'glsl',
      code: `#version 300 es
in vec2 aPosition;

uniform mat4 uProjection; // world -> clip space
uniform mat4 uModel;      // object -> world space

void main() {
  // Read right-to-left: model first, then projection.
  gl_Position = uProjection * uModel * vec4(aPosition, 0.0, 1.0);
}
`,
    },
    {
      key: 'fs',
      name: 'shader.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

uniform vec3 uColor;
out vec4 outColor;

void main() {
  outColor = vec4(uColor, 1.0);
}
`,
    },
  ],
  challenges: [
    {
      task: 'Swap the order in the sun\'s matrix to <code>mat4.mul(mat4.scaling(0.5), mat4.rotationZ(t))</code>. Does anything change? Why?',
      hint: 'Uniform scaling (the same in x and y) commutes with rotation. Try <code>mat4.scaling(0.8, 0.3, 1)</code> in both orders.',
    },
    {
      task: 'Make the planet spin in place instead of orbiting.',
      hint: 'Use <code>mat4.translation(1, 0, 0)</code> first and the rotation after it: <code>T × R</code> instead of <code>R × T</code>.',
    },
    { task: 'Add a second planet with a different speed, colour and orbit radius.', hint: 'Copy the planet lines and change the numbers.' },
    {
      task: 'Make the squares pulse in size.',
      hint: '<code>mat4.scaling(0.25 * (1 + 0.2 * Math.sin(t * 5)))</code>',
    },
  ],
  quiz: [
    {
      q: 'With M = T × R × S applied to a vertex, which transformation happens first?',
      options: ['Translate', 'Rotate', 'Scale', 'All at once'],
      answer: 2,
      explain: 'The matrix closest to the vertex (rightmost) is applied first: scale, then rotate, then translate.',
    },
    {
      q: 'Why do 3D graphics use 4×4 matrices and vec4(x, y, z, 1)?',
      options: ['GPUs only support 4-wide vectors', 'So translation can be expressed as a matrix multiply', 'For extra precision', 'For the alpha channel'],
      answer: 1,
      explain: 'Homogeneous coordinates make translation (and perspective) linear, so everything combines into one matrix.',
    },
    {
      q: 'How many indices do you need to draw a square as two triangles?',
      options: ['4', '6', '8', '3'],
      answer: 1,
      explain: '2 triangles × 3 indices = 6, though only 4 unique vertices are stored.',
    },
  ],
  cpp: `#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

glm::mat4 orbit = glm::rotate(glm::mat4(1.0f), t * 0.8f, glm::vec3(0, 0, 1));
orbit = glm::translate(orbit, glm::vec3(1.0f, 0.0f, 0.0f));
glm::mat4 planet = glm::scale(glm::rotate(orbit, t * 3.0f, glm::vec3(0, 0, 1)), glm::vec3(0.25f));
glUniformMatrix4fv(uModel, 1, GL_FALSE, glm::value_ptr(planet));

unsigned short indices[] = { 0, 1, 2, 0, 2, 3 };
GLuint ebo; glGenBuffers(1, &ebo);
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ebo);
glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);
glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_SHORT, 0);`,
};
