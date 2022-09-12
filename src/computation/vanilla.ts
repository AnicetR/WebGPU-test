import CONFIG from "../config";
import { Ball } from "./Vanilla/Ball";

interface Scene {
  width: number,
  height: number,
}

function rotate(v: Array<number>, theta: number) {
  return [v[0] * Math.cos(theta) - v[1] * Math.sin(theta), v[0] * Math.sin(theta) + v[1] * Math.cos(theta)];
}

export class VanillaProcessor {

  constructor() {
  }

  public compute(inputBalls: Float32Array) {
    const scene : Scene = {
      width: CONFIG.canvas.width,
      height: CONFIG.canvas.height
    };
    
    const TIME_STEP = 0.016; //(60fps)

    const output = [];
    for(let i = 0; i < inputBalls.length; i = i + 8) {
      //deconstruct array to object
      const src_ball : Ball = new Ball(inputBalls[i + 0], inputBalls[i + 2], inputBalls[i + 3], inputBalls[i + 4], inputBalls[i + 5], inputBalls[i + 6]);

      
      // Ball/Ball collision
      for(let j = 0; j < inputBalls.length; j = j + 8) {
        if(j === i){
          continue;
        }
        const other_ball : Ball = new Ball(inputBalls[j + 0], inputBalls[j + 2], inputBalls[j + 3], inputBalls[j + 4], inputBalls[j + 5], inputBalls[j + 6]);
        if (src_ball.dis(other_ball) < src_ball.radius + other_ball.radius) {
          var res = [src_ball.velocity.x  - other_ball.velocity.x, src_ball.velocity.y  - other_ball.velocity.y];
          if (res[0] *(other_ball.position.x - src_ball.position.x ) + res[1] * (other_ball.position.y - src_ball.position.y) >= 0 ) {
            var m1 = src_ball.mass
            var m2 = other_ball.mass
            var theta = -Math.atan2(other_ball.position.y - src_ball.position.y, other_ball.position.x - src_ball.position.x );
            var v1 = rotate(src_ball.v, theta);
            var v2 = rotate(other_ball.v, theta);
            var u1 = rotate([v1[0] * (m1 - m2)/(m1 + m2) + v2[0] * 2 * m2/(m1 + m2), v1[1]], -theta);
            var u2 = rotate([v2[0] * (m2 - m1)/(m1 + m2) + v1[0] * 2 * m1/(m1 + m2), v2[1]], -theta);
            
            src_ball.velocity.x  = u1[0];
            src_ball.velocity.y  = u1[1];
            other_ball.velocity.x = u2[0];
            other_ball.velocity.y = u2[1]; 
          }
        }
      }
      if (src_ball.position.x - src_ball.radius <= 0) {
          src_ball.position.x  = src_ball.radius;
      } 
      if (src_ball.position.x  + src_ball.radius >= scene.width) {
          src_ball.position.x  = scene.width - src_ball.radius;
      }
      if ((src_ball.position.x  - src_ball.radius <= 0 && src_ball.velocity.x  < 0) || (src_ball.position.x  + src_ball.radius >= scene.width && src_ball.velocity.x  > 0)) {
          src_ball.velocity.x  = -src_ball.velocity.x;
      }
      if (src_ball.position.y - src_ball.radius <= 0) {
          src_ball.position.y = src_ball.radius;
      }
      if (src_ball.position.y + src_ball.radius >= scene.height) {
          src_ball.position.y = scene.height - src_ball.radius;
      }
      if ((src_ball.position.y - src_ball.radius <= 0 && src_ball.velocity.y  < 0) || (src_ball.position.y + src_ball.radius >= scene.height && src_ball.velocity.y  > 0)) {
          src_ball.velocity.y  = -src_ball.velocity.y;
      }

      src_ball.position.x += src_ball.velocity.x * TIME_STEP;
      src_ball.position.y += src_ball.velocity.y * TIME_STEP;
      
      output.push(...[src_ball.radius, 0, src_ball.position.x, src_ball.position.y, src_ball.velocity.x, src_ball.velocity.y, src_ball.color, 0]);
    }
    return output;
  }
  
}