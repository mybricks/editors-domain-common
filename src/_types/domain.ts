import { FieldBizType, FieldDBType, SQLWhereJoiner } from '../_constants/field';
import { AnyType } from './index';

export interface Entity {
	/** 表 ID，在前端编辑页使用 */
	id: string;
	/** 表名 */
	name: string;
	/** 表备注 */
	desc: string;
	fieldAry: Field[];
	/** 关联表，在 editor 中使用 */
	isRelationEntity?: boolean;
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
	mapping?: {
		condition: string;
		fieldJoiner: string;
		entity?: Omit<Entity, 'fieldAry'> & { field: Field };
		sql: string;
		desc: string;
	};
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
	conditions: Condition[];
	whereJoiner: SQLWhereJoiner;
}