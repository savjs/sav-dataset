import { inObject } from 'sav-assert'
import { uuid } from 'sav-util'

export default function PrimaryIndex (field) {
  this._field = field
  this.reset()
}

PrimaryIndex.prototype.field = function () {
  return this._field
}

PrimaryIndex.prototype.getSafe = PrimaryIndex.prototype.get = function (val) {
  return this._maps[typeof val === 'object' ? val[this._field] : val]
}

PrimaryIndex.prototype.set = function (obj) {
  inObject(obj, this._field)
  if (obj[this._field] in this._maps) {
    throw new Error('exists')
  }
  this._maps[obj[this._field]] = obj
}

PrimaryIndex.prototype.update = function (obj) {
  inObject(obj, this._field)
  if (this._maps[obj[this._field]] !== obj) {
    this._maps[obj[this._field]] = obj
  }
}

PrimaryIndex.prototype.remove = function (obj) {
  if (obj[this._field] in this._maps) {
    delete this._maps[obj[this._field]]
    return true
  }
  return false
}

PrimaryIndex.prototype.reset = function () {
  this._maps = {}
}

PrimaryIndex.prototype.getKey = function (obj) {
  return obj[this._field]
}

PrimaryIndex.prototype.testUpdate = function (obj, newObj) {
  let exists = this._maps[newObj[this._field]]
  return !exists || (exists === obj)
}

PrimaryIndex.prototype.testInsert = function (cache, newObj) {
  let key = newObj[this._field]
  if (cache[key] || (key in this._maps)) {
    return false
  }
  cache[key] = true
  return true
}

PrimaryIndex.prototype.replace = function (obj, newObj) {
  delete this._maps[obj[this._field]]
  this._maps[newObj[this._field]] = newObj
}

// 填充主键
PrimaryIndex.prototype.fill = function (obj) {
  if (!(this._field in obj)) {
    obj[this._field] = uuid()
  }
}
