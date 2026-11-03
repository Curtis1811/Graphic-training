export default {
  id: 'going-3d',
  title: 'Going 3D: Cameras, Perspective & Depth',
  summary: 'The Model-View-Projection pipeline, the depth buffer and back-face culling.',
  minutes: 20,
  content: `
<p>3D is the same as 2D with one more axis and a <b>camera</b>. Every vertex goes through a chain
of coordinate spaces, and each step is a matrix:</p>
<div class="pipeline">
  <span>Object space<small>the model's own coordinates</small></span>
  <span class="prog">× Model<small>place it in the world</small></span>
  <span>World space</span>
  <span class="prog">× View<small>move the world in front of the camera</small></span>
  <span>View space</span>
  <span class="prog">× Projection<small>perspective</small></span>
  <span>Clip space</span>
</div>
<pre class="snippet" data-lang="glsl">gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);</pre>

<h3>The view matrix</h3>
<p>OpenGL has no camera object. Instead, you move the <i>whole world</i> the opposite way.
<code>lookAt(eye, target, up)</code> builds that matrix. By convention the camera sits at the
origin looking down <b>−Z</b>.</p>

<h3>Perspective projection</h3>
<p><code>perspective(fov, aspect, near, far)</code> makes distant things smaller. It works by
putting depth into <code>w</code>. The GPU then divides <code>x, y, z</code> by <code>w</code>
(the <i>perspective divide</i>), so far-away points move towards the centre. Only geometry
between the <b>near</b> and <b>far</b> planes is drawn.</p>

<h3>The depth buffer</h3>
<p>Without help, triangles are drawn in submission order, so a far face drawn last would appear
on top of a near one. The <b>depth buffer</b> stores the depth of the nearest surface for each
pixel. With <code>gl.enable(gl.DEPTH_TEST)</code>, a fragment is only drawn if it is nearer than
what's already there. Remember to clear it every frame with <code>gl.DEPTH_BUFFER_BIT</code>.</p>

<h3>Back-face culling</h3>
<p>Triangles have a <b>winding order</b>: the order of their vertices as seen on screen.
Counter-clockwise triangles count as <i>front-facing</i>. For a closed object you never see the
inside, so <code>gl.enable(gl.CULL_FACE)</code> skips back faces. That's about half the work for
free.</p>

<div class="note">Set <code>USE_DEPTH_TEST</code> to <code>false</code> at the top of
<code>main.js</code> and watch the cubes turn inside out.</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `const USE_DEPTH_TEST = true;   // try false!
const USE_CULLING = true;

const program = H.createProgram(gl, shaders.vs, shaders.fs);
const { mat4, radians } = H;

// H.cube() returns positions, normals, uvs, colors and indices.
const cube = H.cube();
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
H.attribute(gl, gl.getAttribLocation(program, 'aPosition'), cube.positions, 3);
H.attribute(gl, gl.getAttribLocation(program, 'aColor'), cube.colors, 3);
H.indexBuffer(gl, cube.indices);

const uModel = gl.getUniformLocation(program, 'uModel');
const uView = gl.getUniformLocation(program, 'uView');
const uProjection = gl.getUniformLocation(program, 'uProjection');

if (USE_DEPTH_TEST) gl.enable(gl.DEPTH_TEST);
if (USE_CULLING) gl.enable(gl.CULL_FACE);

return function frame(t) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.05, 0.06, 0.1, 1);
  // Clear colour AND depth every frame.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  const aspect = canvas.width / canvas.height;
  const projection = mat4.perspective(radians(50), aspect, 0.1, 100);
  // Camera slowly circles the scene.
  const eye = [Math.sin(t * 0.3) * 5, 2.5, Math.cos(t * 0.3) * 5];
  const view = mat4.lookAt(eye, [0, 0, 0], [0, 1, 0]);
  gl.uniformMatrix4fv(uProjection, false, projection);
  gl.uniformMatrix4fv(uView, false, view);

  // Three cubes at different positions.
  const positions = [[0, 0, 0], [-1.8, 0, -1.2], [1.6, 0.3, 1.0]];
  positions.forEach(([x, y, z], i) => {
    const model = mat4.mul(
      mat4.translation(x, y, z),
      mat4.rotationY(t * (0.6 + i * 0.3)),
      mat4.rotationX(t * 0.4 + i),
    );
    gl.uniformMatrix4fv(uModel, false, model);
    gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);
  });
};
`,
    },
    {
      key: 'vs',
      name: 'shader.vert',
      lang: 'glsl',
      code: `#version 300 es
