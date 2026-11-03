# GL Trainer

An interactive course that teaches **graphics programming and OpenGL** by having you write real
GPU code. It runs in any modern browser and installs on your phone as an app.

Each lesson has:

- **Learn**: a short explanation with diagrams and code snippets
- **Code & preview**: live, editable JavaScript + GLSL running on WebGL2 (= OpenGL ES 3.0). It re-runs as you type, and shader compile errors highlight the broken line.
- **Challenges** with hints, to modify the code yourself
- **Quiz** to check your understanding (passing it marks the lesson complete)
- **Desktop OpenGL (C++)**: the same code written for GLFW + glad + GLM

## Lessons

| # | Lesson | Topics |
|---|--------|--------|
| 1 | The GPU & Clearing the Screen | GPUs, OpenGL flavours, state machine, framebuffer, viewport |
| 2 | Hello Triangle | the pipeline, buffers, VAOs, vertex/fragment shaders, programs |
| 3 | Attributes, Varyings & Interpolation | interleaved buffers, stride/offset, `in`/`out`, `flat` |
| 4 | Uniforms & Animation | uniforms, time, rotation in GLSL, aspect ratio |
| 5 | Painting with Maths | full-screen triangle, `gl_FragCoord`, SDFs, `smoothstep`, `mix` |
| 6 | Transformations & Index Buffers | 4×4 matrices, homogeneous coordinates, hierarchies, `drawElements` |
| 7 | Going 3D | Model-View-Projection, `lookAt`, perspective, depth test, culling |
| 8 | Textures & Sampling | UVs, `texImage2D`, filtering, mipmaps, wrapping, texture units |
| 9 | Lighting | normals, ambient/diffuse/specular, Blinn-Phong, normal matrix, gamma |
| 10 | Framebuffers & Post-Processing | FBOs, render-to-texture, edge detection, blur, chromatic aberration |
| 11 | Instancing | `drawElementsInstanced`, `vertexAttribDivisor`, `gl_InstanceID` |
| 12 | From WebGL to Desktop OpenGL | GLFW, glad, GLM, CMake, a full C++ program, next steps |

There's also a **Shader Playground** (a ray-marched scene you can edit) and a **Cheat Sheet**.

## Run it locally

You need [Node.js](https://nodejs.org) (any recent version) and [Git](https://git-scm.com).
There's no build step and nothing to `npm install` to run the app.

```bash
git clone -b ccr-7316eb64-8ixqsn https://github.com/Curtis1811/Graphic-training.git
cd Graphic-training
npm run serve          # starts a tiny Node server (scripts/serve.mjs)
# open http://localhost:8080
```

`npm run serve` must be run **inside the `Graphic-training` folder**, the one that contains
`package.json`. Running it anywhere else gives `ENOENT ... package.json`. Opening
`web/index.html` directly as a file won't work either, because browsers block ES modules on
`file://` URLs. Port busy? Use `set PORT=3000 && npm run serve` (cmd) or
`$env:PORT=3000; npm run serve` (PowerShell).

## Put it on your phone

### Option A: install as a web app (easiest)

1. Host the `web/` folder over HTTPS. The included GitHub Actions workflow
   (`.github/workflows/pages.yml`) deploys it to GitHub Pages on every push to `main`. Turn it on
   once under **Settings → Pages → Source: GitHub Actions**. The app will then be at
   `https://<user>.github.io/Graphic-training/`.
2. Open that URL on your phone:
   - **iPhone (Safari):** Share → **Add to Home Screen**
   - **Android (Chrome):** ⋮ → **Install app**

It opens full-screen like a native app and works offline. Progress and edited code are saved on
the device.

### Option B: Android APK, no Android Studio needed

```bash
./android-app/build-apk.sh        # -> dist/gl-trainer.apk
```

This builds a small native wrapper (`android-app/src/.../MainActivity.java`): a full-screen
WebView that serves `web/` from inside the APK. It needs only a JDK (17+), Python 3 and curl. The
Android API jar, `dx` and `apksig` are downloaded from Maven Central, and
`android-app/tools/make_apk.py` writes the binary manifest and resource table itself. The APK
targets Android 7.0+ and is signed with a key that is created in `~/.gl-trainer/release.p12` on
the first run. Keep that file: Android only installs updates signed with the same key.

To install it, copy the APK to your phone, open it, and allow "install unknown apps" for your
browser or file manager when asked.

### Option C: native Android / iOS app (Capacitor)

The repo is set up for [Capacitor](https://capacitorjs.com), which wraps `web/` in a native shell
that you can build and side-load or publish to the app stores.

```bash
npm install
npx cap add android      # needs Android Studio
npx cap add ios          # needs macOS + Xcode
npx cap sync             # copy web/ into the native projects (run after every change)
npx cap open android     # or: npx cap open ios, then press Run
```

## Tests

`tests/smoke.mjs` opens every lesson in headless Chromium. It fails if any shader or JavaScript
error appears, or if a canvas draws nothing.

```bash
npm install              # installs Playwright
npx playwright install chromium
npm run serve            # in another terminal
npm test
```

## Project layout

```
web/
  index.html, manifest.webmanifest, sw.js   app shell, PWA manifest, offline service worker
  css/style.css
  js/app.js        routing, lesson UI, quizzes, progress (localStorage)
  js/runner.js     runs lesson code on a fresh WebGL2 context, reports errors
  js/editor.js     dependency-free code editor with GLSL/JS/C++ highlighting
  js/helpers.js    `H` helpers given to lessons: shader compile, geometry, mat4
  js/mat4.js       tiny column-major matrix library
  js/lessons/      one file per lesson (content, starter code, challenges, quiz, C++)
```

### Adding a lesson

Create `web/js/lessons/NN-name.js` that exports
`{ id, title, summary, minutes, content, files, challenges, quiz, cpp }`. Register it in
`web/js/lessons/index.js` and add it to `ASSETS` in `web/sw.js`. Lesson code receives `gl`,
`canvas`, `shaders` (each non-JS file's text, by `key`) and `H`. It may return a
`frame(timeSeconds)` function that is called every animation frame.
