import CONFIG from "../config";

export class RenderCanvas2D {

    canvas: HTMLCanvasElement;
    context!: CanvasRenderingContext2D;
    lastRender: number;

    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.width = CONFIG.canvas.width;
        this.canvas.height = CONFIG.canvas.height;

        document.getElementById('app')?.appendChild(this.canvas);
        this.context = this.canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

        this.lastRender = 0;
    }

    draw(itemRenderFn: (c: CanvasRenderingContext2D) => void){
        this.context.save();
        this.context.scale(1, -1);
        this.context.translate(0, -this.context.canvas.height);
        this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        itemRenderFn(this.context);
        this.context.restore();
        this.drawDebugFPS();
        this.lastRender = performance.now();
    }

    drawDebugFPS() { 
        const delta = (performance.now() - this.lastRender)/1000;
        const fps = Math.ceil(1/delta);
        this.context.fillStyle = "black";
        this.context.fillRect(5, 5, 140, 80);
        this.context.fillStyle = "orange";
        this.context.font      = "normal 14pt consolas";
        this.context.fillText(fps + " fps", 10, 26);
        this.context.fillText("ball count " + CONFIG.simulation.balls.count, 10, 46);
        this.context.fillText("processor " + CONFIG.processor, 10, 66);
    }

    drawDebugCPS() { 
        const delta = (performance.now() - this.lastRender)/1000;
        const fps = Math.ceil(1/delta);
        this.context.fillStyle = "black";
        this.context.fillRect(5, 5, 140, 80);
        this.context.fillStyle = "orange";
        this.context.font      = "normal 14pt consolas";
        this.context.fillText(fps + " cps", 10, 26);
        this.context.fillText("ball count " + CONFIG.simulation.balls.count, 10, 46);
        this.context.fillText("processor " + CONFIG.processor, 10, 66);
    }
}
