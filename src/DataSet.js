import {hasString} from 'sav-assert'
import Collection from './Collection'
import Storage from './Storage'
import {resolve} from './Utils.js'

export function DataSet() {
    this._storage = new Storage();
    this._resetIndex = 1;
}

DataSet.prototype.setTransfer = function(handle) {
    this._storage.setTransfer(handle);
};

DataSet.prototype.collection = function(opts) {
    hasString(opts, 'name');
    return this[opts.name] || (this[opts.name] = new Collection(this, opts));
};

DataSet.prototype._payload = function(name, col) {
    var _resetIndex = this._resetIndex;
    if (col.__loaded === _resetIndex) {
        return resolve(this._storage.get(name));
    }
    return col.__loading || (col.__loading = this._storage.load(name).then(function(datas) {
        col._rebuildIndexs(datas);
        col.__loaded = _resetIndex;
        delete col.__loading;
        return resolve(datas);
    }));
};

DataSet.prototype._syncWrite = function(name) {
    return this._storage.save(name);
};

/**
 * 重置数据,相当于从新加载
 */
DataSet.prototype.reset = function() {
    this._storage.clear();
    this._resetIndex++;
};