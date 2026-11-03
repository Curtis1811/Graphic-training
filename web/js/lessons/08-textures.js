export default {
  id: 'textures',
  title: 'Textures & Sampling',
  summary: 'Upload images to the GPU, map them with UV coordinates, and control filtering.',
  minutes: 18,
  content: `
<p>A <b>texture</b> is an image stored on the GPU that shaders can read. Textures add detail
without adding geometry: wood grain, brick, faces, text. They are also used for data such as
normal maps, shadow maps and look-up tables.</p>

<h3>UV coordinates</h3>
<p>Each vertex gets a <b>texture coordinate</b> (often called <b>UV</b>) that says which point of
the image it maps to. (0, 0) is one corner of the image and (1, 1) the opposite one. The
rasteriser interpolates UVs across the triangle like any other varying, and the fragment shader
looks up the colour:</p>
<pre class="snippet" data-lang="glsl">uniform sampler2D uTexture;
outColor = texture(uTexture, vUV);</pre>

<h3>Creating a texture</h3>
<pre class="snippet" data-lang="js">const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
gl.generateMipmap(gl.TEXTURE_2D);</pre>
<p><code>image</code> can be an <code>&lt;img&gt;</code>, a video, a canvas, or raw bytes in a
<code>Uint8Array</code>. This lesson draws its texture with the 2D canvas API, so it needs no
downloads.</p>

<h3>Filtering</h3>
<p>Texels (texture pixels) almost never line up exactly with screen pixels:</p>
<ul>
  <li><b>Magnification</b> (texture bigger than its pixels): <code>NEAREST</code> looks blocky
  (pixel art), <code>LINEAR</code> blends the 4 nearest texels.</li>
  <li><b>Minification</b> (texture far away): sampling skips texels and <i>shimmers</i>.
  <b>Mipmaps</b> fix this. They are pre-shrunk copies at ½, ¼, ⅛… size, and
  <code>LINEAR_MIPMAP_LINEAR</code> ("trilinear") blends between them.</li>
</ul>

<h3>Wrapping</h3>
<p>UVs outside 0..1 are handled by the wrap mode: <code>REPEAT</code> tiles the image,
<code>MIRRORED_REPEAT</code> flips every other tile, and <code>CLAMP_TO_EDGE</code> stretches the
border pixels.</p>

<h3>Texture units</h3>
<p>A shader can read several textures at once through numbered <b>texture units</b>. You bind a
texture to unit <i>n</i> with <code>gl.activeTexture(gl.TEXTURE0 + n)</code>, then tell the sampler
uniform which unit to use: <code>gl.uniform1i(uTexture, n)</code>.</p>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `// Try gl.NEAREST, gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR
const MIN_FILTER = gl.LINEAR_MIPMAP_LINEAR;
const MAG_FILTER = gl.NEAREST;
const WRAP = gl.REPEAT;          // or gl.CLAMP_TO_EDGE, gl.MIRRORED_REPEAT
const UV_SCALE = 2.0;            // > 1 shows the wrap mode

// ---- Paint an image with the 2D canvas API ----
const img = document.createElement('canvas');
img.width = img.height = 64;
const ctx = img.getContext('2d');
for (let y = 0; y < 8; y++) {
  for (let x = 0; x < 8; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#2b3a67' : '#f4f1de';
    ctx.fillRect(x * 8, y * 8, 8, 8);
  }
}
ctx.fillStyle = '#e07a5f';
ctx.font = 'bold 30px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('GL', 32, 34);

// ---- Upload it as a texture ----
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);  // images are stored top-down
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, MIN_FILTER);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, MAG_FILTER);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, WRAP);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, WRAP);

// ---- Geometry: a cube with UVs, plus a big floor ----
const program = H.createProgram(gl, shaders.vs, shaders.fs);
const { mat4, radians } = H;
function mesh(geo) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  H.attribute(gl, gl.getAttribLocation(program, 'aPosition'), geo.positions, 3);
  H.attribute(gl, gl.getAttribLocation(program, 'aUV'), geo.uvs, 2);
  H.indexBuffer(gl, geo.indices);
  return { vao, count: geo.indices.length };
}
const cube = mesh(H.cube());
const floor = mesh(H.plane());

const u = (name) => gl.getUniformLocation(program, name);
const uMVP = u('uMVP'), uTexture = u('uTexture'), uUVScale = u('uUVScale');

gl.enable(gl.DEPTH_TEST);

