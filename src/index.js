export * from './DataSet'

/*

DataSet
	->collection({
		name: 'user',
		primary: ['id'],
		unique: {
			uid_aid: ['uid', 'aid']
		}
	})
	->payload('user')

Collection
	->find({
// 条件选项
		id: 1,  // 相当于 id: {$is: 1}, 有索引的字段具有高优先级
		name: { $in: ['a', 'b']},
		age:  { $gt: 10 },
// 结果选项
		// 输出字段
		$fields:[ 'uid', 'name'], 	// 要保留的数字
	})
	->insert()
	->update()
	->insertUpdate()

find 处理逻辑
1.选项分离
	》条件选项
		》条件分组
			》条件内容
				$is 	取值
				
				$eq     相等
				$neq    不等

			》AND分组过滤
				》选项重组
					》主键索引处理
					》全文索引处理
			》OR分组
				》匹配到则结束
					》选项重组
						》主键索引处理
						》全文索引处理
	》结果选项
		》排序
		》偏移
		》限制
		》字段


*/