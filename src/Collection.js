import {extend, clone, resolve, reject} from './Utils'
import PrimaryIndex from './PrimaryIndex'
import UniqueIndex from './UniqueIndex'
import {neq, isArray} from 'sav-assert'
import Finder from './Finder'

export default function Collection(dataset, opts) {
    this._dataset = dataset;
    this._opts = opts;
    this._stacks = []; // 写操作栈

    var indexMaps = this._indexMaps = {}; // 索引映射图
    var uniqueIndexs = this._uniqueIndexs = []; // 唯一索引列表
    var indexs = this._indexs = []; // 所有索引,包括主键

    if (opts.primary) { // 有自动主键
        indexs.push(this._primary = new PrimaryIndex(opts.primary));
    }
    if (opts.unique) { // 有唯一索引项
        var uniqueKeys = Object.keys(opts.unique);
        uniqueKeys.forEach(function(name) {
            var it = indexMaps[name] = new UniqueIndex(opts.unique[name]);
            uniqueIndexs.push(it);
            indexs.push(it);
        });
    }
    // 必须有主键或索引
    neq(indexs.length, 0);
    // 增加读取操作的 排序索引

}

Collection.prototype.option = function(key) {
    return this._opts[key];
};

Collection.prototype._select = function(datas, fn) {
    return resolve(fn(datas));
};

Collection.prototype._findOne = function(datas, vals) {
    var finder = new Finder(this);
    return finder.find(datas, vals, {
        one: true
    });
};

Collection.prototype._find = function(datas, vals) {
    var finder = new Finder(this);
    return finder.find(datas, vals, {
        one: false
    });
};

Collection.prototype._count = function(datas, vals) {
    var finder = new Finder(this);
    vals || (vals = {});
    vals.$count = true;
    return finder.find(datas, vals, {
        one: false
    });
};

Collection.prototype._remove = function(datas, vals) {
    var self = this;
    if (Array.isArray(vals)) {
        return Promise.all(vals.map(function(val) {
            return self._remove(datas, val);
        })).then(function() {
            return [].concat.apply([], arguments);
        });
    }
    return this._find(datas, vals).then(function(resulsts) {
        resulsts.forEach(function(ret) {
            var idx = datas.indexOf(ret);
            neq(idx, -1);
            datas.splice(idx, 1);
            self._indexs.forEach(function(idx) {
                idx.remove(ret);
            });
        });
        return resulsts;
    });
};

Collection.prototype._insert = function(datas, vals) {
    var isArray = true;
    if (!Array.isArray(vals)) {
        vals = [vals];
        isArray = false;
    }
    var self = this;
    // 1. 解析列表数据
    return this.__parseValues(vals, true).then(function(ret) {
        var noExists = ret.noExists;
        // 主键填充
        self._primary && noExists.forEach(function(val) {
            self._primary.fill(val);
        });
        // 2. 尝试插入索引
        return self.__testInsertIndexs(noExists).then(function() {
            // 3. 添加数据
            noExists.forEach(function(val) {
                datas.push(val);
            });
            // 4. 更新索引
            self._indexs.forEach(function(index) {
                noExists.forEach(function(val) {
                    index.set(val);
                });
            });
            return resolve(isArray ? noExists : noExists[0]);
        });
    });
};

Collection.prototype._update = function(datas, vals) {
    var isArray = true;
    if (!Array.isArray(vals)) {
        vals = [vals];
        isArray = false;
    }
    var self = this;
    // 1. 解析列表数据
    return this.__parseValues(vals, false).then(function(ret) {
        var newDatas = ret.newDatas;
        var oldDatas = ret.oldDatas;
        // 2. 尝试更新索引
        return self.__testUpdateIndexs(newDatas, oldDatas).then(function() {
            // 3. 更新索引和数据
            self.__doUpdateDatas(datas, newDatas, oldDatas);
            return resolve(isArray ? newDatas : newDatas[0]);
        });
    });
};

Collection.prototype._insertUpdate = function(datas, vals) {
    var isArray = true;
    if (!Array.isArray(vals)) {
        vals = [vals];
        isArray = false;
    }
    var self = this;
    // 1. 解析列表数据
    return this.__parseValues(vals).then(function(ret) {
        var newDatas = ret.newDatas;
        var oldDatas = ret.oldDatas;
        var noExists = ret.noExists;
        var queue = resolve();
        // 测试更新
        if (newDatas.length) { // 有需要更新的数据
            // 2. 尝试更新索引
            queue = queue.then(function() {
                return self.__testUpdateIndexs(newDatas, oldDatas);
            });
        }
        // 测试插入
        if (noExists.length) { // 有新增加的数据
            // 主键填充
            self._primary && noExists.forEach(function(val) {
                self._primary.fill(val);
            });
            queue = queue.then(function() {
                return self.__testInsertIndexs(noExists);
            });
        }
        return queue.then(function() {
            if (newDatas.length) {
                // 2. 更新数据
                self.__doUpdateDatas(datas, newDatas, oldDatas);
            }
            if (noExists.length) {
                // 3. 添加数据
                noExists.forEach(function(val) {
                    datas.push(val);
                });
                // 4. 更新索引
                self._indexs.forEach(function(index) {
                    noExists.forEach(function(val) {
                        index.set(val);
                    });
                });
            }
            return resolve(isArray ? vals : vals[0]);
        });
    });
};

