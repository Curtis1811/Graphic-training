export default {
  id: 'fragment-art',
  title: 'Painting with Maths: Fragment Shaders',
  summary: 'Cover the screen with one triangle, then draw shapes using distance functions.',
  minutes: 18,
  content: `
<p>If a triangle covers the whole screen, the fragment shader runs for <i>every pixel</i>. Then
you can draw anything with pure maths: gradients, shapes, patterns, even 3D scenes. Sites like
Shadertoy are built entirely on this trick.</p>

<h3>A full-screen triangle with no buffers</h3>
<p>The vertex shader can use <code>gl_VertexID</code> (0, 1, 2) to compute its positions, so you
don't need a vertex buffer at all. Those three vertices make one oversized triangle that covers
the screen. The parts outside the screen are clipped away for free.</p>

<h3>Pixel coordinates → UV</h3>
<p><code>gl_FragCoord.xy</code> is the pixel's position in the framebuffer: (0, 0) is the
bottom-left, and the values go up to the width and height. We usually convert it to a
<b>normalised</b> space:</p>
<pre class="snippet" data-lang="glsl">vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
// centre is (0,0), y goes from -0.5 to 0.5, x is scaled by the aspect</pre>

<h3>Signed distance functions (SDFs)</h3>
<p>An SDF returns how far a point is from a shape's edge: <b>negative inside, positive
outside</b>. For a circle that's just <code>length(p) - radius</code>. SDFs are powerful
because:</p>
<ul>
  <li>you can <b>move</b> a shape by subtracting from <code>p</code> before the call,</li>
  <li>you can <b>combine</b> shapes: <code>min(a, b)</code> is a union and <code>max(a, b)</code> an intersection,</li>
  <li>you get <b>soft, anti-aliased edges</b> with <code>smoothstep</code>.</li>
</ul>

<h3>Essential GLSL functions</h3>
<ul>
  <li><code>mix(a, b, t)</code>: linear blend, <code>a*(1-t) + b*t</code></li>
  <li><code>step(edge, x)</code>: 0 if x &lt; edge, else 1</li>
  <li><code>smoothstep(e0, e1, x)</code>: a smooth 0→1 ramp between e0 and e1</li>
  <li><code>fract(x)</code>: the fractional part, great for repeating patterns</li>
  <li><code>length</code>, <code>dot</code>, <code>abs</code>, <code>clamp</code>, <code>sin</code>/<code>cos</code></li>
</ul>
<p>Most GLSL functions work on vectors one component at a time. So <code>sin(vec3(...))</code>
returns a <code>vec3</code>, which is how the colour palette below is made.</p>

<div class="note">Touch or move the mouse over the preview: <code>uMouse</code> holds the pointer
position in pixels. Try the challenge that makes the circle follow it.</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `const program = H.createProgram(gl, shaders.vs, shaders.fs);

// An empty VAO: the vertex shader makes positions from gl_VertexID.
const vao = gl.createVertexArray();

const uResolution = gl.getUniformLocation(program, 'uResolution');
const uTime = gl.getUniformLocation(program, 'uTime');
const uMouse = gl.getUniformLocation(program, 'uMouse');

return function frame(time) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.uniform2f(uResolution, canvas.width, canvas.height);
  gl.uniform1f(uTime, time);
  gl.uniform2f(uMouse, H.mouse.x, H.mouse.y);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};
`,
    },
    {
      key: 'vs',
      name: 'fullscreen.vert',
      lang: 'glsl',
      code: `#version 300 es
