import test from 'ava'
import {DataSet} from '../'
import {isFunction} from 'sav-util'

test('dataset#api', (ava) => {
  const ds = new DataSet()

  ava.true(isFunction(ds.setTransfer))
  ava.true(isFunction(ds.collection))
  ava.true(isFunction(ds.reset))
})
