import { setUniforms } from '../../utils/gl';
import Shadow from "./Shadow";

export default class VSM extends Shadow {
  constructor() {
    super();

    this.snippet.fragment.declaration = `
      float unpackHalf(vec2 color) {
        return color.x + (color.y / 255.0);
      }
      float linstep(float low, float high, float v) {
        return clamp((v - low) / (high - low), 0.0, 1.0);
      }
      float chebyshevUpperBound(vec2 moments, float compare, float bias) {
        // float p = smoothstep(compare - bias, compare, moments.x);
        
        float depthScale = 0.01 * 0.25 * compare;
        float minVariance = depthScale * depthScale;

        float variance = max(moments.y - moments.x * moments.x, minVariance);
        float d = compare - moments.x;
        float p_max = linstep(0.2, 1.0, variance / (variance + d * d));

        return (compare <= moments.x ? 1.0 : p_max);
        // return clamp(max(p, p_max), 0.0, 1.0);
      }
      float VSM(sampler2D depths, vec2 uv, float compare, float bias) {
        // vec4 result = vec4(0.0);
        // for (int x = -1; x <= 1; x++) {
        //   for (int y = -1; y <= 1; y++) {
        //     vec2 off = texelSize * vec2(x,y);
        //     result += texture2D(depths, uv + off);
        //   }
        // }

        // if (uv.x < 0. || uv.x > 1.0 || uv.y < 0. || uv.y > 1.0 || compare >= 1.0) {
        //   return 1.0;
        // }
        vec4 texel = texture2D(depths, uv);
        vec2 moments = vec2(unpackHalf(texel.xy), unpackHalf(texel.zw));
        return chebyshevUpperBound(moments, compare, bias);
      }
    `;
    this.snippet.fragment.calculation = `
      return VSM(depths, shadowCoord.xy, shadowCoord.z, bias);
    `;
  }

  setUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
    super.setUniforms(gl, program);
  }
}