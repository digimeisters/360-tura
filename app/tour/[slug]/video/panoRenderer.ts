/**
 * Mali WebGL2 prikaz equirectangular panorame za video: isti pogled kao
 * Pannellum (yaw/pitch/hfov u stepenima, yaw 0 = sredina slike, pozitivan
 * desno), ali kadar crtamo MI, tačno za zadato vreme - pa je video glatko
 * isti na svakom računaru (ne snima se ekran u realnom vremenu).
 *
 * Mipmape su obavezne: na 1080 px širine se panorama od 6000 px smanjuje
 * ~1,5x, a bez njih bi ivice treperile dok kamera klizi.
 */

const VERTEX = `#version 300 es
in vec2 pos;
out vec2 uv;
void main() { uv = pos; gl_Position = vec4(pos, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D tex;
uniform float yaw;
uniform float pitch;
uniform float halfTan;
uniform float aspect;
uniform float alpha;
const float PI = 3.14159265358979;
void main() {
  vec3 d = normalize(vec3(uv.x * halfTan, uv.y * halfTan / aspect, 1.0));
  float cp = cos(pitch), sp = sin(pitch);
  d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
  float lon = atan(d.x, d.z);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  vec2 st = vec2(0.5 + lon / (2.0 * PI), 0.5 - lat / PI);
  // Na šavu (lon = ±180°) st.x skoči sa 1 na 0; bez ove ispravke bi GPU tu
  // uzeo najmanju mipmapu i nacrtao tanku mutnu liniju.
  vec2 dx = dFdx(st), dy = dFdy(st);
  dx.x -= round(dx.x);
  dy.x -= round(dy.x);
  color = vec4(textureGrad(tex, st, dx, dy).rgb, alpha);
}`;

/** Najveća širina teksture - veće panorame se pri učitavanju smanje. */
const MAX_TEXTURE_WIDTH = 8192;

export type PanoView = { yaw: number; pitch: number; hfov: number; alpha: number };

export class PanoRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private textures = new Map<string, WebGLTexture>();
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const gl = this.canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('Ovaj pregledač ne podržava WebGL2 - video se pravi u Chrome-u na računaru.');
    this.gl = gl;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader');
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'program');
    this.program = program;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    for (const name of ['tex', 'yaw', 'pitch', 'halfTan', 'aspect', 'alpha']) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    gl.uniform1i(this.uniforms.tex, 0);
    gl.uniform1f(this.uniforms.aspect, width / height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** Skida panoramu (CORS, kao i tura) i pravi teksturu sa mipmapama. */
  async load(url: string): Promise<void> {
    if (this.textures.has(url)) return;
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`Panorama nije stigla (${response.status}): ${url}`);
    let bitmap = await createImageBitmap(await response.blob());
    if (bitmap.width > MAX_TEXTURE_WIDTH) {
      const scaled = await createImageBitmap(bitmap, {
        resizeWidth: MAX_TEXTURE_WIDTH,
        resizeHeight: Math.round((bitmap.height * MAX_TEXTURE_WIDTH) / bitmap.width),
        resizeQuality: 'high'
      });
      bitmap.close();
      bitmap = scaled;
    }
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Levo-desno se panorama nastavlja sama na sebe (šav iza leđa).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    bitmap.close();
    this.textures.set(url, texture);
  }

  /** Crta slojeve redom (donji prvi); svaki sa svojom providnošću - za pretapanje. */
  render(layers: { url: string; view: PanoView }[]): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.06, 0.08, 0.13, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const { url, view } of layers) {
      const texture = this.textures.get(url);
      if (!texture || view.alpha <= 0) continue;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1f(this.uniforms.yaw, (view.yaw * Math.PI) / 180);
      gl.uniform1f(this.uniforms.pitch, (view.pitch * Math.PI) / 180);
      gl.uniform1f(this.uniforms.halfTan, Math.tan((view.hfov * Math.PI) / 360));
      gl.uniform1f(this.uniforms.alpha, Math.min(1, view.alpha));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  dispose(): void {
    for (const texture of this.textures.values()) this.gl.deleteTexture(texture);
    this.textures.clear();
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
