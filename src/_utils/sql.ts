import { Condition, Entity, Field, Order } from '../_types/domain';
import { FieldBizType, SQLWhereJoiner } from '../_constants/field';
import { getValueByFieldType, getValueByOperatorAndFieldType } from './field';
import { AnyType } from '../_types';

/** 根据条件拼接 where sql */
export const spliceWhereSQLFragmentByConditions = (fnParams: {
	conditions: Condition[];
	entities: Entity[];
	/** entities 是 originEntities 的子集 */
	originEntities: Entity[];
	params: Record<string, unknown>;
	whereJoiner?: SQLWhereJoiner;
}) => {
	const { conditions, entities, params, whereJoiner, originEntities } = fnParams;
	const curConditions = conditions
		.filter(condition => condition.fieldId)
		/** 筛选条件对应值不存在的情况 */
		.filter(condition => {
			if (condition.conditions) {
				return true;
			} else {
				/** 变量 */
				if (condition.value?.startsWith('{') && condition.value?.endsWith('}')) {
					const curValue = condition.value.substr(1, condition.value.length - 2);
					
					/** 非实体字段，即使用的变量，如 params.id */
					if (!new RegExp(`^${originEntities.map(e => e.name).join('|')}\\.`).test(curValue)) {
						return params[curValue.substring(curValue.indexOf('.')+1)] !== undefined;
					}
				} else {
					return condition?.value !== undefined;
				}
			}
			
			return true;
		});
		
	const conditionSqlList: string[] = [];
	
	curConditions.forEach(condition => {
		let curSQL = '';
		
		if (condition.conditions) {
			curSQL = spliceWhereSQLFragmentByConditions({
				conditions: condition.conditions,
				entities,
				whereJoiner: condition.whereJoiner,
				params,
				originEntities,
			});
		} else {
			const field = originEntities.find(e => e.id === condition.entityId)?.fieldAry.find(f => f.id === condition.fieldId);
			
			if (field) {
				let value = condition.value || '';
				let isEntityField = false;
				/** 支持直接使用数据库字段，如 文件表.id = 用户表.文件id */
				if (condition.value.startsWith('{') && condition.value.endsWith('}')) {
					const curValue = condition.value.substr(1, condition.value.length - 2);
					
					if (new RegExp(`^${originEntities.map(e => e.name).join('|')}\\.`).test(curValue)) {
						value = curValue;
						isEntityField = true;
					} else {
						// value = params[curValue.substring(curValue.indexOf('.')+1)] as string;
						let key = curValue.substring(curValue.indexOf('.') + 1);
						value = `\${params.${key}}`;
					}
				}
				
				curSQL = `${field.name} ${condition.operator} ${isEntityField ? value : getValueByOperatorAndFieldType(field.dbType, condition.operator!, value)}`;
			}
		}
		
		curSQL && conditionSqlList.push(curSQL);
	});
	
	/** 只有多个条件才需要括号拼接 */
	let sql = `${conditionSqlList.length > 1 ? '(' : ''}${conditionSqlList.join(` ${whereJoiner} `)}${conditionSqlList.length > 1 ? ')' : ''}`;
	let prefix = '';
	/** mapping 字段，存在映射且实体存在 */
	const mappingFields = entities[0].fieldAry.filter(field => {
		return field.bizType === FieldBizType.MAPPING && field.mapping && originEntities.find(entity => entity.id === field.mapping?.entity?.id);
	});
	
	/** whereJoiner 不存在表示最外层 SQL，当 condition 存在或者映射字段存在时 */
	if ((sql || mappingFields.length) && !whereJoiner) {
		prefix = 'WHERE ';
		const entity = entities[0];
		
		mappingFields.forEach((mappingField, index) => {
			/** 被关联 */
			if (mappingField.mapping?.type === 'primary') {
				const relationField = entity.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === mappingField.mapping?.entity?.id);
				
				if (relationField) {
					prefix += `MAPPING_${mappingField.name}.MAPPING_${mappingField.name}_id = ${entity.name}.${relationField.name} ${(sql || index < mappingFields.length - 1) ? 'AND ' : ''}`;
				}
			} else {
				/** 与主实体存在关联关系的外键字段 */
				const relationField = originEntities.find(e => e.id === mappingField.mapping!.entity!.id)?.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === entity.id);
				
				if (relationField) {
					prefix += `MAPPING_${mappingField.name}.${relationField.name} = ${entity.name}.id ${(sql || index < mappingFields.length - 1) ? 'AND ' : ''}`;
				}
			}
		});
	}
	
	return prefix +  sql;
};

