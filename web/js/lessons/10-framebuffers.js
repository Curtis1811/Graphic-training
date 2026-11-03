export default {
  id: 'framebuffers',
  title: 'Framebuffers & Post-Processing',
  summary: 'Render a scene into a texture, then run a full-screen effect over it.',
  minutes: 20,
  content: `
<p>So far everything has been drawn straight to the screen. A <b>framebuffer object (FBO)</b> lets
you draw into a <i>texture</i> instead. That texture can then be used like any other. This one
idea is behind post-processing, shadow maps, reflections, deferred shading and more.</p>

<h3>Building an FBO</h3>
<pre class="snippet" data-lang="js">const fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
// colour goes into a texture we can sample later
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);
// depth goes into a renderbuffer (we never need to sample it)
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
gl.checkFramebufferStatus(gl.FRAMEBUFFER); // should be FRAMEBUFFER_COMPLETE</pre>
<p>Binding <code>null</code> switches back to the default framebuffer, the canvas.</p>

<h3>Two passes per frame</h3>
<ol>
  <li><b>Scene pass</b>: bind the FBO, clear it, and draw the 3D scene as usual.</li>
  <li><b>Post pass</b>: bind the screen, then draw a full-screen triangle (from lesson 5) whose
  fragment shader samples the scene texture and changes it.</li>
</ol>
<p>Because the post shader sees the whole image, it can read <i>neighbouring</i> pixels. That
makes blur, edge detection, bloom and chromatic aberration possible. You can't do those in a
normal single pass.</p>

<h3>Try the effects</h3>
<p>In <code>post.frag</code>, change <code>#define EFFECT 1</code> to another number. Drag across
the preview to move the before/after split line.</p>
<ul>
  <li><code>0</code>: none &nbsp; <code>1</code>: edge detection &nbsp; <code>2</code>: pixelate</li>
  <li><code>3</code>: chromatic aberration + vignette &nbsp; <code>4</code>: greyscale + film grain &nbsp; <code>5</code>: blur</li>
</ul>

<div class="note">When the canvas is resized, the FBO's textures must be re-created at the new
size. Look for <code>ensureSize</code> in <code>main.js</code>.</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `const { mat4, radians } = H;
const sceneProgram = H.createProgram(gl, shaders.vs, shaders.fs);
const postProgram = H.createProgram(gl, shaders.postVs, shaders.postFs);

// ---- Scene geometry (lit cubes) ----
const cube = H.cube();
const cubeVao = gl.createVertexArray();
gl.bindVertexArray(cubeVao);
H.attribute(gl, gl.getAttribLocation(sceneProgram, 'aPosition'), cube.positions, 3);
H.attribute(gl, gl.getAttribLocation(sceneProgram, 'aNormal'), cube.normals, 3);
H.attribute(gl, gl.getAttribLocation(sceneProgram, 'aColor'), cube.colors, 3);
H.indexBuffer(gl, cube.indices);
const emptyVao = gl.createVertexArray();

const uMVP = gl.getUniformLocation(sceneProgram, 'uMVP');
const uModel = gl.getUniformLocation(sceneProgram, 'uModel');
const uScene = gl.getUniformLocation(postProgram, 'uScene');
const uTexel = gl.getUniformLocation(postProgram, 'uTexel');
const uTime = gl.getUniformLocation(postProgram, 'uTime');
const uSplit = gl.getUniformLocation(postProgram, 'uSplit');

// ---- The off-screen framebuffer ----
const fbo = gl.createFramebuffer();
const colorTex = gl.createTexture();
const depthRb = gl.createRenderbuffer();
let fbW = 0, fbH = 0;

function ensureSize(w, h) {
  if (w === fbW && h === fbH) return;
  fbW = w; fbH = h;
  gl.bindTexture(gl.TEXTURE_2D, colorTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) H.log('Framebuffer incomplete:', status);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

return function frame(t) {
  const w = canvas.width, h = canvas.height;
  ensureSize(w, h);

  // ---- Pass 1: draw the scene into the texture ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, w, h);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.1, 0.12, 0.2, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(sceneProgram);
  gl.bindVertexArray(cubeVao);
  const vp = mat4.mul(
    mat4.perspective(radians(50), w / h, 0.1, 100),
    mat4.lookAt([0, 2, 6], [0, 0, 0]),
  );
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + t * 0.4;
    const model = mat4.mul(
      mat4.translation(Math.cos(a) * 2.2, Math.sin(t + i) * 0.4, Math.sin(a) * 2.2),
      mat4.rotationY(t + i), mat4.rotationX(t * 0.7 + i),
    );
    gl.uniformMatrix4fv(uModel, false, model);
    gl.uniformMatrix4fv(uMVP, false, mat4.mul(vp, model));
    gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);
  }

  // ---- Pass 2: draw the texture to the screen through the effect ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, w, h);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(postProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, colorTex);
  gl.uniform1i(uScene, 0);
  gl.uniform2f(uTexel, 1 / w, 1 / h);
  gl.uniform1f(uTime, t);
  gl.uniform1f(uSplit, H.mouse.x > 0 ? H.mouse.x / w : 0.5);
  gl.bindVertexArray(emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};
`,
    },
    {
      key: 'vs',
      name: 'scene.vert',
      lang: 'glsl',
      code: `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec3 aColor;

uniform mat4 uMVP;
uniform mat4 uModel;

out vec3 vNormal;
out vec3 vColor;

void main() {
  vNormal = mat3(uModel) * aNormal;  // fine here: no non-uniform scaling
  vColor = aColor;
  gl_Position = uMVP * vec4(aPosition, 1.0);
}
`,
    },
    {
      key: 'fs',
      name: 'scene.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vColor;
out vec4 outColor;

void main() {
  vec3 L = normalize(vec3(0.5, 1.0, 0.7));          // a directional light
  float diffuse = max(dot(normalize(vNormal), L), 0.0);
  outColor = vec4(vColor * (0.25 + 0.75 * diffuse), 1.0);
}
`,
    },
    {
      key: 'postVs',
      name: 'post.vert',
      lang: 'glsl',
      code: `#version 300 es
// Full-screen triangle that also outputs a UV from 0..1.
out vec2 vUV;

void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUV = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`,
    },
    {
      key: 'postFs',
      name: 'post.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

// 0 none, 1 edges, 2 pixelate, 3 chromatic, 4 greyscale+grain, 5 blur
#define EFFECT 1

in vec2 vUV;
uniform sampler2D uScene;
uniform vec2 uTexel;     // size of one pixel in UV units
uniform float uTime;
uniform float uSplit;    // 0..1, the before/after divider

out vec4 outColor;

vec3 scene(vec2 uv) { return texture(uScene, uv).rgb; }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec3 effect(vec2 uv) {
#if EFFECT == 1
  // Sobel edge detection: compare brightness of neighbouring pixels.
  float tl = luma(scene(uv + uTexel * vec2(-1,  1)));
  float  t = luma(scene(uv + uTexel * vec2( 0,  1)));
  float tr = luma(scene(uv + uTexel * vec2( 1,  1)));
  float  l = luma(scene(uv + uTexel * vec2(-1,  0)));
  float  r = luma(scene(uv + uTexel * vec2( 1,  0)));
  float bl = luma(scene(uv + uTexel * vec2(-1, -1)));
  float  b = luma(scene(uv + uTexel * vec2( 0, -1)));
  float br = luma(scene(uv + uTexel * vec2( 1, -1)));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = length(vec2(gx, gy));
  return mix(vec3(0.02, 0.03, 0.08), vec3(0.4, 0.9, 1.0), edge * 2.0);
#elif EFFECT == 2
  vec2 cells = vec2(80.0, 80.0 * uTexel.x / uTexel.y);
  return scene((floor(uv * cells) + 0.5) / cells);
#elif EFFECT == 3
  vec2 dir = (uv - 0.5) * 0.012;
  vec3 c = vec3(scene(uv + dir).r, scene(uv).g, scene(uv - dir).b);
  float vignette = smoothstep(0.85, 0.3, length(uv - 0.5));
  return c * vignette;
#elif EFFECT == 4
  float grain = fract(sin(dot(uv * 1000.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
  return vec3(luma(scene(uv))) + (grain - 0.5) * 0.12;
#elif EFFECT == 5
  vec3 sum = vec3(0.0);
  for (int x = -3; x <= 3; x++)
    for (int y = -3; y <= 3; y++)
      sum += scene(uv + uTexel * vec2(x, y) * 2.0);
  return sum / 49.0;
#else
  return scene(uv);
#endif
}

void main() {
  vec3 col = vUV.x < uSplit ? scene(vUV) : effect(vUV);
  // Draw the split line.
  col = mix(col, vec3(1.0), step(abs(vUV.x - uSplit), uTexel.x * 1.5));
  outColor = vec4(col, 1.0);
}
`,
    },
  ],
  challenges: [
    { task: 'Try every <code>EFFECT</code> from 0 to 5.', hint: 'Change the number in <code>#define EFFECT 1</code>.' },
    {
      task: 'Write your own effect: invert the colours.',
      hint: 'Add <code>#elif EFFECT == 6</code> with <code>return 1.0 - scene(uv);</code>',
    },
    {
      task: 'Make a wavy "underwater" distortion.',
      hint: 'Offset the UV before sampling: <code>scene(uv + vec2(sin(uv.y * 30.0 + uTime * 3.0) * 0.005, 0.0))</code>',
    },
    {
      task: 'Render the scene at a quarter of the resolution for a chunky retro look.',
      hint: 'Call <code>ensureSize(w / 4 | 0, h / 4 | 0)</code>, use that size for the first <code>gl.viewport</code>, and set the texture filters to <code>gl.NEAREST</code>.',
    },
  ],
  quiz: [
    {
      q: 'What does gl.bindFramebuffer(gl.FRAMEBUFFER, null) do?',
      options: ['Deletes the framebuffer', 'Makes the screen (default framebuffer) the render target again', 'Clears the screen', 'Disables rendering'],
      answer: 1,
      explain: 'null means the default framebuffer, which is the canvas.',
    },
    {
      q: 'Why do effects like blur and edge detection need a separate pass?',
      options: ['They need to read neighbouring pixels of the finished image', 'They need more uniforms', 'They only work on textures loaded from files', 'GPUs cannot blur in one pass for licensing reasons'],
      answer: 0,
      explain: 'A fragment shader cannot read other pixels of the image it is drawing. Rendering to a texture first makes the whole image readable.',
    },
  ],
  cpp: `GLuint fbo, colorTex, depthRb;
glGenFramebuffers(1, &fbo);
glBindFramebuffer(GL_FRAMEBUFFER, fbo);

glGenTextures(1, &colorTex);
glBindTexture(GL_TEXTURE_2D, colorTex);
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, colorTex, 0);

glGenRenderbuffers(1, &depthRb);
glBindRenderbuffer(GL_RENDERBUFFER, depthRb);
glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT24, w, h);
glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, depthRb);

if (glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) { /* error */ }
glBindFramebuffer(GL_FRAMEBUFFER, 0);   // 0 = the window`,
};
