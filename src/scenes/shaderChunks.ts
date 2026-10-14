/** Potongan GLSL yang dipakai bersama oleh sistem partikel. */
export const softPointFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = pow(smoothstep(0.5, 0.0, d), 1.7);
    float core = exp(-d * d * 46.0);
    vec3 col = mix(vColor, vec3(1.0, 0.88, 0.9), core * 0.55);
    gl_FragColor = vec4(col, a * vAlpha);
  }
`;
