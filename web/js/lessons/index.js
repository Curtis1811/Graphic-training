import clear from './01-clear.js';
import triangle from './02-triangle.js';
import varyings from './03-varyings.js';
import uniforms from './04-uniforms.js';
import fragmentArt from './05-fragment-art.js';
import transforms from './06-transforms.js';
import going3d from './07-3d.js';
import textures from './08-textures.js';
import lighting from './09-lighting.js';
import framebuffers from './10-framebuffers.js';
import instancing from './11-instancing.js';
import desktop from './12-desktop.js';
import playground from './playground.js';

export const lessons = [
  clear, triangle, varyings, uniforms, fragmentArt, transforms,
  going3d, textures, lighting, framebuffers, instancing, desktop,
];

export const modules = [
  { title: 'Foundations', ids: ['clear', 'triangle', 'varyings', 'uniforms'] },
  { title: 'Shaders & Transforms', ids: ['fragment-art', 'transforms'] },
  { title: '3D Rendering', ids: ['going-3d', 'textures', 'lighting'] },
  { title: 'Advanced Techniques', ids: ['framebuffers', 'instancing'] },
  { title: 'Beyond the Browser', ids: ['desktop-opengl'] },
];

export { playground };

export const allLessons = [...lessons, playground];
