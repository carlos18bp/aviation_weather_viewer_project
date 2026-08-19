export const UPDATE_VERTEX_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

layout(location = 0) in vec2 a_position;
layout(location = 1) in float a_age;

uniform sampler2D u_wind;
uniform ivec2 u_grid_size;
uniform vec4 u_bbox;
uniform float u_delta_seconds;
uniform float u_frame_seed;
uniform float u_max_age;
uniform float u_speed_factor;

out vec2 v_position;
out float v_age;

float randomValue(float seed) {
  return fract(sin(seed * 12.9898 + u_frame_seed * 78.233) * 43758.5453);
}

vec2 sampleWind(vec2 position) {
  vec2 texturePosition = vec2(position.x, 1.0 - position.y);
  vec2 gridPosition = clamp(texturePosition, 0.0, 1.0) * vec2(u_grid_size - ivec2(1));
  ivec2 lower = ivec2(floor(gridPosition));
  ivec2 upper = min(lower + ivec2(1), u_grid_size - ivec2(1));
  vec2 weight = fract(gridPosition);
  vec2 northWest = texelFetch(u_wind, lower, 0).rg;
  vec2 northEast = texelFetch(u_wind, ivec2(upper.x, lower.y), 0).rg;
  vec2 southWest = texelFetch(u_wind, ivec2(lower.x, upper.y), 0).rg;
  vec2 southEast = texelFetch(u_wind, upper, 0).rg;
  vec2 north = mix(northWest, northEast, weight.x);
  vec2 south = mix(southWest, southEast, weight.x);
  return mix(north, south, weight.y);
}

void main() {
  vec2 wind = sampleWind(a_position);
  float latitude = mix(u_bbox.y, u_bbox.w, a_position.y);
  float longitudeScale = max(cos(radians(latitude)), 0.3);
  const float knotToDegreesPerSecond = 1.0 / (60.0 * 3600.0);
  vec2 degreesPerSecond = vec2(
    wind.x * knotToDegreesPerSecond / longitudeScale,
    wind.y * knotToDegreesPerSecond
  ) * u_speed_factor;
  vec2 coverage = vec2(u_bbox.z - u_bbox.x, u_bbox.w - u_bbox.y);
  vec2 nextPosition = a_position + degreesPerSecond * u_delta_seconds / coverage;
  float nextAge = a_age + 1.0;
  bool outside = any(lessThan(nextPosition, vec2(0.0))) || any(greaterThan(nextPosition, vec2(1.0)));

  if (outside || nextAge > u_max_age) {
    float particleId = float(gl_VertexID) + 1.0;
    nextPosition = vec2(
      randomValue(particleId * 1.37),
      randomValue(particleId * 2.71 + 17.0)
    );
    nextAge = 0.0;
  }

  v_position = nextPosition;
  v_age = nextAge;
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}`;

export const UPDATE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 fragmentColor;

void main() {
  fragmentColor = vec4(0.0);
}`;

export const DRAW_VERTEX_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;

layout(location = 0) in float a_endpoint;
layout(location = 1) in vec2 a_previous_position;
layout(location = 2) in vec2 a_current_position;
layout(location = 3) in float a_current_age;

uniform mat4 u_matrix;
uniform float u_world_size;
uniform sampler2D u_wind;
uniform ivec2 u_grid_size;
uniform vec4 u_bbox;

out float v_speed;

vec2 sampleWind(vec2 position) {
  vec2 texturePosition = vec2(position.x, 1.0 - position.y);
  vec2 gridPosition = clamp(texturePosition, 0.0, 1.0) * vec2(u_grid_size - ivec2(1));
  ivec2 lower = ivec2(floor(gridPosition));
  ivec2 upper = min(lower + ivec2(1), u_grid_size - ivec2(1));
  vec2 weight = fract(gridPosition);
  vec2 northWest = texelFetch(u_wind, lower, 0).rg;
  vec2 northEast = texelFetch(u_wind, ivec2(upper.x, lower.y), 0).rg;
  vec2 southWest = texelFetch(u_wind, ivec2(lower.x, upper.y), 0).rg;
  vec2 southEast = texelFetch(u_wind, upper, 0).rg;
  return mix(mix(northWest, northEast, weight.x), mix(southWest, southEast, weight.x), weight.y);
}

vec2 toMercator(vec2 position) {
  float longitude = mix(u_bbox.x, u_bbox.z, position.x);
  float latitude = mix(u_bbox.y, u_bbox.w, position.y);
  float latitudeRadians = radians(clamp(latitude, -85.051129, 85.051129));
  float x = (longitude + 180.0) / 360.0;
  float y = (1.0 - log(tan(latitudeRadians) + 1.0 / cos(latitudeRadians)) / 3.141592653589793) / 2.0;
  return vec2(x, y);
}

void main() {
  bool validSegment = a_current_age > 0.5 && distance(a_previous_position, a_current_position) < 0.08;
  vec2 previousPosition = validSegment ? a_previous_position : a_current_position;
  vec2 position = mix(previousPosition, a_current_position, a_endpoint);
  vec2 mercator = toMercator(position);
  gl_Position = u_matrix * vec4(mercator * u_world_size, 0.0, 1.0);
  v_speed = length(sampleWind(a_current_position));
}`;

export const DRAW_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float v_speed;
out vec4 fragmentColor;

vec3 windColor(float speed) {
  vec3 color0 = vec3(0.5569, 0.7922, 0.9020);
  vec3 color15 = vec3(0.1333, 0.8275, 0.9333);
  vec3 color30 = vec3(0.5176, 0.8000, 0.0863);
  vec3 color45 = vec3(0.9608, 0.6196, 0.0431);
  vec3 color60 = vec3(0.9373, 0.2667, 0.2667);

  if (speed <= 15.0) {
    return mix(color0, color15, clamp(speed / 15.0, 0.0, 1.0));
  }
  if (speed <= 30.0) {
    return mix(color15, color30, (speed - 15.0) / 15.0);
  }
  if (speed <= 45.0) {
    return mix(color30, color45, (speed - 30.0) / 15.0);
  }
  return mix(color45, color60, clamp((speed - 45.0) / 15.0, 0.0, 1.0));
}

void main() {
  const float alpha = 0.78;
  vec3 color = windColor(v_speed);
  fragmentColor = vec4(color * alpha, alpha);
}`;
