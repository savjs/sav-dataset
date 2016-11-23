import test from 'ava'
import dataset, {DataSet} from '../'
import {isFunction, isObject} from 'sav-util'

test('dataset#api', (ava) => {
  ava.true(isObject(dataset))

  const ds = new DataSet()
  ava.true(isFunction(ds.setTransfer))
  ava.true(isFunction(ds.collection))
  ava.true(isFunction(ds.reset))
})