return function frame(t) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.05, 0.06, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);

  // Bind our texture to unit 0 and point the sampler at unit 0.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(uTexture, 0);

  const proj = mat4.perspective(radians(55), canvas.width / canvas.height, 0.1, 100);
  const view = mat4.lookAt([0, 1.4, 3], [0, 0.2, 0]);
  const vp = mat4.mul(proj, view);

  // Spinning cube
  const model = mat4.mul(mat4.translation(0, 0.4, 0), mat4.rotationY(t * 0.7), mat4.rotationX(t * 0.4));
  gl.uniformMatrix4fv(uMVP, false, mat4.mul(vp, model));
  gl.uniform1f(uUVScale, UV_SCALE);
  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.count, gl.UNSIGNED_SHORT, 0);

  // A huge floor shows minification and mipmapping.
  gl.uniformMatrix4fv(uMVP, false, mat4.mul(vp, mat4.translation(0, -0.6, 0), mat4.scaling(40)));
  gl.uniform1f(uUVScale, 16.0);
  gl.bindVertexArray(floor.vao);
  gl.drawElements(gl.TRIANGLES, floor.count, gl.UNSIGNED_SHORT, 0);
};
`,
    },
    {
      key: 'vs',
      name: 'shader.vert',
      lang: 'glsl',
      code: `#version 300 es
in vec3 aPosition;
in vec2 aUV;

uniform mat4 uMVP;      // projection * view * model, pre-multiplied on the CPU
uniform float uUVScale;

out vec2 vUV;

void main() {
  vUV = aUV * uUVScale;
  gl_Position = uMVP * vec4(aPosition, 1.0);
}
`,
    },
    {
      key: 'fs',
      name: 'shader.frag',
      lang: 'glsl',
      code: `#version 300 es
precision highp float;

in vec2 vUV;
uniform sampler2D uTexture;

out vec4 outColor;

void main() {
  vec4 texel = texture(uTexture, vUV);
  outColor = texel;

  // Try: outColor = vec4(fract(vUV), 0.0, 1.0);   // visualise the UVs
}
`,
    },
  ],
  challenges: [
    { task: 'Set <code>MIN_FILTER</code> to <code>gl.NEAREST</code> and look at the far floor. Then compare with <code>gl.LINEAR_MIPMAP_LINEAR</code>.', hint: 'Without mipmaps the distance shimmers and shows moiré patterns.' },
    { task: 'Try each wrap mode with <code>UV_SCALE = 3.0</code>.', hint: '<code>CLAMP_TO_EDGE</code> smears the edge texels outwards.' },
    {
      task: 'Scroll the texture over time.',
      hint: 'Add a <code>uniform float uTime</code> and sample <code>texture(uTexture, vUV + vec2(uTime * 0.2, 0.0))</code>.',
    },
    {
      task: 'Tint the texture by its UVs, or mix it with a colour.',
      hint: '<code>outColor = vec4(mix(texel.rgb, vec3(vUV, 1.0), 0.3), 1.0);</code>',
    },
    {
      task: 'Draw something different on the 2D canvas, like circles or your name.',
      hint: 'Use <code>ctx.arc</code>, <code>ctx.fill</code> and <code>ctx.fillText</code>. Bigger canvases (256×256) give sharper text.',
    },
  ],
  quiz: [
    {
      q: 'What are mipmaps for?',
      options: ['Compressing textures', 'Pre-shrunk copies that avoid shimmering when a texture is small on screen', 'Storing normals', 'Making textures repeat'],
      answer: 1,
      explain: 'Mipmaps let the GPU sample a properly averaged smaller version during minification.',
    },
    {
      q: 'A sampler uniform is set with gl.uniform1i(uTex, 2). What does the 2 mean?',
      options: ['The mipmap level', 'Texture unit 2', 'Two textures are used', 'The texture ID'],
      answer: 1,
      explain: 'Samplers hold a texture unit number. The texture itself is bound to that unit with activeTexture + bindTexture.',
    },
    {
      q: 'Which wrap mode tiles a texture when UVs go beyond 1.0?',
      options: ['CLAMP_TO_EDGE', 'REPEAT', 'NEAREST', 'LINEAR'],
      answer: 1,
      explain: 'REPEAT uses only the fractional part of the coordinate, so the image tiles.',
    },
  ],
  cpp: `// Load an image file with stb_image (single header library)
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

stbi_set_flip_vertically_on_load(true);
int w, h, channels;
unsigned char* pixels = stbi_load("brick.png", &w, &h, &channels, 4);

GLuint tex;
glGenTextures(1, &tex);
glBindTexture(GL_TEXTURE_2D, tex);
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, pixels);
glGenerateMipmap(GL_TEXTURE_2D);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
stbi_image_free(pixels);

glActiveTexture(GL_TEXTURE0);
glBindTexture(GL_TEXTURE_2D, tex);
glUniform1i(glGetUniformLocation(program, "uTexture"), 0);`,
};
