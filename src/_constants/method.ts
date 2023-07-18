import { FieldBizType } from './field';

export const MethodList = [
	{
		name: '计算',
		type: 'math',
		methods: [
			{
				name: '绝对值',
				method: 'ABS',
				suffix: '()',
				syntax: 'ABS(数字)',
				description: '计算传入数字的绝对值',
				returnType: FieldBizType.NUMBER,
			},
			{
				name: '最大值',
				method: 'GREATEST',
				suffix: '()',
				syntax: 'GREATEST(数字1, [数字2, ...])',
				description: '返回一组数字中的最大值',
				returnType: FieldBizType.NUMBER,
			},
			{
				name: '最小值',
				method: 'LEAST',
				suffix: '()',
				syntax: 'LEAST(数字1, [数字2, ...])',
				description: '返回一组数字中的最小值',
				returnType: FieldBizType.NUMBER,
			},
			{
				name: '加',
				method: '+',
				suffix: '',
				syntax: '数字1 + 数字2',
				description: '返回一组数字中的和',
				returnType: FieldBizType.NUMBER,
			},
			{
				name: '减',
				method: '-',
				suffix: '',
				syntax: '数字1 - 数字2',
				description: '返回一组数字中的差',
				returnType: FieldBizType.NUMBER,
			},
			{
				name: '乘',
				method: '*',
				suffix: '',
				syntax: '数字1 * 数字2',
				description: '返回一组数字中的乘积',
				returnType: FieldBizType.NUMBER,
			},
			{
				name: '除',
				method: '/',
				suffix: '',
				syntax: '数字1 / 数字2',
				description: '返回一组数字除法运算的商',
				returnType: FieldBizType.NUMBER,
			},
			{
				name: '向上取整',
				description: '返回传入数字向上取整的结果',
				syntax: 'CEILING(数字)',
				returnType: FieldBizType.NUMBER,
				method: 'CEILING',
				suffix: '()'
			},
			{
				name: '向下取整',
				description: '返回传入数字向下取整的结果',
				syntax: 'FLOOR(数字)',
				returnType: FieldBizType.NUMBER,
				method: 'FLOOR',
				suffix: '()'
			},
			{
				name: '四舍五入',
				description: '返回传入数字四舍五入后的结果',
				syntax: 'ROUND(数字)',
				returnType: FieldBizType.NUMBER,
				method: 'ROUND',
				suffix: '()'
			},
			{
				name: '随机数',
				description: '返回一个指定范围的伪随机数，例如 Rand(10)，返回一个范围在 10 以内的随机数',
				syntax: 'RAND(数字)',
				returnType: FieldBizType.NUMBER,
				method: 'RAND',
				suffix: '()'
			}
		],
	},
	{
		name: '逻辑',
		type: 'logic',
		methods: [
			{
				name: '是否为空（Null）',
				description: '判断输入值是否为空（Null）',
				syntax: 'IF(列名 is NULL, 1, 0)',
				suffix: '(列名 is NULL, 1, 0)',
				returnType: FieldBizType.NUMBER,
				method: 'IF'
			},
			{
				name: '是否相等',
				description: '判断两个值是否相等',
				syntax: 'IF(值1 = 值2, 1, 0)',
				suffix: '(值1 = 值2, 1, 0)',
				returnType: FieldBizType.NUMBER,
				method: 'IF'
			},
			{
				name: '条件分支',
				description: '按判断条件进行逻辑比较，满足时返回一个值，不满足时返回另一个值，例如 If(1==1, \'你好\', \'hello\') 返回结果为 "你好"',
				syntax: 'IF(判断条件, 满足时返回的值, [不满足时返回的值])',
				suffix: '()',
				returnType: FieldBizType.NUMBER,
				method: 'IF'
			},
			{
				name: 'NULL值兜底',
				description: '当值为 NULL 时，使用兜底值，如 IFNULL(NULL, 兜底值)',
				syntax: 'IFNULL(判断条件, 兜底值)',
				suffix: '()',
				returnType: FieldBizType.CALC,
				method: 'IFNULL'
			}
		],
	},
	{
		name: '日期时间',
		type: 'datetime',
		methods: [
			{
				name: '获取当前日期时间',
				description: '返回当前系统时间，通常与其他日期时间函数搭配使用',
				syntax: 'NOW()',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'NOW'
			},
			{
				name: '获取当前时间',
				description: '获取当前时间，如 16:39:52',
				syntax: 'CURTIME()',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'CURTIME'
			},
			{
				name: '获取当前日期',
				description: '获取当前日期',
				syntax: 'CURDATE()',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'CURDATE'
			},
			{
				name: '日期格式化',
				description: '依照指定格式格式化日期时间',
				syntax: 'DATE_FORMAT(时间, 格式化规则)',
				suffix: '(NOW(), \'%Y-%m-%d %H:%i:%s\')',
				returnType: FieldBizType.DATETIME,
				method: 'DATE_FORMAT'
			},
			{
				name: '获取年份',
				description: '根据日期时间返回该时间的年份',
				syntax: 'YEAR(日期时间)',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'YEAR'
			},
			{
				name: '获取月数',
				description: '根据输入的日期时间返回该时间的月份',
				syntax: 'MONTH(日期时间)',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'MONTH'
			},
			{
				name: '获取天数',
				description: '根据输入的日期时间返回是一个月的第几天，范围为 1-31',
				syntax: 'DAYOFMONTH(日期时间)',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'DAYOFMONTH'
			},
			{
				name: '获取星期数',
				description: '根据输入的日期时间返回该时间的星期数',
				syntax: 'DayOfWeek(日期时间)',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'DayOfWeek'
			},
			{
				name: '使用年月日创建日期时间',
				description: '根据输入的年月日数值返回一个日期类型的数据，例如 Date(2017,3,24)',
				syntax: 'Date(数字,数字,数字)',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'Date'
			},
			{
				name: '获取时间戳',
				description: '根据输入的日期返回该日期的时间戳，精确到秒',
				syntax: 'UNIX_TIMESTAMP(日期时间)',
				suffix: '()',
				returnType: FieldBizType.DATETIME,
				method: 'UNIX_TIMESTAMP'
			}
		],
	},
	{
		name: '聚合',
		type: 'aggregate',
		methods: [
			{
				name: '平均值',
				description: '返回指定列的平均值',
				syntax: 'AVG(列名)',
				returnType: FieldBizType.NUMBER,
				method: 'AVG',
				suffix: '()'
			},
			{
				name: '列值求和',
				description: '返回指定列的所有值之和',
				syntax: 'SUM(列名)',
				returnType: FieldBizType.NUMBER,
				method: 'SUM',
				suffix: '()'
			},
			{
				name: '获取总数',
				description: '返回指定列中非 NULL 值的个数',
				syntax: 'COUNT(列名)',
				suffix: '()',
				returnType: FieldBizType.NUMBER,
				method: 'COUNT'
			},
			{
				name: '列最小值',
				description: '返回指定列的最小值',
				syntax: 'MIN(列名)',
				suffix: '()',
				returnType: FieldBizType.NUMBER,
				method: 'MIN'
			},
			{
				name: '列最大值',
				description: '返回指定列的最大值',
				syntax: 'MAX(列名)',
				suffix: '()',
				returnType: FieldBizType.NUMBER,
				method: 'MAX'
			},
			{
				name: '列值拼接',
				description: '返回由一组列值连接组合的结果',
				syntax: 'GROUP_CONCAT(列名)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'GROUP_CONCAT'
			}
		],
	},
	{
		name: '字符',
		type: 'string',
		methods: [
			{
				name: '字符串拼接',
				description: '将多个字符拼接成字符串',
				syntax: 'CONCAT(字符1, 字符2, ...字符n)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'CONCAT'
			},
			{
				name: '符号间隔拼接',
				description: '将多个字符以分隔符拼接成字符串',
				syntax: 'CONCAT_WS(分隔符, 字符1, 字符2, ...字符n)',
				suffix: '(\',\')',
				returnType: FieldBizType.STRING,
				method: 'CONCAT_WS'
			},
			{
				name: '字符裁剪',
				description: '裁剪指定位置的字符串',
				syntax: 'SUBSTRING(字符, 起始未知, 裁剪的字符长度)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'SUBSTRING'
			},
			{
				name: '转换为小写',
				description: '将字符串中所有字符改变为小写',
				syntax: 'LOWER(字符)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'LOWER'
			},
			{
				name: '转换为大写',
				description: '将字符串中所有字符改变为大写',
				syntax: 'UPPER(字符)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'UPPER'
			},
			{
				name: '获取字符串长度',
				description: '返回字符串中的字符数',
				syntax: 'LENGTH(字符)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'LENGTH'
			},
			{
				name: '去除首尾空格',
				description: '去除字符串首部和尾部的所有空格',
				syntax: 'TRIM(文本)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'TRIM'
			},
			{
				name: '文本替换',
				description: '将字符串子集替换为新字符',
				syntax: 'REPLACE(列名, 要替换的字符, 替换后的字符)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'REPLACE'
			},
			{
				name: '是否包含指定文本',
				description: '返回子串在字符串中第一次出现的位置',
				syntax: 'POSITION(子串, 字符串)',
				suffix: '()',
				returnType: FieldBizType.STRING,
				method: 'POSITION'
			}
		],
	}
];