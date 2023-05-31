/** 字段类型 */
export enum FieldBizType {
	STRING = 'string',
	NUMBER = 'number',
	DATETIME = 'datetime',
	/** 超链接 */
	HREF = 'href',
	/** 电话 */
	PHONE = 'phone',
	/** 邮箱 */
	EMAIL = 'email',
	/** 图片 */
	IMAGE = 'image',
	/** 附件 */
	APPEND_FILE = 'appendFile',
	/** 枚举 */
	ENUM = 'enum',
	/** 外键，关联其他表 */
	RELATION = 'relation',
	/** 映射其他表 */
	MAPPING = 'mapping',
	/** 系统表 */
	SYS_USER = 'SYS_USER',
	/** 系统表 */
	SYS_ROLE = 'SYS_ROLE',
	/** 系统表 */
	SYS_ROLE_RELATION = 'SYS_ROLE_RELATION',
	/** 计算字段 */
	CALC = 'calc'
}

/** 数据库字段类型 */
export enum FieldDBType {
	VARCHAR = 'varchar',
	BIGINT = 'bigint',
	MEDIUMTEXT = 'mediumtext',
}

export enum SQLWhereJoiner {
	AND = 'AND',
	OR = 'OR',
}

export enum SQLOperator {
	/** 等于 */
	EQUAL = '=',
	/** 不等于 */
	NOT_EQUAL = '<>',
	/** 匹配 */
	LIKE = 'LIKE',
	/** 不匹配 */
	NOT_LIKE = 'NOT LIKE',
	/** 包含 */
	IN = 'IN',
	/** 不包含 */
	NOT_IN = 'NOT IN',
	/** 大于等于 */
	GE = '>=',
	/** 小于等于 */
	LE = '<=',
}

/** sql 排序规则 */
export enum SQLOrder {
	ASC = 'ASC',
	DESC = 'DESC',
}

/** select 查询 limit 设置值类型 */
export enum SQLLimitType {
	/** 枚举值，20、50、100 等 */
	ENUM = 'ENUM',
	/** 自定义 */
	CUSTOM = 'CUSTOM',
}

/** 默认值 */
export enum DefaultValueWhenCreate {
	/** 当前时间 */
	CURRENT_TIME = '$currentTime'
}
