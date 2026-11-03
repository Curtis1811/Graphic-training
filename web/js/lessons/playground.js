export default {
  id: 'playground',
  title: 'Shader Playground',
  summary: 'A free-form fragment shader sandbox, with a ray-marched 3D scene to start from.',
  playground: true,
  content: `
<p>A blank canvas for experiments. The vertex shader covers the screen (as in lesson 5), so
everything is up to <code>playground.frag</code>. These uniforms are available:</p>
<ul>
  <li><code>uniform vec2 uResolution</code>: the canvas size in pixels</li>
  <li><code>uniform float uTime</code>: seconds since the start</li>
  <li><code>uniform vec2 uMouse</code>: the pointer position in pixels (bottom-left origin)</li>
</ul>
<p>The starting shader is a <b>ray marcher</b>. For each pixel it shoots a ray from the camera and
steps along it using an SDF of the scene (lesson 5 in 3D). Then it lights the hit point with
Blinn-Phong (lesson 9). Drag on the preview to orbit the camera.</p>
<p>Your edits are saved on this device automatically.</p>
`,
  files: [
    {
      key: 'fs',
      name: 'playground.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
out vec4 outColor;

// ---- Scene description as signed distance functions ----
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
// Smooth minimum: blends two shapes together.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float map(vec3 p) {
  float ground = p.y + 1.0;
  vec3 c = vec3(sin(uTime) * 0.9, 0.0, 0.0);
  float blob = smin(sdSphere(p - c, 0.6), sdBox(p + c, vec3(0.45)) - 0.05, 0.5);
  return min(ground, blob);
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  // Orbit camera, controlled by the mouse.
  float yaw = uMouse.x > 0.0 ? (uMouse.x / uResolution.x - 0.5) * 6.28 : uTime * 0.2;
  vec3 ro = vec3(sin(yaw) * 4.0, 1.2, cos(yaw) * 4.0);   // ray origin
  vec3 fwd = normalize(-ro);
  vec3 right = normalize(cross(fwd, vec3(0, 1, 0)));
  vec3 up = cross(right, fwd);
  vec3 rd = normalize(fwd * 1.5 + right * uv.x + up * uv.y); // ray direction

  // Ray march: step forward by the distance to the nearest surface.
  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 100; i++) {
    float d = map(ro + rd * t);
    if (d < 0.001) { hit = true; break; }
    t += d;
    if (t > 30.0) break;
  }

  vec3 sky = mix(vec3(0.5, 0.7, 1.0), vec3(0.1, 0.15, 0.35), uv.y + 0.5);
  vec3 col = sky;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 l = normalize(vec3(0.6, 0.8, 0.4));
    vec3 h = normalize(l - rd);
    float checker = mod(floor(p.x) + floor(p.z), 2.0);
    vec3 albedo = p.y < -0.99 ? mix(vec3(0.3), vec3(0.8), checker) : vec3(1.0, 0.45, 0.3);
    float diff = max(dot(n, l), 0.0);
    float spec = pow(max(dot(n, h), 0.0), 48.0);
    col = albedo * (0.15 + diff) + spec * 0.5;
    col = mix(col, sky, 1.0 - exp(-0.02 * t * t)); // fog
  }
  outColor = vec4(pow(col, vec3(0.4545)), 1.0);
}
`,
    },
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `const program = H.createProgram(gl, shaders.vs, shaders.fs);
const vao = gl.createVertexArray();
const uResolution = gl.getUniformLocation(program, 'uResolution');
const uTime = gl.getUniformLocation(program, 'uTime');
const uMouse = gl.getUniformLocation(program, 'uMouse');

return function frame(t) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.uniform2f(uResolution, canvas.width, canvas.height);
  gl.uniform1f(uTime, t);
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
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`,
    },
  ],
  challenges: [],
  quiz: [],
};
