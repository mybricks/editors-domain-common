/** 字段类型 */
export enum FieldBizType {
	STRING = 'string',
	NUMBER = 'number',
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
	LIKE = 'like',
	/** 不匹配 */
	NOT_LIKE = 'not like',
	/** 包含 */
	IN = 'in',
	/** 不包含 */
	NOT_IN = 'not in',
	/** 大于等于 */
	GE = '>=',
	/** 小于等于 */
	LE = '<=',
}