/** 获取 select 查询条件中的实体表 ID 列表 */
const getEntityIdsByConditions = (conditions: Condition[]) => {
	const preEntityIds: string[] = [];
	
	conditions
		.forEach(condition => {
			if (condition.conditions) {
				preEntityIds.push(...getEntityIdsByConditions(condition.conditions));
			} else {
				preEntityIds.push(condition.entityId);
			}
		});
	
	return preEntityIds;
};
/** 获取 select 查询条件中的字段 ID 列表 */
const getFieldIdIdsByConditionsAndEntityIds = (conditions: Condition[], entityIds: string[]) => {
	const preFieldIds: string[] = [];
	
	conditions
		.forEach(condition => {
			if (condition.conditions) {
				preFieldIds.push(...getFieldIdIdsByConditionsAndEntityIds(condition.conditions, entityIds));
			} else if (entityIds.includes(condition.entityId)) {
				preFieldIds.push(condition.fieldId);
			}
		});
	
	return preFieldIds;
};

/** 获取 select 排序中的字段 ID 列表 */
const getFieldIdsByOrdersAndEntityIds = (orders: Order[],  entityIds: string[]) => {
	return orders.filter(order => entityIds.includes(order.entityId)).map(order => order.fieldId);
};

/** 获取 select 排序中的实体表 ID 列表 */
const getEntityIdsByOrders = (orders: Order[]) => {
	return orders.filter(order => order.fieldId).map(order => order.entityId);
};

/** 拼接 update 语句设置值的 sql */
export const spliceUpdateSQLFragmentByConditions = (fnParams: {
	connectors: Array<{ from: string; to: string }>;
	entity: Entity;
	params: Record<string, unknown>;
}) => {
	const { connectors, entity, params } = fnParams;
	return connectors
		.map(connector => {
			const { from, to } = connector;
			const toFieldName = to.replace('/', '');
			const field = entity.fieldAry.find(f => f.name === toFieldName);
			const fromNames = from.split('/').filter(Boolean);
			
			let value = params;
			fromNames.forEach(key => {
				// value = value[key] as AnyType
				value = `\${params.${key}}`;
			});
			
			return field ? `${toFieldName} = ${getValueByFieldType(field.dbType, value as unknown as string)}` : undefined;
		})
		.filter(Boolean)
		.join(', ');
};

