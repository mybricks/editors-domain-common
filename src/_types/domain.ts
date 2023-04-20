import { DefaultValueWhenCreate, FieldBizType, FieldDBType, SQLOrder, SQLWhereJoiner } from '../_constants/field';

export interface Entity {
	/** 表 ID，在前端编辑页使用 */
	id: string;
	/** 表名 */
	name: string;
	/** 表备注 */
	desc: string;
	fieldAry: Field[];
	/** 是否被选中 */
	selected?: boolean;
}

export interface Field {
	/** 表字段 ID，真实数据库字段 */
	id: string;
	/** 字段名 */
	name: string;
	/** 字段类型 */
	bizType: FieldBizType;
	dbType: FieldDBType;
	typeLabel: string;
	desc?: string;
	/** 关联的实体表 ID */
	relationEntityId?: string;
	/** 是否为主键 */
	isPrimaryKey?: boolean;
	/** 私有字段 */
	isPrivate?: boolean;
	/** 是否被选中 */
	selected?: boolean;
	/** 映射 */
	mapping?: {
		condition: string;
		fieldJoiner: string;
		entity?: Entity;
		type?: string;
		sql: string;
		desc: string;
	};
	/** 默认值 */
	defaultValueWhenCreate?: DefaultValueWhenCreate;
	/** 查询数据时格式化类型 */
	showFormat: string;
	/** 枚举值 */
	enumValues?: string[]
}

export interface Condition {
	/** 字段 ID */
	fieldId: string;
	/** 实体ID */
	entityId: string;
	/** 字段名 */
	fieldName: string;
	/** 操作符 */
	operator?: string;
	/** 条件语句值 */
	value: string;
	checkExist: boolean;
	conditions: Condition[];
	whereJoiner: SQLWhereJoiner;
}

export type Order = { fieldId: string; fieldName: string; order: SQLOrder; entityId: string };

export interface SelectedField {
	/** 字段 ID */
	fieldId: string;
	/** 字段名 */
	fieldName: string;
	/** 实体ID */
	entityId: string;
	fromPath: SelectedField[];
}