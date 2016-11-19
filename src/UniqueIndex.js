import {inObject} from 'sav-assert'
import md5 from 'blueimp-md5'

export default function UniqueIndex (fields) {
  this._fields = Array.isArray(fields) ? fields : [fields]
  this.getUniqueKey = this._fields.length === 1 ? this._getUniqueKeySingle.bind(this) : this._getUniqueKeyMulti.bind(this)
  this.reset()
}

UniqueIndex.prototype.fields = function () {
  return this._fields
}

UniqueIndex.prototype.get = function (key) {
  return this._maps[typeof key === 'object' ? this.getUniqueKey(key) : key]
}

UniqueIndex.prototype.getSafe = function (key) {
  try {
    return this._maps[typeof key === 'object' ? this.getUniqueKey(key) : key]
  } catch (err) {
    return false
  }
}

UniqueIndex.prototype.set = function (obj) {
  var key = this.getUniqueKey(obj)
  if (key in this._maps) {
    throw new Error('exists')
  }
  this._maps[key] = obj
}

UniqueIndex.prototype.update = function (obj) {
  var key = this.getUniqueKey(obj)
  if (this._maps[key] !== obj) {
    this._maps[key] = obj
  }
}

UniqueIndex.prototype.remove = function (obj) {
  try {
    var key = this.getUniqueKey(obj)
    if (key in this._maps) {
      delete this._maps[key]
      return true
    }
  } catch (err) {}
  return false
}

UniqueIndex.prototype.reset = function () {
  this._maps = {}
}

UniqueIndex.prototype._getUniqueKeyMulti = function (obj) {
  var vals = []
  this._fields.forEach(function (field) {
    inObject(obj, field)
    vals.push(obj[field])
  })
  return md5(vals.join('~'))
}

UniqueIndex.prototype._getUniqueKeySingle = function (obj) {
  var field = this._fields[0]
  inObject(obj, field)
  return obj[field]
}

UniqueIndex.prototype.getKey = function (obj) {
  return this.getUniqueKey(obj)
}

UniqueIndex.prototype.testUpdate = function (obj, newObj) {
  var exists = this._maps[this.getUniqueKey(newObj)]
  return !exists || (exists === obj)
}

UniqueIndex.prototype.testInsert = function (cache, newObj) {
  var key = this.getUniqueKey(newObj)
  if (cache[key] || (key in this._maps)) {
    return false
  }
  cache[key] = true
  return true
}

UniqueIndex.prototype.replace = function (obj, newObj) {
  delete this._maps[this.getUniqueKey(obj)]
  this._maps[this.getUniqueKey(newObj)] = newObj
}