// No vertex buffer: build one big triangle from the vertex index.
//   id 0 -> (-1, -1)   id 1 -> (3, -1)   id 2 -> (-1, 3)
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`,
    },
    {
      key: 'fs',
      name: 'art.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

uniform vec2 uResolution;  // canvas size in pixels
uniform float uTime;       // seconds
uniform vec2 uMouse;       // pointer position in pixels

out vec4 outColor;

// Signed distance to a circle of radius r at the origin.
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

void main() {
  // Centre the coordinates; y runs from -0.5 to 0.5.
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  // Background: a vertical gradient.
  vec3 col = mix(vec3(0.04, 0.05, 0.12), vec3(0.16, 0.08, 0.28), uv.y + 0.5);

  // Repeating dot grid using fract().
  vec2 cell = fract(uv * 12.0) - 0.5;
  col += 0.06 * (1.0 - smoothstep(0.05, 0.08, length(cell)));

  // A circle that bobs up and down.
  vec2 centre = vec2(0.0, 0.12 * sin(uTime * 2.0));
  float d = sdCircle(uv - centre, 0.25);

  // Rainbow palette: cos() of a vec3 gives three phase-shifted waves.
  vec3 circleCol = 0.5 + 0.5 * cos(uTime + uv.xyx * 4.0 + vec3(0.0, 2.0, 4.0));

  // smoothstep gives a soft, anti-aliased edge about 1 pixel wide.
  float aa = 1.5 / uResolution.y;
  col = mix(circleCol, col, smoothstep(-aa, aa, d));

  // Glow outside the circle, fading with distance.
  col += vec3(0.3, 0.5, 1.0) * 0.015 / max(abs(d), 0.005) * step(0.0, d);

  outColor = vec4(col, 1.0);
}
`,
    },
  ],
  challenges: [
    {
      task: 'Add a second circle and combine them with <code>min()</code> so they melt together.',
      hint: '<code>float d2 = sdCircle(uv - vec2(0.3, 0.0), 0.15); d = min(d, d2);</code>. For a gooey "smooth union", look up <i>smin</i> by Inigo Quilez.',
    },
    {
      task: 'Replace the circle with a rounded box.',
      hint: '<code>float sdBox(vec2 p, vec2 b) { vec2 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }</code>. Subtract a radius for rounded corners.',
    },
    {
      task: 'Make the circle follow the mouse or your finger.',
      hint: 'Convert <code>uMouse</code> the same way as <code>uv</code>: <code>vec2 m = (uMouse - 0.5 * uResolution) / uResolution.y;</code> then use <code>uv - m</code>.',
    },
    { task: 'Draw concentric rings using the distance value.', hint: 'Try <code>col *= 0.8 + 0.2 * sin(d * 80.0 - uTime * 5.0);</code>' },
  ],
  quiz: [
    {
      q: 'A signed distance function returns −0.1 for a point. Where is the point?',
      options: ['Outside the shape, 0.1 away', 'Inside the shape, 0.1 from the edge', 'Exactly on the edge', 'Behind the camera'],
      answer: 1,
      explain: 'By convention SDFs are negative inside the shape and positive outside.',
    },
    {
      q: 'What does gl_FragCoord.xy contain?',
      options: ['Values from -1 to 1', 'The pixel position in the framebuffer, origin at the bottom-left', 'The texture coordinate', 'The vertex position'],
      answer: 1,
      explain: 'gl_FragCoord is in window (pixel) coordinates, with (0.5, 0.5) at the centre of the bottom-left pixel.',
    },
    {
      q: 'Which expression combines two SDF shapes into their union?',
      options: ['a + b', 'max(a, b)', 'min(a, b)', 'a * b'],
      answer: 2,
      explain: 'The union is the nearest surface, so min(a, b). max(a, b) gives the intersection.',
    },
  ],
  cpp: `// Desktop GL 3.3 core also requires a bound VAO, even an empty one:
GLuint emptyVao;
glGenVertexArrays(1, &emptyVao);

// render loop
glUseProgram(program);
glUniform2f(uResolution, (float)w, (float)h);
glUniform1f(uTime, (float)glfwGetTime());
glBindVertexArray(emptyVao);
glDrawArrays(GL_TRIANGLES, 0, 3);

// GLSL differences: use "#version 330 core" and drop the
// "precision highp float;" line (desktop GLSL ignores precision).`,
};
