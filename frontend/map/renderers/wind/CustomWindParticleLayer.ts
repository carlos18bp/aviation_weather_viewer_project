import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl';

import type { WindField } from '@/features/weather/wind';

import { interleaveWindComponents } from './WindFieldSampler';
import {
  createProgram,
  requireBuffer,
  requireTexture,
  requireTransformFeedback,
  requireUniform,
  requireVertexArray,
} from './gl/glUtils';
import {
  DRAW_FRAGMENT_SHADER,
  DRAW_VERTEX_SHADER,
  UPDATE_FRAGMENT_SHADER,
  UPDATE_VERTEX_SHADER,
} from './gl/shaders';

export const WIND_PARTICLE_LAYER_ID = 'wind-particle-webgl2-layer';

const PARTICLE_COUNT = 2_500;
const PARTICLE_MAX_AGE = 100;
const VISUAL_SPEED_FACTOR = 12_000;
const MAPLIBRE_TILE_SIZE = 512;
const DEFAULT_FRAME_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = 0.05;

interface UpdateUniforms {
  wind: WebGLUniformLocation;
  gridSize: WebGLUniformLocation;
  bbox: WebGLUniformLocation;
  deltaSeconds: WebGLUniformLocation;
  frameSeed: WebGLUniformLocation;
  maxAge: WebGLUniformLocation;
  speedFactor: WebGLUniformLocation;
}

interface DrawUniforms {
  matrix: WebGLUniformLocation;
  worldSize: WebGLUniformLocation;
  wind: WebGLUniformLocation;
  gridSize: WebGLUniformLocation;
  bbox: WebGLUniformLocation;
}

function deterministicValue(index: number, salt: number): number {
  const value = Math.sin((index + 1) * (12.9898 + salt * 17.719)) * 43_758.5453;
  return value - Math.floor(value);
}

function initialParticleState(): { positions: Float32Array; ages: Float32Array } {
  const positions = new Float32Array(PARTICLE_COUNT * 2);
  const ages = new Float32Array(PARTICLE_COUNT);

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    positions[index * 2] = deterministicValue(index, 0.37);
    positions[index * 2 + 1] = deterministicValue(index, 0.83);
    ages[index] = (index * 37) % PARTICLE_MAX_AGE;
  }

  return { positions, ages };
}

export class CustomWindParticleLayer implements CustomLayerInterface {
  readonly id = WIND_PARTICLE_LAYER_ID;
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private readonly onRuntimeError: (error: unknown) => void;
  private map: MapLibreMap | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private field: WindField | null = null;
  private active = false;
  private failureReported = false;
  private lastFrameTime: number | null = null;
  private frameSeed = 0;
  private currentBufferIndex = 0;
  private updateProgram: WebGLProgram | null = null;
  private drawProgram: WebGLProgram | null = null;
  private windTexture: WebGLTexture | null = null;
  private endpointBuffer: WebGLBuffer | null = null;
  private positionBuffers: WebGLBuffer[] = [];
  private ageBuffers: WebGLBuffer[] = [];
  private updateVertexArrays: WebGLVertexArrayObject[] = [];
  private drawVertexArray: WebGLVertexArrayObject | null = null;
  private transformFeedbacks: WebGLTransformFeedback[] = [];
  private updateUniforms: UpdateUniforms | null = null;
  private drawUniforms: DrawUniforms | null = null;

