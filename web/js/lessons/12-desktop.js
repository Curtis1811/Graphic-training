export default {
  id: 'desktop-opengl',
  title: 'From WebGL to Desktop OpenGL',
  summary: 'Set up a C++ OpenGL project, translate what you learned, and see where to go next.',
  minutes: 15,
  content: `
<p>Everything you've written here was <b>real OpenGL</b>, called from JavaScript instead of C.
Moving to desktop C++ mostly means setting up a window and a function loader. The rendering
code translates almost line for line.</p>

<h3>The pieces of a desktop project</h3>
<ul>
  <li><b>A window + context library</b>: <a href="https://www.glfw.org" target="_blank" rel="noopener">GLFW</a> (or SDL). It creates the window, the OpenGL context and handles input.</li>
  <li><b>A function loader</b>: <a href="https://glad.dav1d.de" target="_blank" rel="noopener">glad</a>. OpenGL functions live in the graphics driver and must be looked up at runtime.</li>
  <li><b>Maths</b>: <a href="https://github.com/g-truc/glm" target="_blank" rel="noopener">GLM</a>, which mirrors GLSL types (<code>glm::vec3</code>, <code>glm::mat4</code>).</li>
  <li><b>Images</b>: <code>stb_image.h</code> for loading PNG/JPG textures.</li>
</ul>

<h3>Translation table</h3>
<div class="table-wrap"><table>
  <tr><th>WebGL2 (JS)</th><th>OpenGL (C/C++)</th></tr>
  <tr><td><code>gl.createBuffer()</code></td><td><code>glGenBuffers(1, &amp;buf)</code></td></tr>
  <tr><td><code>gl.createVertexArray()</code></td><td><code>glGenVertexArrays(1, &amp;vao)</code></td></tr>
  <tr><td><code>gl.createTexture()</code></td><td><code>glGenTextures(1, &amp;tex)</code></td></tr>
  <tr><td><code>gl.bufferData(target, f32array, usage)</code></td><td><code>glBufferData(target, sizeof(data), data, usage)</code></td></tr>
  <tr><td><code>gl.uniformMatrix4fv(loc, false, m)</code></td><td><code>glUniformMatrix4fv(loc, 1, GL_FALSE, ptr)</code></td></tr>
  <tr><td><code>gl.COLOR_BUFFER_BIT</code></td><td><code>GL_COLOR_BUFFER_BIT</code></td></tr>
  <tr><td><code>#version 300 es</code> + <code>precision highp float;</code></td><td><code>#version 330 core</code> (or 410/460)</td></tr>
  <tr><td>browser presents the frame</td><td><code>glfwSwapBuffers(window)</code></td></tr>
  <tr><td><code>requestAnimationFrame</code></td><td><code>while (!glfwWindowShouldClose(w)) { ... }</code></td></tr>
</table></div>

<h3>What desktop OpenGL adds</h3>
<ul>
  <li><b>Geometry and tessellation shaders</b>: generate or subdivide geometry on the GPU.</li>
  <li><b>Compute shaders</b> (4.3+): general-purpose GPU programs for physics, particles and image processing.</li>
  <li><b>Direct State Access</b> (4.5): <code>glNamedBufferData(buf, ...)</code> edits objects without binding them.</li>
  <li><b>Debug output</b>: <code>glDebugMessageCallback</code> gives readable errors instead of polling <code>glGetError</code>.</li>
</ul>
<div class="note"><b>macOS note:</b> Apple deprecated OpenGL and supports it only up to 4.1. It
still works for learning. Add <code>glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE)</code>.</div>

<h3>A CMake project</h3>
<pre class="snippet" data-lang="cpp">cmake_minimum_required(VERSION 3.16)
project(hello_gl CXX C)
set(CMAKE_CXX_STANDARD 17)
include(FetchContent)
FetchContent_Declare(glfw GIT_REPOSITORY https://github.com/glfw/glfw.git GIT_TAG 3.4)
FetchContent_Declare(glm  GIT_REPOSITORY https://github.com/g-truc/glm.git GIT_TAG 1.0.1)
FetchContent_MakeAvailable(glfw glm)
# glad: generate a "gl 3.3 core" loader at glad.dav1d.de and unzip it into ./glad
add_executable(hello_gl main.cpp glad/src/glad.c)
target_include_directories(hello_gl PRIVATE glad/include)
target_link_libraries(hello_gl PRIVATE glfw glm::glm)</pre>
<p>The full <code>main.cpp</code> for a coloured triangle is in the <b>Desktop OpenGL (C++)</b>
section below. It's lesson 3 rewritten in C++.</p>

<h3>Where to go next</h3>
<ul>
  <li><a href="https://learnopengl.com" target="_blank" rel="noopener">LearnOpenGL</a>: the best free desktop OpenGL tutorial. You've already covered its "Getting Started" and "Lighting" chapters.</li>
  <li><a href="https://thebookofshaders.com" target="_blank" rel="noopener">The Book of Shaders</a>: fragment shader art (lesson 5, much deeper).</li>
  <li><a href="https://iquilezles.org/articles/" target="_blank" rel="noopener">Inigo Quilez's articles</a>: SDFs, ray marching, noise.</li>
  <li>Topics to learn next: shadow mapping, normal mapping, physically based rendering (PBR), deferred shading, HDR and bloom.</li>
  <li>Modern APIs: <b>WebGPU</b> (web), <b>Vulkan</b>, <b>Metal</b> and <b>DirectX 12</b> use the same pipeline ideas with more explicit control.</li>
</ul>
`,
  files: [],
  challenges: [
    { task: 'Install a C++ compiler and CMake, then build the triangle program below.', hint: 'Windows: Visual Studio Community. macOS: <code>xcode-select --install</code> + Homebrew CMake. Linux: <code>sudo apt install build-essential cmake xorg-dev</code>.' },
    { task: 'Port lesson 7 (rotating cubes) to C++ using GLM.', hint: 'Copy the cube data from the app (log <code>H.cube().positions</code>) or type in the 8-corner version from LearnOpenGL.' },
    { task: 'Turn on debug output in C++ and deliberately pass a bad enum.', hint: 'Request a debug context with <code>glfwWindowHint(GLFW_OPENGL_DEBUG_CONTEXT, GL_TRUE)</code>, then <code>glEnable(GL_DEBUG_OUTPUT)</code> and <code>glDebugMessageCallback(...)</code> (GL 4.3+).' },
  ],
  quiz: [
    {
      q: 'Why does desktop OpenGL need a loader such as glad?',
      options: ['To compress textures', 'Function addresses come from the driver and must be looked up at runtime', 'To create the window', 'To compile C++'],
      answer: 1,
      explain: 'Only very old OpenGL is in the OS libraries. Everything modern is fetched from the driver with something like glfwGetProcAddress.',
    },
    {
      q: 'What is the desktop equivalent of "#version 300 es"?',
      options: ['#version 100', '#version 330 core', '#include <gl>', 'No version line is needed'],
      answer: 1,
      explain: 'GLSL 3.30 core matches OpenGL 3.3, which has nearly the same features as WebGL2.',
    },
  ],
  cpp: `// main.cpp: coloured triangle in OpenGL 3.3 core (GLFW + glad)
#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <cstdio>

static const char* VS = R"(#version 330 core
layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec3 aColor;
out vec3 vColor;
void main() {
  vColor = aColor;
  gl_Position = vec4(aPosition, 0.0, 1.0);
})";

static const char* FS = R"(#version 330 core
in vec3 vColor;
out vec4 outColor;
void main() { outColor = vec4(vColor, 1.0); })";

static GLuint compile(GLenum type, const char* src) {
  GLuint s = glCreateShader(type);
  glShaderSource(s, 1, &src, nullptr);
  glCompileShader(s);
  GLint ok; glGetShaderiv(s, GL_COMPILE_STATUS, &ok);
  if (!ok) { char log[1024]; glGetShaderInfoLog(s, sizeof log, nullptr, log); fprintf(stderr, "%s\\n", log); }
  return s;
}

int main() {
  if (!glfwInit()) return 1;
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
  glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif
  GLFWwindow* window = glfwCreateWindow(800, 600, "Hello OpenGL", nullptr, nullptr);
  if (!window) { glfwTerminate(); return 1; }
  glfwMakeContextCurrent(window);
  glfwSwapInterval(1);  // vsync
  if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) return 1;

  GLuint program = glCreateProgram();
  GLuint vs = compile(GL_VERTEX_SHADER, VS), fs = compile(GL_FRAGMENT_SHADER, FS);
  glAttachShader(program, vs);
  glAttachShader(program, fs);
  glLinkProgram(program);
  glDeleteShader(vs);
  glDeleteShader(fs);

  float data[] = {
  //  x      y      r     g     b
     0.0f,  0.7f,  1.0f, 0.2f, 0.3f,
    -0.7f, -0.6f,  0.2f, 1.0f, 0.3f,
     0.7f, -0.6f,  0.2f, 0.4f, 1.0f,
  };
  GLuint vao, vbo;
  glGenVertexArrays(1, &vao);
  glBindVertexArray(vao);
  glGenBuffers(1, &vbo);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);
  glBufferData(GL_ARRAY_BUFFER, sizeof data, data, GL_STATIC_DRAW);
  glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 5 * sizeof(float), (void*)0);
  glEnableVertexAttribArray(0);
  glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 5 * sizeof(float), (void*)(2 * sizeof(float)));
  glEnableVertexAttribArray(1);

  while (!glfwWindowShouldClose(window)) {
    int w, h;
    glfwGetFramebufferSize(window, &w, &h);
    glViewport(0, 0, w, h);
    glClearColor(0.08f, 0.09f, 0.12f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);

    glUseProgram(program);
    glBindVertexArray(vao);
    glDrawArrays(GL_TRIANGLES, 0, 3);

    glfwSwapBuffers(window);
    glfwPollEvents();
  }

  glDeleteBuffers(1, &vbo);
  glDeleteVertexArrays(1, &vao);
  glDeleteProgram(program);
  glfwTerminate();
  return 0;
}`,
};
