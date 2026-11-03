export default {
  id: 'clear',
  title: 'The GPU & Clearing the Screen',
  summary: 'What a GPU does, what OpenGL is, and your first line of graphics code.',
  minutes: 8,
  content: `
<p>Graphics programming is the art of telling a <b>GPU</b> (graphics processing unit) how to turn
numbers into pixels. A CPU has a few very fast cores that do one complicated thing after another. A
GPU has <i>thousands</i> of small cores that run the same small program on many pieces of data at
once, such as every vertex of a model or every pixel on the screen.</p>

<h3>What is OpenGL?</h3>
<p><b>OpenGL</b> is an API: a list of functions your program calls to talk to the graphics driver.
It has been the cross-platform graphics standard since 1992. It comes in a few flavours:</p>
<ul>
  <li><b>OpenGL 3.3+ / 4.x "core profile"</b>: desktop (Windows, Linux, older macOS).</li>
  <li><b>OpenGL ES 3.0</b>: phones, tablets and embedded devices ("ES" = Embedded Systems).</li>
  <li><b>WebGL2</b>: OpenGL ES 3.0 exposed to JavaScript in the browser. <i>This is what you'll write in this app.</i></li>
</ul>
<p>The functions are almost identical. <code>glClearColor(...)</code> in C becomes
<code>gl.clearColor(...)</code> in JavaScript. Everything you learn here carries over to C/C++
OpenGL, and every lesson ends with the desktop C++ version.</p>

<h3>OpenGL is a state machine</h3>
<p>Most OpenGL calls don't draw anything. They <i>change a setting</i> that later calls use. For
example, <code>gl.clearColor(r, g, b, a)</code> only <i>remembers</i> a colour. Then
<code>gl.clear(gl.COLOR_BUFFER_BIT)</code> uses the remembered colour to fill the screen.
Get used to this "set state, then act" pattern.</p>

<h3>Framebuffers and colours</h3>
<p>You draw into a <b>framebuffer</b>: a grid of pixels with a <i>colour buffer</i> (and later a
<i>depth buffer</i>). Colours are four floats, <b>red, green, blue, alpha</b>, each from
<code>0.0</code> to <code>1.0</code>. So <code>(1, 0, 0, 1)</code> is opaque red and
<code>(0.5, 0.5, 0.5, 1)</code> is mid grey.</p>

<h3>The viewport</h3>
<p><code>gl.viewport(x, y, width, height)</code> says which rectangle of the framebuffer you're
drawing into. Normally that's the whole canvas. The app resizes the canvas for you to match the
screen's pixel density.</p>

<div class="note"><b>How the code panel works:</b> your <code>main.js</code> runs once with a
<code>gl</code> context and a <code>canvas</code>. If it <code>return</code>s a function, that
function is called every frame (about 60 per second) with the time in seconds. Edit the code and
the preview re-runs automatically. You can also press <kbd>Ctrl</kbd>+<kbd>Enter</kbd>.</div>
`,
  files: [
    {
      key: 'js',
      name: 'main.js',
      lang: 'js',
      code: `// Lesson 1: the simplest possible OpenGL program.
// 'gl' is a WebGL2 rendering context: your handle to the GPU.

// Returning a function makes it run every frame.
return function frame(time) {
  // Draw into the whole canvas.
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Choose a colour: red, green, blue, alpha (each 0.0 to 1.0).
  // Math.sin makes the red channel pulse over time.
  const red = 0.5 + 0.5 * Math.sin(time);
  gl.clearColor(red, 0.2, 0.4, 1.0);

  // Fill the colour buffer with the clear colour.
  gl.clear(gl.COLOR_BUFFER_BIT);
};
`,
    },
  ],
  challenges: [
    {
      task: 'Make the green and blue channels animate too, each at a different speed.',
      hint: 'Try <code>0.5 + 0.5 * Math.sin(time * 1.7)</code> for green and <code>Math.cos(time * 0.6)</code> for blue.',
    },
    {
      task: 'Clear only a rectangle in the middle of the screen to a different colour.',
      hint: 'After the first clear: <code>gl.enable(gl.SCISSOR_TEST); gl.scissor(x, y, w, h);</code>, set a new clear colour, call <code>gl.clear</code> again, then <code>gl.disable(gl.SCISSOR_TEST)</code>. Use <code>canvas.width / 4</code> etc. for the rectangle.',
    },
    {
      task: 'Use <code>H.log(canvas.width, canvas.height)</code> once (outside the frame function) to print the drawing-buffer size.',
      hint: '<code>H.log</code> prints to the console panel under the editor.',
    },
  ],
  quiz: [
    {
      q: 'What does <code>gl.clearColor(0, 0, 1, 1)</code> do on its own?',
      options: ['Paints the screen blue immediately', 'Stores blue as the colour used by the next gl.clear', 'Draws a blue triangle', 'Nothing; it is invalid'],
      answer: 1,
      explain: 'OpenGL is a state machine: clearColor only sets state. gl.clear(gl.COLOR_BUFFER_BIT) does the actual clearing.',
    },
    {
      q: 'WebGL2 is based on which OpenGL version?',
      options: ['OpenGL 1.1', 'OpenGL 4.6', 'OpenGL ES 3.0', 'Vulkan'],
      answer: 2,
      explain: 'WebGL2 maps almost one-to-one onto OpenGL ES 3.0, the mobile flavour of OpenGL.',
    },
    {
      q: 'Why are GPUs fast at graphics?',
      options: ['They have a higher clock speed than CPUs', 'They run the same small program on thousands of vertices/pixels in parallel', 'They skip floating-point maths', 'They store the whole screen in the CPU cache'],
      answer: 1,
      explain: 'GPUs are massively parallel. Shaders run on huge numbers of vertices and pixels at the same time.',
    },
  ],
  cpp: `// Desktop OpenGL 3.3 core with GLFW (window) + glad (function loader)
#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <cmath>

int main() {
  glfwInit();
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  GLFWwindow* window = glfwCreateWindow(800, 600, "Clear", nullptr, nullptr);
  glfwMakeContextCurrent(window);
  gladLoadGLLoader((GLADloadproc)glfwGetProcAddress);

  while (!glfwWindowShouldClose(window)) {
    int w, h;
    glfwGetFramebufferSize(window, &w, &h);
    glViewport(0, 0, w, h);

    float red = 0.5f + 0.5f * std::sin((float)glfwGetTime());
    glClearColor(red, 0.2f, 0.4f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);

    glfwSwapBuffers(window);  // the browser does this for you
    glfwPollEvents();
  }
  glfwTerminate();
}`,
};
