export const reference = `
<h2>Cheat sheet</h2>
<p class="lead">A quick reference for the things you'll look up most often.</p>

<h3>The pipeline</h3>
<div class="pipeline">
  <span>Vertex buffers</span><span class="prog">Vertex shader</span><span>Primitive assembly</span>
  <span>Rasterisation</span><span class="prog">Fragment shader</span><span>Depth / blend</span><span>Framebuffer</span>
</div>

<h3>Setup checklist (every WebGL / OpenGL program)</h3>
<ol>
  <li>Compile the vertex + fragment shaders and link a <b>program</b></li>
  <li>Create a <b>VAO</b> and bind it</li>
  <li>Create <b>buffers</b>, upload the data, and set <code>vertexAttribPointer</code> + <code>enableVertexAttribArray</code></li>
  <li>(Optional) an index buffer, textures, framebuffers</li>
  <li>Each frame: <code>viewport</code> → <code>clear</code> → <code>useProgram</code> → set uniforms → <code>bindVertexArray</code> → <code>draw*</code></li>
</ol>

<h3>GLSL types</h3>
<div class="table-wrap"><table>
  <tr><th>Type</th><th>Meaning</th></tr>
  <tr><td><code>float int uint bool</code></td><td>Scalars. Write floats with a dot: <code>1.0</code>, not <code>1</code></td></tr>
  <tr><td><code>vec2 vec3 vec4</code></td><td>Float vectors. Use <code>.xyzw</code>, <code>.rgba</code> or <code>.stpq</code></td></tr>
  <tr><td><code>ivec*, uvec*, bvec*</code></td><td>Integer / unsigned / bool vectors</td></tr>
  <tr><td><code>mat2 mat3 mat4</code></td><td>Column-major matrices. <code>m[0]</code> is the first column</td></tr>
  <tr><td><code>sampler2D samplerCube</code></td><td>Texture handles (set to a texture unit with <code>uniform1i</code>)</td></tr>
</table></div>
<p><b>Swizzling:</b> <code>v.xy</code>, <code>v.zyx</code>, <code>v.rrr</code>, <code>vec4(v.xyz, 1.0)</code>.</p>

<h3>GLSL qualifiers</h3>
<div class="table-wrap"><table>
  <tr><td><code>in</code> (vertex)</td><td>Attribute from a vertex buffer</td></tr>
  <tr><td><code>out</code> (vertex) → <code>in</code> (fragment)</td><td>Interpolated value passed between stages</td></tr>
  <tr><td><code>out</code> (fragment)</td><td>Colour written to the framebuffer</td></tr>
  <tr><td><code>uniform</code></td><td>Constant for the whole draw call, set from the CPU</td></tr>
  <tr><td><code>flat</code></td><td>Turn interpolation off</td></tr>
  <tr><td><code>layout(location = N)</code></td><td>Fix an attribute or output location</td></tr>
</table></div>

<h3>Built-in variables</h3>
<div class="table-wrap"><table>
  <tr><td><code>gl_Position</code></td><td>vec4, vertex output in clip space (required)</td></tr>
  <tr><td><code>gl_PointSize</code></td><td>Point size in pixels when drawing <code>POINTS</code></td></tr>
  <tr><td><code>gl_VertexID / gl_InstanceID</code></td><td>Index of the current vertex / instance</td></tr>
  <tr><td><code>gl_FragCoord</code></td><td>Fragment position in pixels (origin bottom-left); <code>.z</code> = depth</td></tr>
  <tr><td><code>gl_FrontFacing</code></td><td>true if the triangle faces the camera</td></tr>
</table></div>

<h3>Useful GLSL functions</h3>
<div class="table-wrap"><table>
  <tr><td><code>mix(a, b, t)</code></td><td>Linear interpolation</td></tr>
  <tr><td><code>clamp(x, lo, hi)</code></td><td>Limit to a range</td></tr>
  <tr><td><code>step(edge, x)</code></td><td>0.0 below edge, 1.0 above</td></tr>
  <tr><td><code>smoothstep(e0, e1, x)</code></td><td>Smooth Hermite ramp from 0 to 1</td></tr>
  <tr><td><code>fract(x), floor(x), mod(x, y)</code></td><td>Repetition and patterns</td></tr>
  <tr><td><code>length, distance, dot, cross, normalize</code></td><td>Vector maths</td></tr>
  <tr><td><code>reflect(I, N), refract(I, N, eta)</code></td><td>Reflection / refraction directions</td></tr>
  <tr><td><code>texture(sampler, uv)</code></td><td>Sample a texture</td></tr>
  <tr><td><code>texelFetch(sampler, ivec2, lod)</code></td><td>Read one exact texel, no filtering</td></tr>
</table></div>

<h3>Draw calls</h3>
<div class="table-wrap"><table>
  <tr><td><code>drawArrays(mode, first, count)</code></td><td>Consecutive vertices</td></tr>
  <tr><td><code>drawElements(mode, count, type, offset)</code></td><td>Using an index buffer</td></tr>
  <tr><td><code>drawArraysInstanced / drawElementsInstanced</code></td><td>Many copies in one call</td></tr>
  <tr><td>Modes</td><td><code>POINTS LINES LINE_STRIP LINE_LOOP TRIANGLES TRIANGLE_STRIP TRIANGLE_FAN</code></td></tr>
</table></div>

<h3>Common state</h3>
<div class="table-wrap"><table>
  <tr><td><code>enable(DEPTH_TEST)</code></td><td>Hide surfaces behind others</td></tr>
  <tr><td><code>enable(CULL_FACE)</code> + <code>cullFace(BACK)</code></td><td>Skip back-facing triangles</td></tr>
  <tr><td><code>enable(BLEND)</code> + <code>blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)</code></td><td>Transparency</td></tr>
  <tr><td><code>enable(SCISSOR_TEST)</code> + <code>scissor(x, y, w, h)</code></td><td>Limit drawing to a rectangle</td></tr>
  <tr><td><code>depthMask(false)</code></td><td>Test depth but don't write it (for transparent objects)</td></tr>
</table></div>

<h3>Coordinate spaces</h3>
<p><b>Object</b> → (model) → <b>World</b> → (view) → <b>View/Eye</b> → (projection) → <b>Clip</b>
→ (÷ w) → <b>NDC</b> (−1..1) → (viewport) → <b>Window / pixels</b></p>

<h3>Debugging checklist: "I see nothing!"</h3>
<ul>
  <li>Check the console for shader compile and link errors.</li>
  <li>Did you call <code>useProgram</code> before setting uniforms?</li>
  <li>Is the VAO bound when you set up attributes <i>and</i> when you draw?</li>
  <li>Is <code>getAttribLocation</code> returning −1? (The attribute is unused or misspelled.)</li>
  <li>Is the geometry inside the near/far planes, and is the camera facing it?</li>
  <li>Try disabling <code>CULL_FACE</code>. Your winding order may be backwards.</li>
  <li>Output a solid colour from the fragment shader to check that geometry is drawn at all.</li>
  <li>Clearing <code>DEPTH_BUFFER_BIT</code> every frame?</li>
</ul>
`;
