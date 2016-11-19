import {resolve} from './Utils'

export default function Storage () {
  this._datas = {}
  this._transfer = null
}

Storage.prototype.load = function (name) {
  var self = this
  if (self._transfer && self._transfer.load) {
    return self._transfer.load(name).then(function (datas) {
      self._datas[name] = datas || []
      return resolve(self._datas[name])
    })
  }
  return resolve(self.get(name))
}

Storage.prototype.save = function (name) {
  var self = this
  if (self._transfer && self._transfer.save) {
    return self._transfer.save(name, self._datas[name] || [])
  }
  return resolve()
}

Storage.prototype.get = function (name) {
  return this._datas[name] || (this._datas[name] = [])
}

Storage.prototype.setTransfer = function (transfer) {
  this._transfer = transfer
}

Storage.prototype.clear = function () {
  this._datas = {}
}
