import { VanillaProcessor } from './computation/vanilla';
import { WebGPUProcessor } from './computation/webgpu';
import CONFIG from './config';
import { RenderCanvas2D } from './render/canvas';
import './style.css'

const propertyCount = 8;
let inputBalls = new Float32Array(new ArrayBuffer(CONFIG.simulation.balls.count * propertyCount * Float32Array.BYTES_PER_ELEMENT));


if(CONFIG.mode === 'render'){
    inputBalls = initBalls();
    const renderer = new RenderCanvas2D();
    if(CONFIG.processor === 'gpu'){
        const processor = new WebGPUProcessor(propertyCount);
        await processor.initGpuWorker();
        (async function loop(){
            inputBalls = await processor.compute(inputBalls);
            renderer.draw(drawBalls);
            window.requestAnimationFrame(loop);
        })();
    } else {
        const processor = new VanillaProcessor();
        (async function loop(){
            inputBalls = processor.compute(inputBalls)  as unknown as Float32Array;
            renderer.draw(drawBalls);
            window.requestAnimationFrame(loop);
        })();
    }
} else if(CONFIG.mode === 'benchmark'){
    inputBalls = new Float32Array(new ArrayBuffer(CONFIG.benchmark.balls.count * propertyCount * Float32Array.BYTES_PER_ELEMENT));
    const cpuprocessor = new VanillaProcessor();

    const gpuprocessor = new WebGPUProcessor(propertyCount);
    await gpuprocessor.initGpuWorker();

    inputBalls = initBalls(CONFIG.benchmark.balls.count, CONFIG.benchmark.balls.radius.min, CONFIG.benchmark.balls.radius.max, 2000, 2000);

    console.log('time for 100 iterations')
    const computationsToDo = 100;

    console.time('GPU');
        for (let gpuindex = 0; gpuindex < computationsToDo; gpuindex++) {
            inputBalls = await gpuprocessor.compute(inputBalls);
        }
    console.timeEnd('GPU');

    console.time('CPU');
        for (let cpuindex = 0; cpuindex < computationsToDo; cpuindex++) {
            inputBalls = cpuprocessor.compute(inputBalls) as unknown as Float32Array;
        }
    console.timeEnd('CPU');
}

function initBalls(ballcount = CONFIG.simulation.balls.count, minRadius = CONFIG.simulation.balls.radius.min, maxRadius = CONFIG.simulation.balls.radius.max, canvasWidth = CONFIG.canvas.width, canvasHeight  = CONFIG.canvas.height){
    let inputBalls = new Float32Array(new ArrayBuffer(ballcount * propertyCount * Float32Array.BYTES_PER_ELEMENT));
    for (let i = 0; i < ballcount; i++) {
        inputBalls[i * propertyCount + 0] = random(minRadius, maxRadius);
        inputBalls[i * propertyCount + 2] = random(0, canvasWidth);
        inputBalls[i * propertyCount + 3] = random(0, canvasHeight);
        inputBalls[i * propertyCount + 4] = random(-100, 100);
        inputBalls[i * propertyCount + 5] = random(-100, 100);
        inputBalls[i * propertyCount + 6] = random(0, 16777215);
    }
    return inputBalls;
}



function drawBalls(ctx: CanvasRenderingContext2D) {
  ctx.save();

  for (let i = 0; i < inputBalls.length; i += 8) {
    const r = inputBalls[i + 0];
    const px = inputBalls[i + 2];
    const py = inputBalls[i + 3];
    const vx = inputBalls[i + 4];
    const vy = inputBalls[i + 5];
    const color = '#'+Math.floor(inputBalls[i + 6]).toString(16);

    let angle = Math.atan(vy / (vx === 0 ? Number.EPSILON : vx));
    // Correct for Math.atan() assuming the angle is [-PI/2;PI/2].
    if (vx < 0) angle += Math.PI;
    const ex = px + Math.cos(angle) * Math.sqrt(2) * r;
    const ey = py + Math.sin(angle) * Math.sqrt(2) * r;


    ctx.beginPath();
    ctx.arc(px, py, r, 0, 2 * Math.PI, true);
    ctx.moveTo(ex, ey);
    ctx.arc(px, py, r, angle - Math.PI / 4, angle + Math.PI / 4, true);
    ctx.lineTo(ex, ey);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

function random(a: number, b: number) {
  return Math.random() * (b - a) + a;
}