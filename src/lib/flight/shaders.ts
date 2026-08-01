/**
 * GLSL used by the environment.
 *
 * Gradients and procedural noise rather than image textures: the brief rules
 * out large texture files, and a sky this smooth would band badly at any
 * texture size that was worth downloading.
 */

export const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    // The dome is centred on the camera, so the local vertex position is
    // already the view direction.
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHigh;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uHaze;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;

  varying vec3 vDirection;

  void main() {
    vec3 dir = normalize(vDirection);
    float h = dir.y;

    vec3 sky = mix(uHaze, uHorizon, smoothstep(-0.06, 0.16, h));
    sky = mix(sky, uMid, smoothstep(0.10, 0.42, h));
    sky = mix(sky, uHigh, smoothstep(0.36, 0.78, h));
    sky = mix(sky, uZenith, smoothstep(0.72, 1.0, h));

    // Everything below the horizon falls away into deep haze. The transition is
    // deliberately tight - a gradual one leaves no readable horizon line, and
    // the horizon is a load-bearing reference for judging the aircraft's bank.
    sky = mix(sky * 0.22, sky, smoothstep(-0.15, -0.004, h));

    float sun = max(dot(dir, normalize(uSunDirection)), 0.0);
    sky += uSunColor * pow(sun, 340.0) * 1.6;   // disc
    sky += uSunColor * pow(sun, 16.0) * 0.16;   // tight halo
    sky += uSunColor * pow(sun, 4.0) * 0.035;   // broad scatter

    gl_FragColor = vec4(sky, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const CLOUD_DECK_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying float vDistance;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDistance = length(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export const CLOUD_DECK_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLitColor;
  uniform vec3 uShadowColor;
  uniform float uOpacity;
  uniform float uScale;

  varying vec2 vUv;
  varying float vDistance;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * valueNoise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    // Scrolls along V, which is the flight direction - this is a large part of
    // what makes the aircraft read as actually moving forward.
    vec2 p = vUv * uScale + vec2(0.0, uTime);

    float base = fbm(p);
    float detail = fbm(p * 2.7 + 11.0);
    float density = smoothstep(0.44, 0.88, base * 0.75 + detail * 0.25);

    vec3 tint = mix(uShadowColor, uLitColor, smoothstep(0.35, 0.95, base));

    // Fade out both very close (under the aircraft) and toward the horizon, so
    // the deck never shows a hard edge.
    float nearFade = smoothstep(60.0, 220.0, vDistance);
    float farFade = 1.0 - smoothstep(900.0, 2000.0, vDistance);

    float alpha = density * uOpacity * nearFade * farFade;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(tint, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const COURSE_RIBBON_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying float vDistance;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDistance = length(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export const COURSE_RIBBON_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uCoreColor;
  uniform float uTime;
  uniform float uDashLength;
  uniform float uDashGap;
  uniform float uLength;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vDistance;

  void main() {
    // Across the ribbon: a bright core with a soft falloff to the edges.
    float across = abs(vUv.x - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.28, across);
    float halo = 1.0 - smoothstep(0.15, 1.0, across);

    // Along the ribbon: dashes scrolling backward past the aircraft.
    float period = uDashLength + uDashGap;
    float alongMetres = vUv.y * uLength + uTime;
    float phase = mod(alongMetres, period);
    float dash =
      smoothstep(0.0, 1.2, phase) *
      (1.0 - smoothstep(uDashLength - 1.2, uDashLength, phase));

    // Perspective softening: distant dashes merge instead of aliasing into
    // flicker, which is the usual failure mode for a line drawn on the ground.
    float merge = smoothstep(120.0, 420.0, vDistance);
    dash = mix(dash, 0.72, merge);

    float distanceFade = 1.0 - smoothstep(260.0, 620.0, vDistance);
    float nearFade = smoothstep(0.0, 26.0, vDistance);

    vec3 tint = mix(uColor, uCoreColor, core);
    float alpha = (halo * 0.30 + core * 0.85) * dash * distanceFade * nearFade * uOpacity;
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(tint, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const COURSE_GATE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying float vDistance;

  void main() {
    vUv = uv;

    // three defines USE_INSTANCING and supplies instanceMatrix for an
    // InstancedMesh; the non-instanced branch keeps the shader reusable.
    #ifdef USE_INSTANCING
      vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    #else
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    #endif

    vDistance = length(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

export const COURSE_GATE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vDistance;

  void main() {
    float across = abs(vUv.x - 0.5) * 2.0;
    float bar = 1.0 - smoothstep(0.1, 1.0, across);
    // Bright at the base, fading upward, like an approach light.
    float along = 1.0 - smoothstep(0.0, 1.0, vUv.y);

    // The near fade is load bearing: gates recycle by shifting the whole row
    // back one spacing, and this is what hides the gate that drops off the
    // near end when that happens.
    float nearFade = smoothstep(18.0, 62.0, vDistance);
    float farFade = 1.0 - smoothstep(300.0, 560.0, vDistance);

    float alpha = bar * along * nearFade * farFade * uOpacity;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(uColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const CORRIDOR_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vDistance;

  void main() {
    // Two soft rails marking the edges of the target corridor.
    float across = abs(vUv.x - 0.5) * 2.0;
    float rail = smoothstep(0.9, 0.985, across) * (1.0 - smoothstep(0.985, 1.0, across));
    float wash = (1.0 - smoothstep(0.0, 1.0, across)) * 0.05;

    float distanceFade = 1.0 - smoothstep(220.0, 560.0, vDistance);
    float nearFade = smoothstep(0.0, 40.0, vDistance);

    float alpha = (rail * 0.8 + wash) * distanceFade * nearFade * uOpacity;
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(uColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
