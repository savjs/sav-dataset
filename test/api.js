import test from 'ava'
import dataset, {DataSet} from '../'
import {isFunction, isObject} from 'sav-util'

const DataStudent = {
  name: 'student',
  unique: {
    id: 'id'
  }
}
const testStudent1 = [
  {
    id: 1,
    name: '张三',
    age: 24,
    gender: '男'
  },
  {
    id: 2,
    name: '莉莉',
    age: 24,
    gender: '女'
  }
]
const testStudent2 = {
  id: 1,
  name: '张三',
  age: 24,
  gender: '男'
}

test('dataset#api', (ava) => {
  ava.true(isObject(dataset))

  const ds = new DataSet()
  ava.true(isFunction(ds.setTransfer))
  ava.true(isFunction(ds.collection))
  ava.true(isFunction(ds.reset))
  var database = ds.collection(DataStudent)
  ava.true(isObject(database))
  ava.true(isFunction(database.find))
  ava.true(isFunction(database.insert))
  ava.true(isFunction(database.update))
  ava.true(isFunction(database.insertUpdate))
  ava.true(isFunction(database.remove))
  var test1 = database.insert(testStudent1)
  ava.true(isFunction(test1.then))
  var test2 = database.insertUpdate(testStudent1)
  ava.true(isFunction(test2.then))
  var test3 = database.update(testStudent1)
  ava.true(isFunction(test3.then))
  var test4 = database.remove(testStudent2)
  ava.true(isFunction(test4.then))
  ava.true(isFunction(database.find().then))
})
