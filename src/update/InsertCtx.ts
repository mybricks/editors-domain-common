import { spliceUpdateSQLByConditions } from '../_utils/sql';
import { getParamsByConditions } from '../_utils/params';
import { AnyType } from '../_types';
import { Condition, Entity } from '../_types/domain';
import { safeEncodeURIComponent } from '../_utils/util';
import { FieldBizType } from '../_constants/field';
import { generateValidateScript } from "../_utils/validate";

export type T_Field = {
	id,
	isPrimaryKey,
	name,
	desc
	bizType: string;
	selected: boolean;
	mapping?: {
		condition: string;
		fieldJoiner: string;
		entity?: T_Entity;
		type?: string;
		sql: string;
		desc: string;
	};
}

export type T_Entity = {
	id,
	name,
	desc,
	fieldAry: T_Field[];
	selected: boolean;
}

export default class InsertCtx {
	domainModel: AnyType;

	value!: {
		get, set
	};

	paramSchema!: {
		type,
		properties
	};

	nowValue!: {
		desc: string
		script?: string
		entities: T_Entity[],
		conAry: { from: string, to: string }[];
		conditions: Condition;
	};

	close;

	blurAry: Array<() => void> = [];


	//------------------------------------------------------------

	addBlur(fn: () => void) {
		this.blurAry.push(fn);
	}

	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());
		}
	}
	
	filterConditionByEffectFieldIds(conditions: Condition[], allowUseFields: string[]) {
		conditions.forEach(con => {
			if (con.conditions) {
				this.filterConditionByEffectFieldIds(con.conditions, allowUseFields);
			} else {
				if (!allowUseFields.includes(con.fieldId)) {
					con.fieldId = '';
					con.fieldName = '';
					con.entityId = '';
				}
			}
		});
	}

	save() {
		let { conAry, entities, conditions } = this.nowValue;
		const currentEntity = entities.find(entity => entity.fieldAry.length && entity.selected);
		let desc = '';

		if (currentEntity && currentEntity.fieldAry.length > 0 && conAry.length) {
			desc = `${currentEntity.name}`;
			/** 统计所有允许使用的 field id */
			const allowUseFields: string[] = [];
			currentEntity.fieldAry.forEach(field => {
				if (field.mapping?.entity && field.selected) {
					if (field.bizType !== FieldBizType.MAPPING) {
						allowUseFields.push(field.id);
					}
					field.mapping?.entity?.fieldAry?.filter(field => !field.isPrimaryKey).forEach(f => allowUseFields.push(f.id));
				} else {
					allowUseFields.push(field.id);
				}
			});
			this.filterConditionByEffectFieldIds([conditions], allowUseFields);

			let params = getParamsByConditions(conditions.conditions);
			const sql = spliceUpdateSQLByConditions({
				params,
				conditions: conditions,
				connectors: conAry,
				entities: entities as AnyType[],
			});
			
			let script = `
			(params, context)=>{
        ${generateValidateScript(currentEntity as Entity, conAry)}
				return \`${sql}\`;
			}//@ sourceURL=update.js
			`;
			
			this.nowValue.script = safeEncodeURIComponent(script);
		} else {
			this.nowValue.script = void 0;
		}

		this.nowValue.desc = desc;
		this.value.set(this.nowValue);

		this.close();
	}

	setEntity(entityId) {
		const entity = this.domainModel.entityAry.find(e => e.id === entityId);
		
		if (entity) {
			this.nowValue.entities = [{ ...entity.toJSON(), selected: true }];
			this.nowValue.conAry = [];
		}
	}
}
