// Helpers passed to lesson code as `H`. Early lessons write everything by hand;
// later lessons use these so the interesting new code is not buried in boilerplate.
import { mat4, vec3 } from './mat4.js';

export class ShaderError extends Error {
  constructor(stage, log, source = '') {
    super(log);
    this.stage = stage; // 'vs' | 'fs' | 'link'
    this.log = log;
    this.source = source; // lets the UI find which file the error belongs to
  }
}

export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
    gl.deleteShader(shader);
    throw new ShaderError(type === gl.VERTEX_SHADER ? 'vs' : 'fs', log, source);
  }
  return shader;
}

// Wrap a compile log so the editor can jump to the broken line.
// 0x8B31 is the value of gl.VERTEX_SHADER.
export function compileError(type, log) {
  return new ShaderError(type === 0x8B31 ? 'vs' : 'fs', log || 'Unknown shader compile error');
}

export function createProgram(gl, vsSource, fsSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Shaders can be deleted once linked; the program keeps what it needs.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new ShaderError('link', gl.getProgramInfoLog(program) || 'Unknown link error');
  }
  return program;
}

// Upload a Float32Array into a new buffer and point attribute `location` at it.
export function attribute(gl, location, data, size) {
  if (location < 0) return null; // attribute unused (optimised away) in the shader
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data instanceof Float32Array ? data : new Float32Array(data), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  return buf;
}

export function indexBuffer(gl, indices) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return buf;
}

// ---------- Geometry generators ----------

// Unit cube centred on the origin: 24 vertices (4 per face so each face has
// its own normal, UVs and colour) and 36 indices (2 triangles per face).
export function cube() {
  const faces = [
    // normal,      u axis,      v axis,     colour
    [[0, 0, 1], [1, 0, 0], [0, 1, 0], [0.95, 0.35, 0.35]],   // front  (+z)
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0], [0.35, 0.85, 0.45]], // back   (-z)
    [[1, 0, 0], [0, 0, -1], [0, 1, 0], [0.35, 0.55, 0.95]],  // right  (+x)
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0], [0.95, 0.8, 0.3]],    // left   (-x)
    [[0, 1, 0], [1, 0, 0], [0, 0, -1], [0.8, 0.4, 0.9]],     // top    (+y)
    [[0, -1, 0], [1, 0, 0], [0, 0, 1], [0.3, 0.85, 0.85]],   // bottom (-y)
  ];
  const positions = [], normals = [], uvs = [], colors = [], indices = [];
  faces.forEach(([n, u, v, col], f) => {
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      positions.push(
        0.5 * (n[0] + su * u[0] + sv * v[0]),
        0.5 * (n[1] + su * u[1] + sv * v[1]),
        0.5 * (n[2] + su * u[2] + sv * v[2]),
      );
      normals.push(...n);
      uvs.push((su + 1) / 2, (sv + 1) / 2);
      colors.push(...col);
    }
    const o = f * 4;
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    indices: new Uint16Array(indices),
  };
}

// UV sphere of radius 1. For a unit sphere the normal equals the position.
export function sphere(latBands = 32, lonBands = 48) {
  const positions = [], normals = [], uvs = [], indices = [];
  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const st = Math.sin(theta), ct = Math.cos(theta);
    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const x = Math.cos(phi) * st, y = ct, z = Math.sin(phi) * st;
      positions.push(x, y, z);
      normals.push(x, y, z);
      uvs.push(lon / lonBands, 1 - lat / latBands);
    }
  }
  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const a = lat * (lonBands + 1) + lon, b = a + lonBands + 1;
      // Counter-clockwise when seen from outside, so back-face culling works.
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

// Flat plane on the XZ axis, size 1, facing up.
export function plane() {
  return {
    positions: new Float32Array([-0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5]),
    normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
  };
}

export const radians = (deg) => (deg * Math.PI) / 180;

export function makeHelpers({ log, mouse }) {
  return {
    createShader, createProgram, compileError, attribute, indexBuffer,
    cube, sphere, plane, radians, mat4, vec3,
    log, mouse,
  };
}
