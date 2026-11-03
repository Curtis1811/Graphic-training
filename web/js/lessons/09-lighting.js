export default {
  id: 'lighting',
  title: 'Lighting: Normals & Blinn-Phong',
  summary: 'Make surfaces look solid with ambient, diffuse and specular light.',
  minutes: 22,
  content: `
<p>Flat colours make 3D shapes look like paper cut-outs. Our brains read shape from <b>shading</b>:
how brightness changes across a surface. The classic real-time lighting model splits light into
three parts.</p>

<h3>Normals</h3>
<p>A <b>normal</b> is a unit vector pointing straight out of the surface. Lighting is mostly dot
products between the normal and other directions. Normals are a vertex attribute
(<code>aNormal</code>). Interpolating them across a triangle gives smooth shading even on a
low-poly sphere.</p>

<h3>1. Ambient</h3>
<p>A small constant amount of light, so that surfaces facing away from the light aren't pitch
black. It's a cheap stand-in for light bouncing around the room.</p>

<h3>2. Diffuse (Lambert)</h3>
<p>A surface facing the light is brightest, and it gets darker as it turns away:</p>
<pre class="snippet" data-lang="glsl">float diffuse = max(dot(N, L), 0.0);   // N = normal, L = direction to light</pre>
<p>The dot product of two unit vectors is the cosine of the angle between them: 1 when they're
aligned, 0 at 90°, and negative behind (clamped to 0).</p>

<h3>3. Specular (Blinn-Phong)</h3>
<p>The shiny highlight. The <b>half vector</b> <code>H</code> points halfway between the light
direction and the view direction. The closer the normal is to <code>H</code>, the stronger the
highlight. Raising the result to a power (<i>shininess</i>) makes the highlight tighter:</p>
<pre class="snippet" data-lang="glsl">vec3 H = normalize(L + V);
float specular = pow(max(dot(N, H), 0.0), shininess);</pre>

<h3>The normal matrix</h3>
<p>Normals are directions, not points, and they break under non-uniform scaling. The correct
transform is the <b>transpose of the inverse</b> of the model matrix. We compute it on the CPU
(<code>H.mat4.normalMatrix</code>) and use its 3×3 part in the shader.</p>

<h3>Gamma</h3>
<p>Lighting maths happens in <i>linear</i> space, but monitors expect <i>gamma-encoded</i>
colours. The last line, <code>pow(color, vec3(1.0 / 2.2))</code>, converts between them. Delete
it and see how the shading turns harsh.</p>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `const program = H.createProgram(gl, shaders.vs, shaders.fs);
const { mat4, radians } = H;

function mesh(geo) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  H.attribute(gl, gl.getAttribLocation(program, 'aPosition'), geo.positions, 3);
  H.attribute(gl, gl.getAttribLocation(program, 'aNormal'), geo.normals, 3);
  H.indexBuffer(gl, geo.indices);
  return { vao, count: geo.indices.length };
}
const sphere = mesh(H.sphere(32, 48));
const cube = mesh(H.cube());
const floor = mesh(H.plane());

const names = ['uModel', 'uView', 'uProjection', 'uNormalMatrix',
               'uLightPos', 'uViewPos', 'uColor', 'uUnlit'];
const u = {};
for (const n of names) u[n] = gl.getUniformLocation(program, n);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

function draw(m, model, r, g, b, unlit = false) {
  gl.uniformMatrix4fv(u.uModel, false, model);
  gl.uniformMatrix4fv(u.uNormalMatrix, false, mat4.normalMatrix(model));
  gl.uniform3f(u.uColor, r, g, b);
  gl.uniform1i(u.uUnlit, unlit ? 1 : 0);
  gl.bindVertexArray(m.vao);
  gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
}

return function frame(t) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.02, 0.02, 0.04, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);

  const eye = [0, 2.2, 4.5];
  const light = [Math.cos(t) * 2.2, 1.6 + 0.4 * Math.sin(t * 1.3), Math.sin(t) * 2.2];
  gl.uniformMatrix4fv(u.uProjection, false,
    mat4.perspective(radians(50), canvas.width / canvas.height, 0.1, 100));
  gl.uniformMatrix4fv(u.uView, false, mat4.lookAt(eye, [0, 0.3, 0]));
  gl.uniform3fv(u.uLightPos, light);
  gl.uniform3fv(u.uViewPos, eye);

  draw(floor, mat4.mul(mat4.translation(0, -0.7, 0), mat4.scaling(8)), 0.35, 0.35, 0.4);
  draw(sphere, mat4.mul(mat4.translation(-0.8, 0.1, 0), mat4.scaling(0.8)), 0.9, 0.25, 0.2);
  draw(cube, mat4.mul(mat4.translation(1.0, -0.1, 0.2), mat4.rotationY(t * 0.5)), 0.2, 0.55, 0.95);

  // A small unlit sphere marks where the light is.
  draw(sphere, mat4.mul(mat4.translation(...light), mat4.scaling(0.08)), 1, 0.95, 0.8, true);
};
`,
    },
    {
      key: 'vs',
      name: 'lit.vert',
      lang: 'glsl',
      code: `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModel, uView, uProjection;