/** 根据规则以及实体拼接 select 语句 */
export const spliceSelectSQLByConditions = (fnParams: {
	orders: Order[];
	conditions: Condition;
	entities: Entity[];
	originEntities: Entity[];
	params: Record<string, unknown>;
	limit: number;
	pageIndex?: string;
}) => {
	let { conditions, entities, params, limit, orders, pageIndex, originEntities } = fnParams;
	
	if (entities.length && entities[0].fieldAry?.length) {
		const sql: string[] = [];
		const fieldList: string[] = [];
		const entityNames: string[] = [entities[0].name];
		
		orders = orders.filter(order => order.fieldId);
		
		/** mapping 字段，存在映射且实体存在 */
		const mappingFields = entities[0].fieldAry.filter(field => {
			return field.bizType === FieldBizType.MAPPING && field.mapping && originEntities.find(entity => entity.id === field.mapping?.entity?.id);
		});
		// /** 去重查询使用 mapping 依赖实体中的字段ID */
		// const mappingFieldIdsOfEntity = Array.from(
		// 	new Set(
		// 		[
		// 			...getFieldIdIdsByConditionsAndEntityIds([conditions], mappingFields.map(field => field.mapping!.entity!.id)),
		// 			...getFieldIdsByOrdersAndEntityIds(orders, mappingFields.map(field => field.mapping!.entity!.id))
		// 		]
		// 	)
		// );
		
		mappingFields.forEach(mappingField => {
			const entity = mappingField.mapping!.entity!;
			const condition = mappingField.mapping!.condition!;
			const type = mappingField.mapping!.type!;
			const fieldJoiner = mappingField.mapping!.fieldJoiner!;
			
			/** 源实体，即实体面板中存在的实体 */
			const originEntity = originEntities.find(e => e.id === entity.id)!;
			// const curFields = [
			// 	entity.field,
			// 	/** 连表查询条件 */
			// 	...originEntity.fieldAry.filter(f => mappingFieldIdsOfEntity.includes(f.id))
			// ];
			// const curFields = [entity.field];
			
			/** 与主实体存在关联关系的外键字段 */
			let relationField: Field | null = null;
			if (type === 'primary') {
				relationField = originEntity.fieldAry.find(f => f.name === 'id') ?? null;
			} else {
				relationField = originEntity.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === entities[0].id) ?? null;
			}
			
			if (!relationField) {
				return;
			}
			
			const isMaxCondition = condition.startsWith('max(') && condition.endsWith(')');
			let entityName = '';
			/** 被关联 */
			if (type === 'primary') {
				if (condition === '-1') {
					entityName = `(SELECT id as MAPPING_${mappingField.name}_id, ${entity.field.name} FROM ${originEntity.name}) AS MAPPING_${mappingField.name}`;
				}
			} else {
				/** 关联 */
				if (condition === '-1') {
					entityName = `(SELECT id as MAPPING_${mappingField.name}_id, ${relationField.name}, GROUP_CONCAT(${entity.field.name} SEPARATOR '${fieldJoiner}') ${entity.field.name} FROM ${originEntity.name} GROUP BY ${relationField.name}) AS MAPPING_${mappingField.name}`;
				} else if (isMaxCondition) {
					const filedName = condition.substr(4, condition.length - 5);
					
					entityName = `(SELECT id as MAPPING_${mappingField.name}_id, ${relationField.name}, ${entity.field.name} FROM ${originEntity.name} WHERE ${filedName} IN (SELECT max(${filedName}) FROM ${originEntity.name} GROUP BY ${relationField.name})) AS MAPPING_${mappingField.name}`;
				}
			}
			
			entityNames.push(entityName);
		});
		
		// const entityIds = Array.from(
		// 	new Set(
		// 		[
		// 			...getEntityIdsByConditions([conditions]),
		// 			...entities.filter(entity => entity.fieldAry.length).map(entity => entity.id),
		// 			...getEntityIdsByOrders(orders),
		// 		]
		// 	)
		// );
		
		// entities = entities.filter(entity => entityIds.includes(entity.id));
		
		/** 字段列表 */
		entities.forEach((entity) => {
			fieldList.push(
				...entity.fieldAry
					.filter(field => field.bizType !== FieldBizType.MAPPING)
					.map(field => `${entity.name}.${field.name}`)
			);
		}, []);
		/** mapping 字段列表 */
		mappingFields.forEach(field => {
			const entity = field.mapping!.entity!;
			
			fieldList.push(`MAPPING_${field.name}.${entity.field.name}`);
		});
		
		/** 前置 sql */
		sql.push(`SELECT ${fieldList.join(', ')} FROM ${entityNames.join(', ')}`);
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			originEntities,
		}));
		
		if (orders.length) {
			const orderList: string[] = [];
			orders.forEach(order => {
				const mappingField = mappingFields.find(m => m.mapping?.entity?.field.id === order.fieldId);
				
				if (mappingField) {
					orderList.push(`MAPPING_${mappingField.name}.${mappingField.mapping?.entity?.field.name} ${order.order}`);
				} else {
					const field = entities[0].fieldAry.find(f => f.id === order.fieldId);
					
					if (field) {
						orderList.push(`${entities[0].name}.${field.name} ${order.order}`);
					}
				}
			});
			orderList.length && sql.push(`ORDER BY ${orderList.join(', ')}`);
		}
		
		sql.push(`LIMIT ${limit}`);
		
		if (pageIndex) {
			if (pageIndex.startsWith('{') && pageIndex.endsWith('}')) {
				const curValue = params[pageIndex.slice(pageIndex.indexOf('.')+1, -1)];
				
				if (curValue) {
					sql.push(`OFFSET ${(Number(curValue) - 1) * Number(limit)}`);
				}
			} else if (!Number.isNaN(Number(pageIndex))) {
				sql.push(`OFFSET ${(Number(pageIndex) - 1) * Number(limit)}`);
			}
		}
		
		return sql.join(' ');
	}
};

