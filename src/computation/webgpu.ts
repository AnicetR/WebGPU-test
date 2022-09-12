import CONFIG from "../config";

export class WebGPUProcessor {
  private bufferSize: number;
  private device!: GPUDevice;
  private buffers!: {
    scene: GPUBuffer,
    staging: GPUBuffer,
    input: GPUBuffer,
    output: GPUBuffer,
  }

  private bindingGroup!: GPUBindGroup;
  private computePipeline!: GPUComputePipeline;

  constructor(propertyCount: number) {
    this.bufferSize = CONFIG.simulation.balls.count * propertyCount * Float32Array.BYTES_PER_ELEMENT;
    if(CONFIG.mode === 'benchmark'){
      this.bufferSize = CONFIG.benchmark.balls.count * propertyCount * Float32Array.BYTES_PER_ELEMENT;
    }
  }

  public async initGpuWorker(){
    if (!("gpu" in navigator)) this.fatal("WebGPU not supported. Please enable it in about:flags in Chrome or in about:config in Firefox.");
  
   const adapter = await navigator.gpu.requestAdapter();
    if (!adapter){
      this.fatal("Couldn’t request WebGPU adapter.");
      return;
    } 
    
    this.device = await adapter.requestDevice();
    if (!this.device){
      this.fatal("Couldn’t request WebGPU device.");
      return;
    }

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage",
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
          },
        },
      ],
    });

    this.buffers = {
      scene: this.device.createBuffer({
        size: 2 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      input: this.device.createBuffer({
        size: this.bufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      }),
      output: this.device.createBuffer({
        size: this.bufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      }),
      staging: this.device.createBuffer({
        size: this.bufferSize,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      })
    }
    
    this.bindingGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.buffers.input,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.buffers.output,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.buffers.scene,
          },
        },
      ],
    });

    this.device.queue.writeBuffer(
      this.buffers.scene,
      0,
      new Float32Array([CONFIG.canvas.width, CONFIG.canvas.height])
    );

    this.computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: this.computeShader,
        entryPoint: "main",
      },
    });
  }
 
  public async compute(inputBalls: Float32Array) {
    this.device.queue.writeBuffer(this.buffers.input, 0, inputBalls);
  
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.computePipeline);
    passEncoder.setBindGroup(0, this.bindingGroup);
    
    let dispatchSize = Math.ceil(CONFIG.simulation.balls.count / 64);
    if(CONFIG.mode === 'benchmark'){  
      dispatchSize = Math.ceil(CONFIG.benchmark.balls.count / 64);
    }
    passEncoder.dispatchWorkgroups(dispatchSize);
    passEncoder.end();
    commandEncoder.copyBufferToBuffer(this.buffers.output, 0, this.buffers.staging, 0, this.bufferSize);
    
    const commands = commandEncoder.finish();
    this.device.queue.submit([commands]);

    await this.buffers.staging.mapAsync(GPUMapMode.READ, 0, this.bufferSize);
    const copyArrayBuffer = this.buffers.staging.getMappedRange(0, this.bufferSize);
    const data = copyArrayBuffer.slice(0);
    const outputBalls = new Float32Array(data);
    
    this.buffers.staging.unmap();

    return outputBalls;
  }

  private fatal(msg : string): void {
    document.body.innerHTML = `<pre>${msg}</pre>`;
    throw Error(msg);
  }

  get computeShader(): GPUShaderModule {
    return this.device.createShaderModule({
      code: `
        struct Scene {
            width: f32,
            height: f32,
        }
    
        @group(0) @binding(2)
        var<storage, read> scene: Scene;
      
        struct Ball {
          radius: f32,
          position: vec2<f32>,
          velocity: vec2<f32>,
          color: f32,
        }
    
        @group(0) @binding(0)
        var<storage, read> input: array<Ball>;
    
        @group(0) @binding(1)
        var<storage, read_write> output: array<Ball>;
    
        const PI: f32 = 3.14159;
        const TIME_STEP: f32 = 0.016;
    
        @compute @workgroup_size(64)
        fn main(
          @builtin(global_invocation_id)
          global_id : vec3<u32>,
        ) {
          let num_balls = arrayLength(&input);
          if(global_id.x >= num_balls) {
            return;
          }
          var src_ball = input[global_id.x];
          let dst_ball = &output[global_id.x];
          (*dst_ball) = src_ball;
          
    
          // Ball/Ball collision
          for(var i = 0u; i < num_balls; i = i + 1u) {
            if(i == global_id.x) {
              continue;
            }
            var other_ball = input[i];
            let n = src_ball.position - other_ball.position;
            let distance = length(n);
            if(distance >= src_ball.radius + other_ball.radius) {
              continue;
            }
            let overlap = src_ball.radius + other_ball.radius - distance;
            (*dst_ball).position = src_ball.position + normalize(n) * overlap/2.;
    
            // Details on the physics here:
            // https://physics.stackexchange.com/questions/599278/how-can-i-calculate-the-final-velocities-of-two-spheres-after-an-elastic-collisi
            let src_mass = pow(src_ball.radius, 2.0) * PI;
            let other_mass = pow(other_ball.radius, 2.0) * PI;
            let c = 2.*dot(n, (other_ball.velocity - src_ball.velocity)) / (dot(n, n) * (1./src_mass + 1./other_mass));
            (*dst_ball).velocity = src_ball.velocity + c/src_mass * n;
          }
    
          // Apply velocity
          (*dst_ball).position = (*dst_ball).position + (*dst_ball).velocity * TIME_STEP;
    
          // Ball/Wall collision
          if((*dst_ball).position.x - (*dst_ball).radius < 0.) {
            (*dst_ball).position.x = (*dst_ball).radius;
            (*dst_ball).velocity.x = -(*dst_ball).velocity.x;
          }
          if((*dst_ball).position.y - (*dst_ball).radius < 0.) {
            (*dst_ball).position.y = (*dst_ball).radius;
            (*dst_ball).velocity.y = -(*dst_ball).velocity.y;
          }
          if((*dst_ball).position.x + (*dst_ball).radius >= scene.width) {
            (*dst_ball).position.x = scene.width - (*dst_ball).radius;
            (*dst_ball).velocity.x = -(*dst_ball).velocity.x;
          }
          if((*dst_ball).position.y + (*dst_ball).radius >= scene.height) {
            (*dst_ball).position.y = scene.height - (*dst_ball).radius;
            (*dst_ball).velocity.y = -(*dst_ball).velocity.y;
          }
        }
      `,
    });
  }


}