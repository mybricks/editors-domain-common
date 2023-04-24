import { AnyType } from '../_types';
import { FieldBizType, SQLLimitType, SQLOrder, SQLWhereJoiner } from '../_constants/field';
import { spliceSelectCountSQLByConditions, spliceSelectSQLByConditions } from '../_utils/selectSQL';
import { safeEncodeURIComponent } from '../_utils/util';
import { formatTime, spliceDataFormatString } from '../_utils/format';
import { Entity, SelectedField } from '../_types/domain';


export type T_Field = {
	id: string;
	isPrimaryKey?: boolean;
	/** 私有字段 */
	isPrivate?: boolean;
	name: string;
	desc?: string;
	bizType: string;
	/** 关联的实体表 ID */
	relationEntityId?: string;
	selected?: boolean;
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
	id: string;
	name: string;
	desc?: string;
	selected?: boolean;
	isSystem?: boolean;
	fieldAry: T_Field[];
}

export type T_Condition = {
	fieldId: string;
	entityId?: string;
	fieldName: string;
	operator?: string;
	value?: string;

	conditions?: T_Condition[];
	whereJoiner?: SQLWhereJoiner;
}

export default class QueryCtx {
	paramSchema!: Record<string, unknown>;

	domainModel: AnyType;

	value!: {
		get(): AnyType;
		set(value: AnyType): void;
	};

	showPager!: boolean;

	nowValue!: {
		desc: string
		fields: SelectedField[];
		script?: string | Record<string, string>;
		entities: T_Entity[],
		conditions: T_Condition,
		limit: { type: SQLLimitType; value: number | string };
		pageIndex?: string;
		orders: Array<{ fieldId: string; fieldName: string; order: SQLOrder; entityId: string }>;
	};

	close!: () => void;

	blurAry: Array<() => void> = [];

	addBlur(fn: () => void) {
		this.blurAry.push(fn);
	}

	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());

			this.blurAry = [];
		}
	}
	
	filterConditionByEffectFieldIds(conditions: T_Condition[], allowUseFields: string[]) {
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
		const { entities, conditions, orders, limit, pageIndex } = this.nowValue;
		let desc = '';
		const currentEntity = entities.find(entity => entity.fieldAry.length && entity.selected);

		if (currentEntity && currentEntity.fieldAry.length > 0) {
			desc = `${currentEntity.name} 的 ${currentEntity.fieldAry.filter(f => f.selected).map(field => field.name).join(', ')}`;
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
			let countScript = '';

			const selectScript = `
			async (params, executeSql)=>{
				const FORMAT_MAP = {
					formatTime: ${formatTime.toString()},
				};
				const spliceSelectSQLByConditions = ${spliceSelectSQLByConditions.toString()};
				
				const sql = spliceSelectSQLByConditions({
					params: params || {},
					conditions: ${JSON.stringify(conditions)} || [],
					entities: ${JSON.stringify(entities)},
					limit: ${JSON.stringify(limit)},
					orders: (params.orders && Array.isArray(params.orders)) ? params.orders : ${JSON.stringify(orders)},
					pageIndex: ${JSON.stringify(pageIndex)},
				});
				
				let { rows } = await executeSql(sql);
				
				${spliceDataFormatString(currentEntity as Entity, entities as Entity[])}
				
				return rows;
			}
			`;

			if (this.showPager) {
				countScript = `
				async (params, executeSql)=>{
					const spliceSelectCountSQLByConditions = ${spliceSelectCountSQLByConditions.toString()};
					
					const sql = spliceSelectCountSQLByConditions({
						params: params || {},
						conditions: ${JSON.stringify(conditions)} || [],
						entities: ${JSON.stringify(entities)},
					});
	
					const { rows } = await executeSql(sql);
					
					return rows;
				}
				`;
			}

			if (!this.showPager) {
				this.nowValue.script = safeEncodeURIComponent(selectScript);
			} else {
				this.nowValue.script = {
					list: safeEncodeURIComponent(selectScript),
					total: safeEncodeURIComponent(countScript)
				};
			}
		} else {
			this.nowValue.script = void 0;
		}

		this.nowValue.desc = desc;
		this.value.set(this.nowValue);

		this.close();
	}

	setEntity(entity: AnyType) {
		this.nowValue.entities.forEach(en => {
			en.selected = false;
		});
		entity.selected = true;
		this.nowValue.fields = [{ fieldId: entity.fieldAry[0].id, fieldName: entity.fieldAry[0].name, entityId: entity.id, fromPath: [] }];
	}

	setField(entity: T_Entity, fieldId: string) {
		const field = entity.fieldAry.find(f => f.id === fieldId);
		
		if (field) {
			const selected = this.nowValue.fields.find(
				f => f.fieldId === fieldId && f.entityId === entity.id && !f.fromPath.length
			);
			
			if (!selected) {
				const items = { fieldId: field.id, fieldName: field.name, entityId: entity.id, fromPath: [] };
				this.nowValue.fields.push(items);
				
				if (field.mapping?.entity) {
					field.mapping?.entity.fieldAry.forEach(f => {
						this.nowValue.fields.push({ fieldId: f.id, fieldName: f.name, entityId: (field.mapping?.entity!.id as string), fromPath: [items] });
					});
				}
			} else {
				this.nowValue.fields = this.nowValue.fields.filter(f => (f.fieldId !== field.id && f.entityId === entity.id) && !f.fromPath.some(path => path.fieldId === field.id));
			}
		}
	}
	
	setMappingField(field: SelectedField) {
		const selected = this.nowValue.fields.find(
			f => f.fieldId === field.fieldId
				&& f.entityId === field.entityId
				&& f.fromPath.map(ff => ff.fieldId).join('') === field.fromPath.map(ff => ff.fieldId).join('')
		);
		
		if (selected) {
			this.nowValue.fields = this.nowValue.fields
				.filter(
					f => f.fieldId !== field.fieldId
					|| f.entityId !== field.entityId
					|| f.fromPath.map(ff => ff.fieldId).join('') !== field.fromPath.map(ff => ff.fieldId).join('')
				)
				.filter(f => !f.fromPath.some(ff => ff.fieldId === field.fieldId));
		} else {
			this.nowValue.fields.push(field);
		}
	}
}