/** 根据规则以及实体拼接 select 查询总数语句 */
export const spliceSelectCountSQLByConditions = (fnParams: {
	conditions: Condition;
	entities: Entity[];
	orders: Order[];
	originEntities: Entity[];
	params: Record<string, unknown>;
}) => {
	let { conditions, entities, params, originEntities, orders } = fnParams;
	
	if (entities.length && entities[0].fieldAry?.length) {
		const sql: string[] = [];
		const entityNames: string[] = [entities[0].name];
		
		orders = orders.filter(order => order.fieldId);
		
		/** mapping 字段，存在映射且实体存在 */
		const mappingFields = entities[0].fieldAry.filter(field => {
			return field.bizType === FieldBizType.MAPPING && field.mapping && originEntities.find(entity => entity.id === field.mapping?.entity?.id);
		});
		// /** 去重查询使用 mapping 依赖实体中的字段ID */
		// const mappingFieldIdsOfEntity = Array.from(
		// 	new Set(
		// 		[
		// 			...getFieldIdIdsByConditionsAndEntityIds([conditions], mappingFields.map(field => field.mapping!.entity!.id)),
		// 			...getFieldIdsByOrdersAndEntityIds(orders, mappingFields.map(field => field.mapping!.entity!.id))
		// 		]
		// 	)
		// );
		
		mappingFields.forEach(mappingField => {
			const entity = mappingField.mapping!.entity!;
			const condition = mappingField.mapping!.condition!;
			const type = mappingField.mapping!.type!;
			const fieldJoiner = mappingField.mapping!.fieldJoiner!;
			
			/** 源实体，即实体面板中存在的实体 */
			const originEntity = originEntities.find(e => e.id === entity.id)!;
			// const curFields = [
			// 	entity.field,
			// 	/** 连表查询条件 */
			// 	...originEntity.fieldAry.filter(f => mappingFieldIdsOfEntity.includes(f.id))
			// ];
			// const curFields = [entity.field];
			
			/** 与主实体存在关联关系的外键字段 */
			let relationField: Field | null = null;
			if (type === 'primary') {
				relationField = originEntity.fieldAry.find(f => f.name === 'id') ?? null;
			} else {
				relationField = originEntity.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === entities[0].id) ?? null;
			}
			
			if (!relationField) {
				return;
			}
			
			const isMaxCondition = condition.startsWith('max(') && condition.endsWith(')');
			let entityName = '';
			
			/** 被关联 */
			if (type === 'primary') {
				if (condition === '-1') {
					entityName = `(SELECT id as MAPPING_${mappingField.name}_id, ${relationField.name}, ${entity.field.name} FROM ${originEntity.name}) AS MAPPING_${mappingField.name}`;
				}
			} else {
				/** 关联 */
				if (condition === '-1') {
					entityName = `(SELECT id as MAPPING_${mappingField.name}_id, ${relationField.name}, GROUP_CONCAT(${entity.field.name} SEPARATOR '${fieldJoiner}') ${entity.field.name} FROM ${originEntity.name} GROUP BY ${relationField.name}) AS MAPPING_${mappingField.name}`;
				} else if (isMaxCondition) {
					const filedName = condition.substr(4, condition.length - 5);
					
					entityName = `(SELECT id as MAPPING_${mappingField.name}_id, ${relationField.name}, ${entity.field.name} FROM ${originEntity.name} WHERE ${filedName} IN (SELECT max(${filedName}) FROM ${originEntity.name} GROUP BY ${relationField.name})) AS MAPPING_${mappingField.name}`;
				}
			}
			
			entityNames.push(entityName);
		});
		
		/** 前置 sql */
		sql.push(`SELECT count(*) as total FROM ${entityNames.join(', ')}`);
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			originEntities,
		}));
		
		return sql.join(' ');
	}
};

/** 根据规则以及实体拼接 update 语句 */
export const spliceUpdateSQLByConditions = (fnParams: {
	conditions: Condition;
	connectors: Array<{ from: string; to: string }>;
	entities: Entity[];
	params: Record<string, unknown>;
}) => {
	const { conditions, entities, params, connectors } = fnParams;
	const entity = entities[0];
	
	if (entity) {
		const sql: string[] = [];
		
		/** 前置 sql */
		sql.push(`UPDATE ${entity.name} SET`);
		sql.push(spliceUpdateSQLFragmentByConditions({
			connectors,
			entity,
			params,
		}));
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			originEntities: entities,
		}));
		
		return sql.join(' ');
	}
};

/** 根据规则以及实体拼接 delete 语句 */
export const spliceDeleteSQLByConditions = (fnParams: {
	conditions: Condition;
	entities: Entity[];
	params: Record<string, unknown>;
}) => {
	const { conditions, entities, params } = fnParams;
	const entity = entities[0];
	
	if (entity) {
		const sql: string[] = [];
		
		/** 前置 sql */
		sql.push(`DELETE FROM ${entity.name}`);
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			originEntities: entities,
		}));
		
		return sql.join(' ');
	}
};

/** 根据规则以及实体拼接 insert 语句 */
export const spliceInsertSQLByConditions = (fnParams: {
	connectors: Array<{ from: string; to: string }>;
	entities: Entity[];
	params: Record<string, unknown>;
}) => {
	const { entities, params, connectors } = fnParams;
	const entity = entities[0];
	
	if (entity) {
		const fieldNames: string[] = [];
		const values: string[] = [];
		
		connectors
			.forEach(connector => {
				const { from, to } = connector;
				const toFieldName = to.replace('/', '');
				const field = entity.fieldAry.find(f => f.name === toFieldName);
			
				if (field) {
					const fromNames = from.split('/').filter(Boolean);
					let value = params;
				
					fromNames.forEach(key => value = value[key] as AnyType);
					fieldNames.push('`' + toFieldName + '`');
					values.push(getValueByFieldType(field.dbType, value as unknown as string));
				}
			});
		
		return `INSERT INTO ${entity.name} (${fieldNames.join(', ')}) VALUES (${values.join(', ')})`;
	}
};