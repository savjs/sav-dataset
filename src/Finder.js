
import { resolve } from './Utils.js'
import compare from './compare'

export default function Finder (collection) {
  this._collection = collection
}

Finder.prototype.find = function (datas, opts, meta) {
  let ret = parseQuery(opts || {})
  ret.$and || (ret.$and = {})
  let results = []
  for (let x in ret) {
    if (this[x]) {
      results = this[x](results, ret[x], datas)
    }
  }
  results = results || []
  return resolve(ret.$count ? results.length : results)
}

Finder.prototype.$and = function (results, args, sources) {
  if (!(args.indexs || (args.compares && args.compares.length))) { // 全部获取
    return results.concat(sources)
  }
  let indexs = args.indexs
  let fullSearch = true // 全文检索
  if (indexs) {
        // 1. 如果条件中包含索引或主键, 提取出来并获得结果集
    let _indexs = this._collection._indexs
    let item
    for (let i = 0; i < _indexs.length; ++i) {
      if ((item = _indexs[i].getSafe(indexs))) { // 一旦有一个匹配到的就应该是这条记录
        results.push(item)
        fullSearch = false
        break
      }
    }
  }
  if (fullSearch) {
    results = results.concat(sources)
  }
    // 2. 全文检索
  let compares = args.compares
  if (compares && compares.length) {
    results = results.filter(function (it) {
      for (let i = 0, l = compares.length; i < l; ++i) {
        let info = compares[i]
        if (!compare(info[1], it[info[0]], info[2])) {
          return false
        }
      }
      return true
    })
  }
  return results
}

Finder.prototype.$any = function (results, args, sources) {
  return results
}

Finder.prototype.$limit = function (results, args, sources) {
  let offset = args.length === 2 ? args[0] : 0
  let limit = args.length > 1 ? args[1] : args[0]
  return results.slice(offset, limit)
}

Finder.prototype.$sort = function (results, args, sources) {
  results.length && Object.keys(args).forEach(function (field) {
    results = results.sort(args[field] === 'desc' ? makeDescSort(field) : makeAscSort(field))
  })
  return results
}

function makeAscSort (field) {
  return function quickSort (a, b) {
    if (a[field] > b[field]) {
      return 1
    }
    if (a[field] < b[field]) {
      return -1
    }
    return 0
  }
}

function makeDescSort (field) {
  return function quickSort (a, b) {
    if (b[field] > a[field]) {
      return 1
    }
    if (b[field] < a[field]) {
      return -1
    }
    return 0
  }
}

Finder.prototype.$fields = function (results, fields, sources) {
  return results.map(function (it) {
    let ret = {}
    for (let x in fields) {
      ret[fields[x]] = it[x]
    }
    return ret
  })
}

Finder.prototype.$alias = function (results, alias, sources) {
  results.forEach(function (it) {
    for (let x in alias) {
      it[alias[x]] = it[x]
      delete it[x]
    }
  })
  return results
}

Finder.prototype.$group = function (results, args, sources) {
  if (results.length < 2) {
    return results
  }
  if (Array.isArray(args)) {
    if (args.length === 1) {
      return this.$group(results, args[0], sources)
    } else { // 一组
      return results.filter(function (it) {
        return false
      })
    }
  }
  let exists = {}
  let key = args
  return results.filter(function (it) {
    if (exists[it[key]]) {
      return false
    }
    return (exists[it[key]] = true)
  })
}

/*
{
    "$and": [ [ "name",  [ [ "$eq","吴九" ] ] ] ],
    "$any": [
        [ "uid", [ [ "$gt", 1 ] ]],
        [ "name",[ [ "$neq", "" ]]]
    ],
    "$limit": [ 0, 10 ],
    "$fields": [ "uid", "name"]
    $sort: {
      abc: 'desc',
      def: 'asc',
    },
    $alias: {
    name: 'xxx'
    },
    $group: ['name']
}
 */

let rawKeys = ['$sort', '$count', '$alias']

function parseQuery (opts) {
  let keys = Object.keys(opts)
  let andCond = keys.filter(function (key) {
    return key[0] !== '$'
  }).map(function (key) {
    return parseCondation(key, opts[key])
  })

  let filterObj = {
    $and: andCond,
    $any: [],
    $sort: {},
    $group: [],
    $limit: [],
    $alias: {},
    $fields: {}
  }
  keys.filter(function (key) {
    return key[0] === '$'
  }).forEach(function (key) {
    if (key === '$and') {
      filterObj[key] = andCond = andCond.concat(parseCondations(opts[key]))
    } else if (key === '$any') {
      filterObj[key] = opts[key].map(function (val) {
        return processCondations(parseCondations(val))
      })
    } else if (rawKeys.indexOf(key) !== -1) {
      filterObj[key] = opts[key]
    } else if (key === '$fields') {
      let fields = filterObj[key]
      if (typeof opts[key] === 'string') { // $fields: 'string'
        fields[opts[key]] = opts[key]
      } else if (Array.isArray(opts[key])) { // $fields: ['string', 'str']
        opts[key].forEach(function (key) {
          fields[key] = key
        })
      } else if (typeof opts[key] === 'object') {
        filterObj[key] = opts[key]
      }
    } else {
      filterObj[key] = Array.isArray(opts[key]) ? opts[key] : [opts[key]]
    }
  })

  for (let x in filterObj) {
    if (x === '$and') { // 啥也不做, 这个要保留
      continue
    }
    if (Array.isArray(filterObj[x])) { // 删除空数组
      if (!filterObj[x].length) {
        delete filterObj[x]
      }
    } else if (typeof filterObj[x] === 'object') { // 删除空对象
      let got = false
      for (let key in filterObj[x]) {
        got = typeof key
        break
      }
      if (!got) {
        delete filterObj[x]
      }
    }
  }

  filterObj['$and'] && (filterObj['$and'] = processCondations(filterObj['$and']))

  return filterObj
}

function processCondations (args) {
  let ret = {
    compares: []
  }
  let eq = {}
  let gotEq = false
  args.forEach(function (cond) {
    if (cond[1].forEach(function (fields) {
      if (fields[0] === '$eq') {
        eq[cond[0]] = fields[1]
        gotEq = true
      }
      ret.compares.push([cond[0], fields[0], fields[1]])
    }));
  })
  if (gotEq) {
    ret.indexs = eq
  }
  return ret
}

function parseCondations (obj) {
  return Object.keys(obj).map(function (key) {
    return parseCondation(key, obj[key])
  })
}

function parseCondation (key, val) {
  if (val === null || (typeof val !== 'object')) {
    return [key, [
      ['$eq', val]
    ]]
  }
  return [key, Object.keys(val).map(function (it) {
    return [it, val[it]]
  })]
}
