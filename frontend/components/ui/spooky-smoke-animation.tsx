"use client";

import React, { useEffect, useRef } from "react";

// ── Fragment Shader ──────────────────────────────────────────────────────────
const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);

  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);

  col.r-=fbm(uv+vec2(0,T*.015)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);

  col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));

  col=mix(vec3(.08),col,min(time*.1,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`;

const vertexShaderSource = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

// ── Renderer ─────────────────────────────────────────────────────────────────
class Renderer {
  private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private color: [number, number, number] = [0, 0.76, 1]; // #00C2FF
  private uniforms: {
    resolution: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    u_color: WebGLUniformLocation | null;
  } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
    this.setup();
    this.init();
  }

  updateColor(c: [number, number, number]) {
    this.color = c;
  }

  updateScale() {
    const dpr = Math.max(1, window.devicePixelRatio);
    this.canvas.width  = window.innerWidth  * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private compile(shader: WebGLShader, src: string) {
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error("Shader error:", this.gl.getShaderInfoLog(shader));
    }
  }

  private setup() {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER)!;
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    this.program = gl.createProgram()!;
    this.compile(this.vs, vertexShaderSource);
    this.compile(this.fs, fragmentShaderSource);
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error("Link error:", gl.getProgramInfoLog(this.program));
    }
  }

  private init() {
    const { gl, program } = this;
    if (!program) return;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    this.uniforms = {
      resolution: gl.getUniformLocation(program, "resolution"),
      time:       gl.getUniformLocation(program, "time"),
      u_color:    gl.getUniformLocation(program, "u_color"),
    };
  }

  render(now = 0) {
    const { gl, program, buffer, canvas } = this;
    if (!program || !gl.isProgram(program)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    if (!this.uniforms) return;
    gl.uniform2f(this.uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(this.uniforms.time,       now * 1e-3);
    gl.uniform3fv(this.uniforms.u_color,   this.color);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  reset() {
    const { gl, program, vs, fs } = this;
    if (!program) return;
    if (vs) { gl.detachShader(program, vs); gl.deleteShader(vs); }
    if (fs) { gl.detachShader(program, fs); gl.deleteShader(fs); }
    gl.deleteProgram(program);
    this.program = null;
    this.uniforms = null;
  }
}

// ── Utility ──────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : null;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface SmokeBackgroundProps {
  smokeColor?: string;
}

export const SmokeBackground: React.FC<SmokeBackgroundProps> = ({
  smokeColor = "#00C2FF",
}) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new Renderer(canvasRef.current);
    rendererRef.current = renderer;

    const onResize = () => renderer.updateScale();
    onResize();
    window.addEventListener("resize", onResize);

    let raf: number;
    const loop = (now: number) => {
      renderer.render(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      renderer.reset();
    };
  }, []);

  useEffect(() => {
    const rgb = hexToRgb(smokeColor);
    if (rgb && rendererRef.current) rendererRef.current.updateColor(rgb);
  }, [smokeColor]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};