uniform mat4 uNormalMatrix;   // transpose(inverse(uModel))

out vec3 vWorldPos;
out vec3 vNormal;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = mat3(uNormalMatrix) * aNormal;
  gl_Position = uProjection * uView * world;
}
`,
    },
    {
      key: 'fs',
      name: 'lit.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;

uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform vec3 uColor;
uniform bool uUnlit;

out vec4 outColor;

const vec3 LIGHT_COLOR = vec3(1.0, 0.95, 0.85);
const float AMBIENT = 0.08;
const float SHININESS = 64.0;
const float SPECULAR_STRENGTH = 0.6;

void main() {
  if (uUnlit) { outColor = vec4(uColor, 1.0); return; }

  vec3 N = normalize(vNormal);                // interpolation shortens normals
  vec3 L = normalize(uLightPos - vWorldPos);  // towards the light
  vec3 V = normalize(uViewPos - vWorldPos);   // towards the camera
  vec3 H = normalize(L + V);                  // Blinn's half vector

  float diffuse = max(dot(N, L), 0.0);
  float specular = diffuse > 0.0 ? pow(max(dot(N, H), 0.0), SHININESS) : 0.0;

  // Light fades with distance (attenuation).
  float dist = length(uLightPos - vWorldPos);
  float atten = 1.0 / (1.0 + 0.09 * dist + 0.032 * dist * dist);

  vec3 color = AMBIENT * uColor
             + atten * diffuse * uColor * LIGHT_COLOR
             + atten * SPECULAR_STRENGTH * specular * LIGHT_COLOR;

  // Linear -> sRGB (gamma correction)
  outColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}
`,
    },
  ],
  challenges: [
    { task: 'Show only one lighting term at a time: ambient, then diffuse, then specular.', hint: 'Comment out parts of the <code>color = ...</code> sum.' },
    { task: 'Change <code>SHININESS</code> to 4, then 256.', hint: 'Low values look like plastic or rubber; high values look like polished metal.' },
    { task: 'Visualise the normals.', hint: '<code>outColor = vec4(N * 0.5 + 0.5, 1.0);</code> maps −1..1 to 0..1.' },
    {
      task: 'Add "toon" shading by quantising the diffuse term into bands.',
      hint: '<code>diffuse = floor(diffuse * 4.0) / 4.0;</code>',
    },
    {
      task: 'Add a second, blue light that stays still.',
      hint: 'Add a <code>uniform vec3 uLight2</code>, compute a second L, diffuse and specular, and add them to the colour.',
    },
  ],
  quiz: [
    {
      q: 'What does dot(N, L) measure for unit vectors N and L?',
      options: ['The distance to the light', 'The cosine of the angle between the normal and the light direction', 'The light colour', 'The reflection vector'],
      answer: 1,
      explain: 'For unit vectors, dot = cos(angle). That is exactly Lambert\'s law for diffuse light.',
    },
    {
      q: 'Why normalize(vNormal) again in the fragment shader?',
      options: ['GLSL requires it', 'Interpolating unit vectors gives vectors shorter than 1', 'To flip the normal', 'To convert to view space'],
      answer: 1,
      explain: 'Linear interpolation between two unit vectors produces a shorter vector, so we re-normalise.',
    },
    {
      q: 'How should normals be transformed when the model matrix has non-uniform scale?',
      options: ['With the model matrix', 'With the transpose of the inverse model matrix', 'With the projection matrix', 'They don\'t need transforming'],
      answer: 1,
      explain: 'The normal matrix, transpose(inverse(M)), keeps normals perpendicular to the surface.',
    },
  ],
  cpp: `glm::mat3 normalMatrix = glm::transpose(glm::inverse(glm::mat3(model)));
glUniformMatrix3fv(uNormalMatrix, 1, GL_FALSE, glm::value_ptr(normalMatrix));
glUniform3fv(uLightPos, 1, glm::value_ptr(lightPos));
glUniform3fv(uViewPos, 1, glm::value_ptr(cameraPos));

// Tip: desktop GL can do gamma correction in hardware:
// glEnable(GL_FRAMEBUFFER_SRGB);  // then drop the pow(..., 1/2.2)`,
};