Collection.prototype.__doUpdateDatas = function(datas, newDatas, oldDatas) {
    for (var i = 0; i < newDatas.length; ++i) {
        var item = newDatas[i];
        var extracted = datas.splice(datas.indexOf(oldDatas[i]), 1, item);
        isArray(extracted);
        for (var j = 0; j < this._indexs.length; ++j) {
            this._indexs[j].replace(oldDatas[i], item);
        }
    }
}

Collection.prototype.__testUpdateIndexs = function(newDatas, oldDatas) {
    // 尝试更新数据索引
    if (this._indexs.length > 1) { // 不只是一个索引的情况
        for (var j = 0; j < this._indexs.length; ++j) {
            for (var i = 0; i < newDatas.length; ++i) {
                try {
                    // 确保新数据对应的索不会和非原数据的索引冲突
                    if (!(this._indexs[j].testUpdate(oldDatas[i], newDatas[i]))) {
                        throw 'exists';
                    }
                } catch (err) {
                    return reject({
                        error: 'update_fail',
                        data: newDatas[i],
                    });
                }
            }
        }
    }
    return resolve();
}

Collection.prototype.__testInsertIndexs = function(newDatas) {
    // 尝试插入数据索引
    if (this._indexs.length > 1) { // 不只是一个索引的情况
        for (var j = 0; j < this._indexs.length; ++j) {
            var cache = {};
            for (var i = 0; i < newDatas.length; ++i) {
                try {
                    // 确保新数据对应的索不会和非原数据的索引冲突
                    if (!(this._indexs[j].testInsert(cache, newDatas[i]))) {
                        throw 'exists';
                    }
                } catch (err) {
                    return reject({
                        error: 'insert_fail',
                        data: newDatas[i],
                    });
                }
            }
        }
    }
    return resolve();
}

Collection.prototype.__parseValues = function(vals, ensure) {
    // 将数据分离为 已存在的和未存在的, 方便插入或更新操作
    var activeIndexs = []; // 活动索引
    var oldDatas = []; // 更新的老数据
    var newDatas = []; // 更新的新数据
    var noExists = []; // 没有索引的数据，也就是新插入的
    var item;
    var isExists = false;
    var self = this;
    if (self._primary) {
        activeIndexs.push(self._primary);
    }
    for (var i = 0; i < vals.length; ++i) {
        isExists = false;
        // 动态索引，将活动的索引移动到 activeIndexs,方便快速迭代
        for (var j = 0; j < activeIndexs.length; ++j) { // 找到一个就行
            if (item = activeIndexs[j].getSafe(vals[i])) {
                isExists = true;
                oldDatas.push(item);
                break;
            }
        }
        if (!isExists) {
            for (var j = 0; j < self._indexs.length; ++j) { // 找到一个就行
                if (item = self._indexs[j].getSafe(vals[i])) {
                    isExists = true;
                    oldDatas.push(item);
                    activeIndexs.push(self._indexs[j]);
                    break;
                }
            }
        }
        if (ensure === isExists) {
            return reject({
                error: isExists ? 'index_exists' : 'index_no_found',
                data: vals[i],
            });
        }
        if (isExists) {
            newDatas.push(vals[i] = extend({}, item, vals[i])); // 合并到新数据
        } else {
            noExists.push(vals[i]);
        }
    }
    return resolve({
        oldDatas: oldDatas,
        noExists: noExists,
        newDatas: newDatas,
    });
}

Collection.prototype.process = function(key, payload) {
    var self = this;
    var fn = this['_' + key];
    return this._dataset._payload(this._opts.name, this).then(function(datas) {
        return fn.call(self, datas, payload);
    });
};

Collection.prototype._rebuildIndexs = function(datas) {
    this._indexs.forEach(function(index) {
        index.reset();
        datas.forEach(function(val) {
            index.update(val);
        });
    });
};

// 读数据
[
    'findOne',
    'find',
    'select',
    'count',
].forEach(function(key) {
    Collection.prototype[key] = function(payload) {
        // 先开启读锁, 防止出错
        return this._lockWrite(key, payload);
        // return this.process(key, payload);
    };
});

Collection.prototype._unlockWrite = function() {
    var self = this;
    Promise.resolve().then(function() {
        var resolve = self._stacks.shift();
        if (resolve === false) { // 取到的是第一个任务, 向下再取
            resolve = self._stacks.shift();
        }
        if (resolve) { // 需要开启下一个任务
            resolve();
        }
    });
};

Collection.prototype._lockWrite = function(key, payload, save) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if (self._stacks.length === 0) { // 第一个任务
            self._stacks.push(false); // 填充占位
            resolve(); // 启动任务
        } else {
            self._stacks.push(resolve); // 第一个任务未执行完，加入队列
        }
    }).then(function() {
        return self.process(key, payload).then(function(data) {
            if (save) {
                return self._dataset._syncWrite(self._opts.name).then(function() { // 保存并返回
                    self._unlockWrite();
                    return resolve(data ? clone(data) : data);
                }).catch(function() {
                    self._unlockWrite();
                });
            }
            self._unlockWrite();
            return resolve(data ? clone(data) : data);
        }).catch(function(err) {
            self._unlockWrite();
            return Promise.reject(err);
        });
    });
};

// 写数据, 需要有先进先出的锁机制
[
    'insert',
    'update',
    'insertUpdate',
    'remove',
].forEach(function(key) {
    Collection.prototype[key] = function(payload) {
        return this._lockWrite(key, payload, true);
    };
});