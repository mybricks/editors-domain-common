import { AnyType } from '../_types';
import { FieldBizType, SQLLimitType, SQLOrder, SQLWhereJoiner } from '../_constants/field';
import { spliceSelectSQLByConditions } from '../_utils/selectSQL';
import { safeEncodeURIComponent } from '../_utils/util';
import { formatTime, spliceDataFormatString } from '../_utils/format';
import { Entity, Field, SelectedField } from '../_types/domain';
import { getSchemaTypeByFieldType } from '../_utils/field';
import { getEntityFieldMap } from '../_utils/entity';

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
	fromPath: SelectedField[];
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
		pageNum?: string;
		orders: Array<{ fieldId: string; fieldName: string; order: SQLOrder; entityId: string; fromPath: SelectedField[] }>;
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
	
	getOutputSchema() {
		const { fields, entities } = this.nowValue;
		const entityFieldMap: Record<string, Field> = getEntityFieldMap(entities as Entity[]);
		const originSchema: AnyType = this.showPager ? {
			type: 'object',
			properties: {
				dataSource: { type: 'array', items: { type: 'object', properties: {} } },
				total: { type: 'number' },
				pageNum: { type: 'number' },
				pageSize: { type: 'number' }
			}
		} : {
			type: 'array',
			items: { type: 'object', properties: {} }
		};
		
		fields.forEach(field => {
			const paths = [...field.fromPath, field];
			let curSchema = this.showPager ? originSchema.properties!.dataSource.items.properties : originSchema.items!.properties as AnyType;
			
			for (let i = 0; i < paths.length; i++) {
				const path = paths[i];
				const entityField = entityFieldMap[path.entityId + path.fieldId];
				
				if (i < paths.length - 1) {
					const isForeigner = entityField.mapping?.type === 'foreigner';
					
					if (!curSchema[entityField.name]) {
						curSchema[entityField.name] = isForeigner ? { type: 'array', items: { type: 'object', properties: {} } } : { type: 'object', properties: {} };
						
						if (entityField.bizType !== FieldBizType.MAPPING) {
							curSchema['_' + entityField.name] = { type: getSchemaTypeByFieldType(entityField) };
						}
					} else if (curSchema[entityField.name].type !== 'array' && curSchema[entityField.name].type !== 'object') {
						if (entityField.bizType !== FieldBizType.MAPPING) {
							curSchema['_' + entityField.name] = curSchema[entityField.name];
						}
						curSchema[entityField.name] = isForeigner ? { type: 'array', items: { type: 'object', properties: {} } } : { type: 'object', properties: {} };
					}
					
					curSchema = isForeigner ? curSchema[entityField.name]?.items?.properties : curSchema[entityField.name]?.properties as AnyType;
				} else {
					curSchema[entityField.name] = { type: getSchemaTypeByFieldType(entityField) };
					
					if (entityField.bizType === FieldBizType.DATETIME && entityField.showFormat) {
						curSchema['_' + entityField.name] = { type: 'number' };
					}
					
					/** 当映射字段其中所有子字段都没被选中时 */
					if (entityField.bizType === FieldBizType.MAPPING && !fields.find(f => f.fromPath.find(path => path.fieldId === entityField.id))) {
						delete curSchema[entityField.name];
					}
				}
			}
		});
		
		return originSchema;
	}

	save() {
		const { entities, conditions, orders, limit, pageNum, fields } = this.nowValue;
		let desc = '';
		const currentEntity = entities.find(entity => entity.fieldAry.length && entity.selected);

		if (currentEntity) {
			const currentFieldIds = fields.filter(f => f.entityId === currentEntity.id && !f.fromPath.length).map(f => f.fieldId);
			desc = `${currentEntity.name} 的 ${currentEntity.fieldAry.filter(f => currentFieldIds.includes(f.id)).map(f => f.name).join(', ')}`;
			/** 实体 + 字段的 Map */
			const entityFieldMap: Record<string, Field> = getEntityFieldMap(entities as Entity[]);
			const needFormatFields = fields.map(f => {
				const curField = entityFieldMap[f.entityId + f.fieldId];
				
				if (curField.showFormat && curField.bizType === FieldBizType.DATETIME) {
					return [
						...f.fromPath.map(p => ({ key: entityFieldMap[p.entityId + p.fieldId].name })),
						{ key: curField.name, showFormat: curField.showFormat }
					];
				} else if (curField.bizType === FieldBizType.ENUM) {
					return [
						...f.fromPath.map(p => ({ key: entityFieldMap[p.entityId + p.fieldId].name })),
						{ key: curField.name, showFormat: 'JSON' }
					];
				}
				
				return undefined;
			}).filter(Boolean) as AnyType[];
			const selectScript = `
			async (params, context)=>{
				const { executeSql, isEdit } = context;
				const FORMAT_MAP = {
					formatTime: ${formatTime.toString()},
				};
				const spliceSelectSQLByConditions = ${spliceSelectSQLByConditions.toString()};
				params = params || {};
				const [sql, countSql] = spliceSelectSQLByConditions({
					params: params || {},
					fields: ${JSON.stringify(fields)} || [],
					conditions: ${JSON.stringify(conditions)} || [],
					entities: ${JSON.stringify(entities)},
					limit: ${JSON.stringify(limit)},
					showPager: ${JSON.stringify(this.showPager || false)},
					orders: (params.orders && Array.isArray(params.orders)) ? params.orders : ${JSON.stringify(orders)},
					pageNum: ${JSON.stringify(pageNum)},
					isEdit,
				});
				${this.showPager ? `
					let { rows } = await executeSql(sql);
					rows = Array.from(rows || []);
					const { rows: countRows } = await executeSql(countSql);
					${needFormatFields.length ? spliceDataFormatString(entityFieldMap, needFormatFields) : ''}
					return { dataSource: rows, total: countRows[0] ? countRows[0].total : 0, pageNum: params.pageNum || 1, pageSize: params.pageSize || 50 };
				` : `
					let { rows } = await executeSql(sql);
					rows = Array.from(rows || []);
					${needFormatFields.length ? spliceDataFormatString(entityFieldMap, needFormatFields) : ''}
					return rows;
				`}
			}//@ sourceURL=select.js
			`;
			
			this.nowValue.script = safeEncodeURIComponent(selectScript);
		} else {
			this.nowValue.script = void 0;
		}
		
		this.nowValue.desc = desc;
		this.value.set({ ...this.nowValue, outputSchema: this.getOutputSchema() });

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
					this.nowValue.fields.push(
						...(
							field.mapping?.entity.fieldAry.map(f => ({ fieldId: f.id, fieldName: f.name, entityId: (field.mapping?.entity!.id as string), fromPath: [items] }))
							|| []
						)
					);
				}
			} else {
				this.nowValue.fields = this.nowValue.fields.filter(f => !(f.fieldId === field.id && !f.fromPath.length || (f.fromPath.length === 1 && f.fromPath[0].fieldId === field.id)));
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
	
	onSelectAllFields(checked: boolean) {
		if (checked) {
			this.nowValue.fields = [];
		} else {
			const curEntity = this.nowValue.entities.find(e => e.selected);
			
			if (curEntity) {
				const curFields: SelectedField[] = [];
				curEntity.fieldAry
					.filter(f => !f.isPrivate)
					.forEach(field => {
						const items = { fieldId: field.id, fieldName: field.name, entityId: curEntity.id, fromPath: [] };
						curFields.push(items);
						
						if (field.mapping?.entity) {
							curFields.push(
								...(
									field.mapping?.entity.fieldAry.map(f => ({ fieldId: f.id, fieldName: f.name, entityId: (field.mapping?.entity!.id as string), fromPath: [items] }))
									|| []
								)
							);
						}
					});
				
				this.nowValue.fields = curFields;
			}
		}
	}
}
