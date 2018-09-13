import { injectable, inject } from 'inversify';
import { Matrix, Vector } from 'sylvester';
import { initShaders } from '../utils/gl';
import SERVICE_IDENTIFIER from '../constants/services';
import { ICameraService } from '../services/Camera';
import { ICanvasService } from '../services/Canvas';
import { ISceneService } from '../services/Scene';

export interface FBO {framebuffer: WebGLFramebuffer, texture: WebGLTexture};

export interface IShader {
  gl: WebGLRenderingContext;
  program?: WebGLProgram;
  inited: boolean;
  init(gl: WebGLRenderingContext): void;
  setVertexAttribute(attribute: string, data: any, num: number, type: number): boolean;
  setUniforms(uniforms: any): void;
}

@injectable()
export default abstract class Shader implements IShader {
  canvas: ICanvasService;
  scene: ISceneService;
  camera: ICameraService;

  inited: boolean = false;
  gl: WebGLRenderingContext;
  program: WebGLProgram;

  constructor(
    @inject(SERVICE_IDENTIFIER.ICanvasService) _canvas: ICanvasService,
    @inject(SERVICE_IDENTIFIER.ISceneService) _scene: ISceneService,
    @inject(SERVICE_IDENTIFIER.ICameraService) _camera: ICameraService
  ) {
    this.canvas = _canvas;
    this.scene = _scene;
    this.camera = _camera;
  }

  protected abstract generateShaders(): {
    vertexShader: string;
    fragmentShader: string;
  };

  public abstract draw(): void;

  init(gl: WebGLRenderingContext) {
    this.gl = gl;
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    this.initShaders();
    this.inited = true;
  }

  initShaders() {
    const { vertexShader, fragmentShader } = this.generateShaders();
    this.program = initShaders(this.gl, vertexShader, fragmentShader);
    if (!this.program) {
      console.log('Failed to intialize shaders.');
    }
  }

  setVertexAttribute(attribute: string, data: any, num: number, type: number) {
    const gl = this.gl;
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
      console.log('Failed to create the buffer object');
      return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(this.program, attribute);
    if (a_attribute < 0) {
      console.log('Failed to get the storage location of ' + attribute);
      return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);
  
    return true;
  }
  
  setUniforms(uniforms: any) {
    const gl = this.gl;
    for (let name in uniforms) {
      const value = uniforms[name];
      // console.log('[set uniform]', name, value);
      const location = gl.getUniformLocation(this.program, name);
      if (location == null) continue;
      if (value instanceof Vector) {
        gl.uniform3fv(location, new Float32Array([value.elements[0], value.elements[1], value.elements[2]]));
      } else if (value instanceof Matrix) {
        gl.uniformMatrix4fv(location, false, new Float32Array(value.flatten()));
      // } else if (value % 1 === 0) { // https://stackoverflow.com/questions/3885817/how-do-i-check-that-a-number-is-float-or-integer
      //   gl.uniform1i(location, value);
      } else {
        gl.uniform1f(location, value);
      }
    }
  }

  initFramebufferObject(width: number, height: number): FBO | void {
    const gl = this.gl;
    let framebuffer : WebGLFramebuffer;
    let texture: WebGLTexture;
    let depthBuffer: WebGLRenderbuffer;
  
    // Define the error handling function
    const error = function(): void {
      if (framebuffer) gl.deleteFramebuffer(framebuffer);
      if (texture) gl.deleteTexture(texture);
      if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
      return null;
    }
  
    // Create a framebuffer object (FBO)
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
      console.log('Failed to create frame buffer object');
      return error();
    }
  
    // Create a texture object and set its size and parameters
    texture = gl.createTexture(); // Create a texture object
    if (!texture) {
      console.log('Failed to create texture object');
      return error();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  
    // Create a renderbuffer object and Set its size and parameters
    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
    if (!depthBuffer) {
      console.log('Failed to create renderbuffer object');
      return error();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  
    // Attach the texture and the renderbuffer object to the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
  
    // Check if FBO is configured correctly
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
      console.log('Frame buffer object is incomplete: ' + e.toString());
      return error();
    }
  
    // Unbind the buffer object
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  
    return {framebuffer, texture};
  }
}