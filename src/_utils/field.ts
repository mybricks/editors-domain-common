import { FieldDBType } from '../_constants/field';

/** 获取数据库字段类型 schema */
export const getFieldSchema = (dbType: string) => {
	let type = '';
	switch (dbType) {
	case FieldDBType.VARCHAR: {
		type = 'string';
		break;
	}
	case FieldDBType.BIGINT: {
		type = 'number';
		break;
	}
	case FieldDBType.MEDIUMTEXT: {
		type = 'string';
		break;
	}
	}
	
	return { type };
};

/** 获取判断字段查询的条件符号 */
export const getFieldConditionAry = (dbType: string): Array<{ label: string; value: string }> => {
	switch (dbType) {
	case FieldDBType.VARCHAR: {
		return [
			{
				label: '等于',
				value: '='
			},
			{
				label: '不等于',
				value: '<>'
			}
		];
	}
	case FieldDBType.BIGINT: {
		return [
			{
				label: '等于',
				value: '='
			},
			{
				label: '不等于',
				value: '<>'
			}
		];
	}
	case FieldDBType.MEDIUMTEXT: {
		return [
			{
				label: '等于',
				value: '='
			},
			{
				label: '不等于',
				value: '<>'
			}
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

/** 根据字段类型返回拼接 sql 的具体指 */
export const getValueByFieldType = (dbType: string, val: string) => {
	switch (dbType) {
	case FieldDBType.VARCHAR: return `'${val}'`;
	case FieldDBType.BIGINT: return val;
	case FieldDBType.MEDIUMTEXT: return `'${val}'`;
	default: return val;
	}
};