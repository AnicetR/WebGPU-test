interface Vector2D { 
    x: number,
    y: number
  }
  
  interface IBall {
    radius: number,
    position : Vector2D,
    velocity : Vector2D,
    color: number
  }

export class Ball implements IBall {

    radius: number;
    position: Vector2D;
    velocity: Vector2D;
    color: number;

    constructor(r: number, x: number, y: number, vx: number, vy: number, color: number) {
        this.position = { x, y};
        this.position.x = x;
        this.position.y = y;
        this.radius = r;
        this.velocity = { x: vx, y: vy};
        this.color = color;
    }
    get mass() {
        return Math.pow(this.radius, 2) * Math.PI;
    }
    get v() {
        return [this.velocity.x, this.velocity.y];
    }
    
    dis(other: IBall) {
        var dx = this.position.x - other.position.x;
        var dy = this.position.y - other.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}