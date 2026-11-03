export default {
  id: 'uniforms',
  title: 'Uniforms & Animation',
  summary: 'Send values from JavaScript to every shader invocation, and animate on the GPU.',
  minutes: 12,
  content: `
<p>Attributes change from vertex to vertex. Sometimes you want a value that is the <b>same for
everything in a draw call</b>: the current time, the screen size, a colour, a transformation
matrix. That's a <b>uniform</b>.</p>

<h3>Declaring and setting uniforms</h3>
<pre class="snippet" data-lang="glsl">uniform float uTime;   // in a shader</pre>
<pre class="snippet" data-lang="js">const uTime = gl.getUniformLocation(program, 'uTime'); // once
gl.useProgram(program);
gl.uniform1f(uTime, time);                              // every frame</pre>
<p>The function name encodes the type: <code>uniform1f</code> (float), <code>uniform2f</code>
(vec2), <code>uniform3fv</code> (vec3 from an array), <code>uniform1i</code> (int or sampler),
<code>uniformMatrix4fv</code> (mat4), and so on. Uniforms belong to a program, so call
<code>useProgram</code> <i>first</i>.</p>

<h3>Rotating in the vertex shader</h3>
<p>Rotating a 2D point by angle <i>a</i> is a little matrix multiply:</p>
<pre class="snippet" data-lang="glsl">mat2 rot = mat2(cos(a), sin(a),    // first COLUMN
               -sin(a), cos(a));   // second column
vec2 p = rot * aPosition;</pre>
<p>GLSL matrices are filled <b>column by column</b> ("column-major"), just like the arrays you
upload from JavaScript. Remember this, because it trips everyone up at least once.</p>

<h3>Aspect ratio</h3>
<p>Clip space always goes from -1 to 1, even when the canvas is wide, so shapes get stretched.
Dividing x by the aspect ratio (<code>width / height</code>) fixes it. Rotate your phone and
watch the triangle stay the same shape.</p>

<div class="note">Doing the maths on the GPU means the vertex buffer never changes. You upload
the triangle once, and only a single float (<code>uTime</code>) goes to the GPU each frame.</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `const program = H.createProgram(gl, shaders.vs, shaders.fs);

const data = new Float32Array([
  //  x     y      r    g    b
   0.0,  0.6,   1.0, 0.3, 0.3,
  -0.52, -0.3,  0.3, 1.0, 0.4,
   0.52, -0.3,  0.3, 0.5, 1.0,
]);
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, 'aPosition');
const aColor = gl.getAttribLocation(program, 'aColor');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 20, 0);
gl.enableVertexAttribArray(aColor);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 20, 8);

// Look up uniform locations once, after linking.
const uTime = gl.getUniformLocation(program, 'uTime');
const uAspect = gl.getUniformLocation(program, 'uAspect');

return function frame(time) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.08, 0.09, 0.12, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);              // uniforms are set on the current program
  gl.uniform1f(uTime, time);
  gl.uniform1f(uAspect, canvas.width / canvas.height);

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

uniform float uTime;    // seconds since start
uniform float uAspect;  // canvas width / height

out vec3 vColor;

void main() {
  float a = uTime;                       // angle in radians
  mat2 rot = mat2(cos(a), sin(a),
                 -sin(a), cos(a));
  vec2 p = rot * aPosition;

  p.x /= uAspect;                        // undo the stretch on wide screens

  vColor = aColor;
  gl_Position = vec4(p, 0.0, 1.0);
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
uniform float uTime;   // uniforms can be used in any stage

out vec4 outColor;

void main() {
  float pulse = 0.75 + 0.25 * sin(uTime * 4.0);
  outColor = vec4(vColor * pulse, 1.0);
}
`,
    },
  ],
  challenges: [
    { task: 'Spin the other way, twice as fast.', hint: 'Use <code>float a = -2.0 * uTime;</code>' },
    {
      task: 'Make the triangle also move in a circle around the screen centre.',
      hint: 'After rotating, add an offset: <code>p += 0.3 * vec2(cos(uTime), sin(uTime));</code> (before the aspect fix).',
    },
    {
      task: 'Add a <code>uniform vec3 uTint</code> and set it from JavaScript with <code>gl.uniform3f</code>.',
      hint: 'Declare it in the fragment shader, look up its location with <code>getUniformLocation</code>, and multiply: <code>vColor * uTint</code>.',
    },
  ],
  quiz: [
    {
      q: 'Which is true about uniforms?',
      options: ['They have a different value for each vertex', 'They are constant across a whole draw call and set from the CPU', 'They can only be used in fragment shaders', 'They are read from the vertex buffer'],
      answer: 1,
      explain: 'A uniform has one value for the whole draw call. It can be read in both shader stages.',
    },
    {
      q: 'You call gl.uniform1f(loc, 1.0) and nothing changes. What is the most likely mistake?',
      options: ['Floats must be integers', 'A different program was in use (call gl.useProgram first)', 'Uniforms only update every second', 'gl.clear resets uniforms'],
      answer: 1,
      explain: 'gl.uniform* sets the value on the currently used program.',
    },
    {
      q: 'GLSL matrices like mat2(a, b, c, d) are filled…',
      options: ['Row by row', 'Column by column', 'Diagonally', 'Randomly'],
      answer: 1,
      explain: 'GLSL is column-major: (a, b) is the first column and (c, d) is the second.',
    },
  ],
  cpp: `GLint uTime = glGetUniformLocation(program, "uTime");
GLint uAspect = glGetUniformLocation(program, "uAspect");

// render loop
glUseProgram(program);
glUniform1f(uTime, (float)glfwGetTime());
glUniform1f(uAspect, (float)width / (float)height);
glDrawArrays(GL_TRIANGLES, 0, 3);`,
};
