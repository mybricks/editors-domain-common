import { AnyType } from '../_types';
import { SQLWhereJoiner } from '../_constants/field';
import { spliceWhereSQLByConditions } from '../_utils/sql';

export type T_Field = {
  id,
  isPrimaryKey,
  name,
  desc
}

export type T_Entity = {
  id,
  name,
  desc,
  fieldAry: T_Field[]
}

export type T_Condition = {
	/** 是否判断数据为空，为空时条件不生效 */
	checkExist?: boolean;
  fieldId: string;
	entityId?: string;
  fieldName: string;
  operator?: string;
  value?: string;
	
	conditions?: T_Condition[];
	whereJoiner?: SQLWhereJoiner;
}

export default class QueryCtx {
	editorEle:HTMLElement;

	paramSchema:{};

	domainModel: AnyType;

	value: {
    get, set
  };

	nowValue: {
    desc: string
    sql: string
    entities: T_Entity[],
    conditions: T_Condition,
    limit
  };

	close;

	blurAry = [];

	addBlur(fn) {
		this.blurAry.push(fn);
	}

	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());

			this.blurAry = [];
		}
	}

	save() {
		const { entities, conditions, limit } = this.nowValue;
		let desc = '';

		if (entities?.length > 0) {
			const sql = [];
			let fieldList: string[] = [];
			/** 字段列表 */
			entities.forEach((entity) => {
				desc = `${desc ? `${desc};\n` : ''}${entity.name} 的 ${entity.fieldAry.map(field => field.name).join(', ')}`;
				
				fieldList.push(...entity.fieldAry.map(field => `${entity.name}.${field.name}`));
			}, []);

			/** 前置 sql */
			sql.push(`SELECT ${fieldList.join(', ')} FROM ${entities.map(entity => entity.name).join(', ')}`);

			sql.push(spliceWhereSQLByConditions([conditions as AnyType], entities as AnyType));

			sql.push(`LIMIT ${limit}`);

			this.nowValue.sql = sql.join(' ');
		} else {
			this.nowValue.sql = '';
		}
		this.nowValue.desc = desc;
		this.value.set(this.nowValue);

		this.close();
	}

	setEntity(entity: AnyType) {
		const ent = entity.toJSON();
		const index = this.nowValue.entities?.findIndex(e => e.id === entity.id);
		
		if (index >= 0) {
			this.nowValue.entities.splice(index, 1);
		} else {
			this.nowValue.entities.push(ent);
		}
	}

	setField(entity: T_Entity, fieldId: string) {
		const oriEntity = this.domainModel.entityAry.find((e: T_Entity) => e.id === entity.id);
		const nowEntity = this.nowValue.entities.find(e => e.id === entity.id);
		
		if (!nowEntity) {
			return;
		}
		
		const field = nowEntity.fieldAry.find(f => f.id === fieldId);
		
		if (field) {
			nowEntity.fieldAry = nowEntity.fieldAry.filter(f => f.id !== fieldId);
		} else {
			nowEntity.fieldAry = oriEntity.fieldAry
				.map((oriF: T_Field) => {
					let field = nowEntity.fieldAry.find(f => f.id === oriF.id);
				
					if (field) {//exits
						return field;
					} else if (oriF.id === fieldId) {
						return (oriF as AnyType).toJSON() as T_Field;
					}
				})
				.filter(Boolean);
		}
	}

	addCondition(params: { isGroup: boolean; parentCondition: T_Condition }) {
		const { isGroup, parentCondition } = params;
		
		if (parentCondition) {
			parentCondition.conditions!.push(
				isGroup ? {
					fieldId: String(Date.now()),
					fieldName: '条件组',
					conditions: [],
					whereJoiner: SQLWhereJoiner.AND,
				} : {
					entityId: '',
					fieldId: '',
					fieldName: '',
					operator: void 0,
					value: ''
				}
			);
		} else {
			this.nowValue.conditions.conditions!.push(
				isGroup ? {
					fieldId: String(Date.now()),
					fieldName: '条件组',
					conditions: [],
					whereJoiner: SQLWhereJoiner.AND,
				} : {
					fieldId: '',
					fieldName: '',
					operator: void 0,
					value: ''
				}
			);
		}
	}

	removeCondition(params: { index: number; parentCondition: T_Condition }) {
		const { index, parentCondition } = params;
		
		parentCondition.conditions = parentCondition.conditions?.filter((_, idx) => idx !== index);
	}
}