in vec3 aPosition;
in vec3 aColor;

uniform mat4 uModel;       // object -> world
uniform mat4 uView;        // world  -> camera
uniform mat4 uProjection;  // camera -> clip

out vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
`,
    },
    {
      key: 'fs',
      name: 'shader.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

in vec3 vColor;
out vec4 outColor;

void main() {
  // gl_FragCoord.z is the depth (0 = near, 1 = far). Try outputting it!
  outColor = vec4(vColor, 1.0);
}
`,
    },
  ],
  challenges: [
    { task: 'Turn off the depth test. Then turn it back on but forget to clear <code>DEPTH_BUFFER_BIT</code>.', hint: 'Without clearing, last frame\'s depths block the new frame.' },
    {
      task: 'Change the field of view to 20° and then 100°. What changes?',
      hint: 'A small fov acts like a zoom (telephoto) lens; a large one is a fish-eye wide angle.',
    },
    {
      task: 'Swap the perspective matrix for an orthographic one.',
      hint: '<code>mat4.orthographic(-3 * aspect, 3 * aspect, -3, 3, 0.1, 100)</code>. Distant cubes no longer shrink.',
    },
    {
      task: 'Visualise depth: make the fragment shader output gl_FragCoord.z as grey.',
      hint: 'Depth is non-linear, so most values are near 1. Try <code>pow(gl_FragCoord.z, 30.0)</code>.',
    },
    { task: 'Build a 5×5 grid of cubes on the floor.', hint: 'Two nested loops calling <code>mat4.translation(x * 1.5, -1, z * 1.5)</code>.' },
  ],
  quiz: [
    {
      q: 'What is the correct order to transform a vertex into clip space?',
      options: ['Model × View × Projection × v', 'Projection × View × Model × v', 'View × Projection × Model × v', 'Projection × Model × View × v'],
      answer: 1,
      explain: 'Read right to left: model (object→world), then view (world→camera), then projection (camera→clip).',
    },
    {
      q: 'What does the depth test do?',
      options: ['Blurs distant objects', 'Discards fragments farther away than what is already drawn at that pixel', 'Sorts triangles on the CPU', 'Clips triangles outside the screen'],
      answer: 1,
      explain: 'Each fragment is compared against the stored depth, and only nearer fragments pass.',
    },
    {
      q: 'Where does the perspective "shrinking" actually happen?',
      options: ['In the fragment shader', 'In the divide by w after the vertex shader', 'In gl.clear', 'In the model matrix'],
      answer: 1,
      explain: 'The projection matrix puts depth into w, and the GPU divides x, y, z by w.',
    },
  ],
  cpp: `glEnable(GL_DEPTH_TEST);
glEnable(GL_CULL_FACE);

glm::mat4 projection = glm::perspective(glm::radians(50.0f), aspect, 0.1f, 100.0f);
glm::mat4 view = glm::lookAt(glm::vec3(0, 2.5f, 5), glm::vec3(0), glm::vec3(0, 1, 0));

// render loop
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
glUniformMatrix4fv(uProjection, 1, GL_FALSE, glm::value_ptr(projection));
glUniformMatrix4fv(uView, 1, GL_FALSE, glm::value_ptr(view));
glDrawElements(GL_TRIANGLES, 36, GL_UNSIGNED_SHORT, 0);

// With GLFW, request a depth buffer before creating the window:
// glfwWindowHint(GLFW_DEPTH_BITS, 24);   (24 is the default)`,
};