  constructor(onRuntimeError: (error: unknown) => void) {
    this.onRuntimeError = onRuntimeError;
  }

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext): void {
    this.map = map;
    this.gl = gl;
    this.failureReported = false;

    try {
      this.initializeResources(gl);
      if (this.field) {
        this.uploadField(this.field);
      }
    } catch (error) {
      this.disposeResources();
      throw error;
    }
  }

  onRemove(): void {
    this.active = false;
    this.lastFrameTime = null;
    this.disposeResources();
    this.map = null;
    this.gl = null;
  }

  render(gl: WebGL2RenderingContext, options: CustomRenderMethodInput): void {
    if (!this.active || !this.field || !this.windTexture || !this.updateProgram || !this.drawProgram) {
      return;
    }

    try {
      const now = typeof performance === 'undefined' ? Date.now() : performance.now();
      const deltaSeconds = this.lastFrameTime === null
        ? DEFAULT_FRAME_SECONDS
        : Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - this.lastFrameTime) / 1_000));
      this.lastFrameTime = now;
      const previousIndex = this.currentBufferIndex;
      const currentIndex = 1 - previousIndex;

      this.updateParticles(gl, previousIndex, currentIndex, deltaSeconds);
      this.currentBufferIndex = currentIndex;
      this.drawParticles(gl, previousIndex, currentIndex, options);
      this.frameSeed += 1;
    } catch (error) {
      this.active = false;
      this.reportRuntimeError(error);
    }
  }

  setField(field: WindField): void {
    this.field = field;

    if (this.gl && this.windTexture) {
      this.uploadField(field);
    }
  }

  setActive(active: boolean): void {
    this.active = active;
    this.lastFrameTime = null;
  }

  resize(): void {
    this.lastFrameTime = null;
  }

  private initializeResources(gl: WebGL2RenderingContext): void {
    this.updateProgram = createProgram(
      gl,
      UPDATE_VERTEX_SHADER,
      UPDATE_FRAGMENT_SHADER,
      ['v_position', 'v_age'],
    );
    this.drawProgram = createProgram(gl, DRAW_VERTEX_SHADER, DRAW_FRAGMENT_SHADER);
    this.windTexture = requireTexture(gl);
    this.endpointBuffer = requireBuffer(gl);
    this.drawVertexArray = requireVertexArray(gl);
    this.updateUniforms = {
      wind: requireUniform(gl, this.updateProgram, 'u_wind'),
      gridSize: requireUniform(gl, this.updateProgram, 'u_grid_size'),
      bbox: requireUniform(gl, this.updateProgram, 'u_bbox'),
      deltaSeconds: requireUniform(gl, this.updateProgram, 'u_delta_seconds'),
      frameSeed: requireUniform(gl, this.updateProgram, 'u_frame_seed'),
      maxAge: requireUniform(gl, this.updateProgram, 'u_max_age'),
      speedFactor: requireUniform(gl, this.updateProgram, 'u_speed_factor'),
    };
    this.drawUniforms = {
      matrix: requireUniform(gl, this.drawProgram, 'u_matrix'),
      worldSize: requireUniform(gl, this.drawProgram, 'u_world_size'),
      wind: requireUniform(gl, this.drawProgram, 'u_wind'),
      gridSize: requireUniform(gl, this.drawProgram, 'u_grid_size'),
      bbox: requireUniform(gl, this.drawProgram, 'u_bbox'),
    };

    gl.bindTexture(gl.TEXTURE_2D, this.windTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const { positions, ages } = initialParticleState();

    for (let index = 0; index < 2; index += 1) {
      const positionBuffer = requireBuffer(gl);
      const ageBuffer = requireBuffer(gl);
      const updateVertexArray = requireVertexArray(gl);
      const transformFeedback = requireTransformFeedback(gl);

      this.positionBuffers.push(positionBuffer);
      this.ageBuffers.push(ageBuffer);
      this.updateVertexArrays.push(updateVertexArray);
      this.transformFeedbacks.push(transformFeedback);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_COPY);
      gl.bindBuffer(gl.ARRAY_BUFFER, ageBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, ages, gl.DYNAMIC_COPY);

      gl.bindVertexArray(updateVertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, ageBuffer);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffer);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, ageBuffer);
    }

    gl.bindVertexArray(this.drawVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.endpointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private uploadField(field: WindField): void {
    const gl = this.gl;

    if (!gl || !this.windTexture) {
      return;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.windTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RG32F,
      field.width,
      field.height,
      0,
      gl.RG,
      gl.FLOAT,
      interleaveWindComponents(field),
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.resetParticles(gl);
  }

  private resetParticles(gl: WebGL2RenderingContext): void {
    const { positions, ages } = initialParticleState();

    for (let index = 0; index < this.positionBuffers.length; index += 1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffers[index]);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_COPY);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.ageBuffers[index]);
      gl.bufferData(gl.ARRAY_BUFFER, ages, gl.DYNAMIC_COPY);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.currentBufferIndex = 0;
    this.frameSeed = 0;
    this.lastFrameTime = null;
  }

  private updateParticles(
    gl: WebGL2RenderingContext,
    inputIndex: number,
    outputIndex: number,
    deltaSeconds: number,
  ): void {
    const field = this.field;
    const uniforms = this.updateUniforms;

    if (!field || !uniforms || !this.updateProgram || !this.windTexture) {
      return;
    }

    gl.useProgram(this.updateProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.windTexture);
    gl.uniform1i(uniforms.wind, 0);
    gl.uniform2i(uniforms.gridSize, field.width, field.height);
    gl.uniform4f(uniforms.bbox, ...field.bbox);
    gl.uniform1f(uniforms.deltaSeconds, deltaSeconds);
    gl.uniform1f(uniforms.frameSeed, this.frameSeed);
    gl.uniform1f(uniforms.maxAge, PARTICLE_MAX_AGE);
    gl.uniform1f(uniforms.speedFactor, VISUAL_SPEED_FACTOR);
    gl.bindVertexArray(this.updateVertexArrays[inputIndex]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedbacks[outputIndex]);
    let transformFeedbackStarted = false;

    try {
      gl.enable(gl.RASTERIZER_DISCARD);
      gl.beginTransformFeedback(gl.POINTS);
      transformFeedbackStarted = true;
      gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    } finally {
      if (transformFeedbackStarted) {
        gl.endTransformFeedback();
      }
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindVertexArray(null);
    }
  }

  private drawParticles(
    gl: WebGL2RenderingContext,
    previousIndex: number,
    currentIndex: number,
    options: CustomRenderMethodInput,
  ): void {
    const field = this.field;
    const uniforms = this.drawUniforms;

    if (!field || !uniforms || !this.drawProgram || !this.drawVertexArray || !this.windTexture) {
      return;
    }

    gl.useProgram(this.drawProgram);
    gl.uniformMatrix4fv(
      uniforms.matrix,
      false,
      options.modelViewProjectionMatrix as unknown as Float32List,
    );
    gl.uniform1f(
      uniforms.worldSize,
      MAPLIBRE_TILE_SIZE * 2 ** (this.map?.getZoom() ?? 0),
    );
    gl.uniform2i(uniforms.gridSize, field.width, field.height);
    gl.uniform4f(uniforms.bbox, ...field.bbox);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.windTexture);
    gl.uniform1i(uniforms.wind, 0);
    gl.bindVertexArray(this.drawVertexArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffers[previousIndex]);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffers[currentIndex]);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ageBuffers[currentIndex]);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(3, 1);

    gl.drawArraysInstanced(gl.LINES, 0, 2, PARTICLE_COUNT);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
  }

  private reportRuntimeError(error: unknown): void {
    if (this.failureReported) {
      return;
    }

    this.failureReported = true;
    queueMicrotask(() => this.onRuntimeError(error));
  }

  private disposeResources(): void {
    const gl = this.gl;

    if (!gl) {
      return;
    }

    this.transformFeedbacks.forEach((resource) => gl.deleteTransformFeedback(resource));
    this.updateVertexArrays.forEach((resource) => gl.deleteVertexArray(resource));
    this.positionBuffers.forEach((resource) => gl.deleteBuffer(resource));
    this.ageBuffers.forEach((resource) => gl.deleteBuffer(resource));

    if (this.drawVertexArray) {
      gl.deleteVertexArray(this.drawVertexArray);
    }
    if (this.endpointBuffer) {
      gl.deleteBuffer(this.endpointBuffer);
    }
    if (this.windTexture) {
      gl.deleteTexture(this.windTexture);
    }
    if (this.updateProgram) {
      gl.deleteProgram(this.updateProgram);
    }
    if (this.drawProgram) {
      gl.deleteProgram(this.drawProgram);
    }

    this.transformFeedbacks = [];
    this.updateVertexArrays = [];
    this.positionBuffers = [];
    this.ageBuffers = [];
    this.drawVertexArray = null;
    this.endpointBuffer = null;
    this.windTexture = null;
    this.updateProgram = null;
    this.drawProgram = null;
    this.updateUniforms = null;
    this.drawUniforms = null;
  }
}
