import { FieldBizType, FieldDBType, SQLOperator } from '../_constants/field';
import { Field } from '../_types/domain';

/** 获取数据库字段类型 schema */
export const getFieldSchema = (field: Field) => {
	let type = '';
	switch (field.dbType) {
	case FieldDBType.VARCHAR: {
		type = field.bizType === FieldBizType.ENUM ? 'enum' : 'string';
		break;
	}
	case FieldDBType.BIGINT: {
		type = 'number';
		break;
	}
	case FieldDBType.MEDIUMTEXT: {
		type = field.bizType === FieldBizType.JSON ? 'any' : 'string';
		break;
	}
	}
	
	return { type };
};

/** 获取判断字段查询的条件符号 */
export const getFieldConditionAry = (dbType: string): Array<{ label: string; value: string; notNeedValue?: boolean }> => {
	switch (dbType) {
	case FieldDBType.VARCHAR: {
		return [
			{ label: '等于(=)', value: '=' },
			{ label: '不等于(<>)', value: '<>' },
			{ label: '匹配(LIKE)', value: 'LIKE' },
			{ label: '不匹配(NOT LIKE)', value: 'NOT LIKE' },
			{ label: '包含(IN)', value: 'IN' },
			{ label: '不包含(NOT IN)', value: 'NOT IN' },
			{ label: '等于 NULL', value: 'IS NULL', notNeedValue: true },
			{ label: '不等于 NULL', value: 'IS NOT NULL', notNeedValue: true },
		];
	}
	case FieldDBType.BIGINT: {
		return [
			{ label: '等于(=)', value: '=' },
			{ label: '不等于(<>)', value: '<>' },
			{ label: '大于(>)', value: '>' },
			{ label: '小于(<)', value: '<' },
			{ label: '大于等于(>=)', value: '>=' },
			{ label: '小于等于(<=)', value: '<=' },
			{ label: '包含(IN)', value: 'IN' },
			{ label: '不包含(NOT IN)', value: 'NOT IN' },
			{ label: '等于 NULL', value: 'IS NULL', notNeedValue: true },
			{ label: '不等于 NULL', value: 'IS NOT NULL', notNeedValue: true },
		];
	}
	case FieldDBType.MEDIUMTEXT: {
		return [
			{ label: '等于(=)', value: '=' },
			{ label: '不等于(<>)', value: '<>' },
			{ label: '匹配(LIKE)', value: 'LIKE' },
			{ label: '不匹配(NOT LIKE)', value: 'NOT LIKE' },
			{ label: '包含(IN)', value: 'IN' },
			{ label: '不包含(NOT IN)', value: 'NOT IN' },
			{ label: '等于 NULL', value: 'IS NULL', notNeedValue: true },
			{ label: '不等于 NULL', value: 'IS NOT NULL', notNeedValue: true },
		];
	}
	default: return [];
	}
};

/** 根据字段类型获取 sql 拼接时字段值的符号 */
export const getQuoteByFieldType = (dbType: string) => {
	switch (dbType) {
	case FieldDBType.VARCHAR: {
		return '\'';
	}
	case FieldDBType.BIGINT: {
		return '';
	}
	case FieldDBType.MEDIUMTEXT: {
		return '\'';
	}
	default: return '';
	}
};

/** 根据字段类型返回拼接 sql 的具体值 */
export const getValueByFieldType = (dbType: string, val: string) => {
	switch (dbType) {
	case FieldDBType.VARCHAR: return `'${val}'`;
	case FieldDBType.BIGINT: return val;
	case FieldDBType.MEDIUMTEXT: return `'${val}'`;
	default: return val;
	}
};

/** 根据字段类型以及操作符号返回拼接 sql 的具体值 */
export const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
	const value = `\${${val}}`;
	if (operator === SQLOperator.LIKE || operator === SQLOperator.NOT_LIKE) {
		return `'%${value}%'`;
	} else if (operator === SQLOperator.IN || operator === SQLOperator.NOT_IN) {
		const quote = getQuoteByFieldType(dbType);
		return `(\${(Array.isArray(${val}) ? ${val} : String(${val}).split(',')).map(item => \`${quote}\${item}${quote}\`).join(',')})`;
	}
	
	return getValueByFieldType(dbType, value);
};

export const getSchemaTypeByFieldType = (field: Field) => {
	switch (field.bizType) {
	case FieldBizType.ENUM:
		return 'enum';
	case FieldBizType.DATETIME:
		return field.showFormat ? 'string' : 'number';
	case FieldBizType.STRING:
		return 'string';
	case FieldBizType.NUMBER:
		return 'number';
	case FieldBizType.JSON:
		return 'any';
	case FieldBizType.RELATION:
		return 'number';
	case FieldBizType.SYS_USER:
		return 'number';
	case FieldBizType.SYS_ROLE:
		return 'number';
	case FieldBizType.SYS_ROLE_RELATION:
		return 'number';
	case FieldBizType.MAPPING:
		return 'any';
	case FieldBizType.CALC:
		return getSchemaTypeByFieldType({ ...field, bizType: field.filedBizType as FieldBizType });
	default: return 'any';
	}
};

export const getDBTypeByFieldBizType = (bizType: FieldBizType) => {
	switch (bizType) {
	case FieldBizType.ENUM:
		return FieldDBType.VARCHAR;
	case FieldBizType.DATETIME:
		return FieldDBType.BIGINT;
	case FieldBizType.STRING:
		return FieldDBType.VARCHAR;
	case FieldBizType.NUMBER:
		return FieldDBType.BIGINT;
	case FieldBizType.JSON:
		return FieldDBType.MEDIUMTEXT;
	case FieldBizType.RELATION:
		return FieldDBType.BIGINT;
	default: return FieldDBType.VARCHAR;
	}
};
