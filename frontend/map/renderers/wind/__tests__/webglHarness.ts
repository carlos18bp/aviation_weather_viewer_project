interface FakeResource {
  kind: string;
  id: number;
}

export interface FakeWindWebGlHarness {
  gl: WebGL2RenderingContext;
  createdBuffers: WebGLBuffer[];
  createBuffer: jest.Mock<WebGLBuffer | null, []>;
  bufferData: jest.Mock;
  deleteBuffer: jest.Mock;
  texImage2D: jest.Mock;
  drawArrays: jest.Mock;
  drawArraysInstanced: jest.Mock;
  failBufferAllocationAfter(additionalCalls: number): void;
}

export function createFakeWindWebGl(): FakeWindWebGlHarness {
  let resourceId = 0;
  let failedBufferCall: number | null = null;
  const resource = (kind: string): FakeResource => ({ kind, id: ++resourceId });
  const createdBuffers: WebGLBuffer[] = [];
  const createBuffer = jest.fn<WebGLBuffer | null, []>(() => {
    if (failedBufferCall === createBuffer.mock.calls.length) {
      return null;
    }
    const buffer = resource('buffer') as unknown as WebGLBuffer;
    createdBuffers.push(buffer);
    return buffer;
  });
  const bufferData = jest.fn();
  const deleteBuffer = jest.fn();
  const texImage2D = jest.fn();
  const drawArrays = jest.fn();
  const drawArraysInstanced = jest.fn();

  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    SEPARATE_ATTRIBS: 5,
    TEXTURE_2D: 6,
    TEXTURE_MIN_FILTER: 7,
    TEXTURE_MAG_FILTER: 8,
    TEXTURE_WRAP_S: 9,
    TEXTURE_WRAP_T: 10,
    NEAREST: 11,
    CLAMP_TO_EDGE: 12,
    ARRAY_BUFFER: 13,
    DYNAMIC_COPY: 14,
    STATIC_DRAW: 15,
    FLOAT: 16,
    TRANSFORM_FEEDBACK: 17,
    TRANSFORM_FEEDBACK_BUFFER: 18,
    RG32F: 19,
    RG: 20,
    TEXTURE0: 21,
    RASTERIZER_DISCARD: 22,
    POINTS: 23,
    LINES: 24,
    createShader: jest.fn(() => resource('shader') as unknown as WebGLShader),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => ''),
    deleteShader: jest.fn(),
    createProgram: jest.fn(() => resource('program') as unknown as WebGLProgram),
    attachShader: jest.fn(),
    transformFeedbackVaryings: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => ''),
    deleteProgram: jest.fn(),
    createTexture: jest.fn(() => resource('texture') as unknown as WebGLTexture),
    deleteTexture: jest.fn(),
    createBuffer,
    deleteBuffer,
    createVertexArray: jest.fn(
      () => resource('vertex-array') as unknown as WebGLVertexArrayObject,
    ),
    deleteVertexArray: jest.fn(),
    createTransformFeedback: jest.fn(
      () => resource('transform-feedback') as unknown as WebGLTransformFeedback,
    ),
    deleteTransformFeedback: jest.fn(),
    getUniformLocation: jest.fn(
      () => resource('uniform') as unknown as WebGLUniformLocation,
    ),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData,
    bindVertexArray: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    vertexAttribDivisor: jest.fn(),
    bindTransformFeedback: jest.fn(),
    bindBufferBase: jest.fn(),
    texImage2D,
    useProgram: jest.fn(),
    activeTexture: jest.fn(),
    uniform1i: jest.fn(),
    uniform2i: jest.fn(),
    uniform4f: jest.fn(),
    uniform1f: jest.fn(),
    uniformMatrix4fv: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    beginTransformFeedback: jest.fn(),
    endTransformFeedback: jest.fn(),
    drawArrays,
    drawArraysInstanced,
  } as unknown as WebGL2RenderingContext;

  return {
    gl,
    createdBuffers,
    createBuffer,
    bufferData,
    deleteBuffer,
    texImage2D,
    drawArrays,
    drawArraysInstanced,
    failBufferAllocationAfter(additionalCalls) {
      failedBufferCall = createBuffer.mock.calls.length + additionalCalls;
    },
  };
}
