export const CONFIG = {
    processor: 'gpu',
    mode: 'render',
    canvas : {
        height: 2000,
        width: 2000
    },
    simulation: {
        balls: {
            count: 5000,
            radius: {
                min: 1,
                max: 10
            }
        }
    },
    benchmark: {
        balls: {
            count: 3000,
            radius: {
                min: 1,
                max: 5
            }
        }
    },
}

export default CONFIG;