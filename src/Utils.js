import {clone} from '../util/clone.js'
import {extend} from '../util/extend.js'

export const resolve = Promise.resolve.bind(Promise)
export const reject = Promise.reject.bind(Promise)
export const then = (fn)=>new Promise(fn)
export {clone}
export {extend}
