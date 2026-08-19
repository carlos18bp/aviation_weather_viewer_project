export class WindWebGLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WindWebGLError';
  }
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new WindWebGLError('Unable to allocate a wind shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'Unknown shader compilation error.';
    gl.deleteShader(shader);
    throw new WindWebGLError(log);
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  transformFeedbackVaryings?: readonly string[],
): WebGLProgram {
  let vertexShader: WebGLShader | null = null;
  let fragmentShader: WebGLShader | null = null;
  let program: WebGLProgram | null = null;

  try {
    vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();

    if (!program) {
      throw new WindWebGLError('Unable to allocate a wind shader program.');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    if (transformFeedbackVaryings) {
      gl.transformFeedbackVaryings(
        program,
        [...transformFeedbackVaryings],
        gl.SEPARATE_ATTRIBS,
      );
    }

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new WindWebGLError(
        gl.getProgramInfoLog(program) ?? 'Unknown shader linking error.',
      );
    }

    return program;
  } catch (error) {
    if (program) {
      gl.deleteProgram(program);
    }
    throw error;
  } finally {
    if (vertexShader) {
      gl.deleteShader(vertexShader);
    }
    if (fragmentShader) {
      gl.deleteShader(fragmentShader);
    }
  }
}

export function requireBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();

  if (!buffer) {
    throw new WindWebGLError('Unable to allocate a wind WebGL buffer.');
  }

  return buffer;
}

export function requireTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();

  if (!texture) {
    throw new WindWebGLError('Unable to allocate the wind field texture.');
  }

  return texture;
}

export function requireVertexArray(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vertexArray = gl.createVertexArray();

  if (!vertexArray) {
    throw new WindWebGLError('Unable to allocate a wind vertex array.');
  }

  return vertexArray;
}

export function requireTransformFeedback(
  gl: WebGL2RenderingContext,
): WebGLTransformFeedback {
  const transformFeedback = gl.createTransformFeedback();

  if (!transformFeedback) {
    throw new WindWebGLError('Unable to allocate wind transform feedback.');
  }

  return transformFeedback;
}

export function requireUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);

  if (!location) {
    throw new WindWebGLError(`Missing wind shader uniform: ${name}.`);
  }

  return location;
}
