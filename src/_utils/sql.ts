import { Condition, Entity, Order } from '../_types/domain';
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
					if (!new RegExp(`^${entities.map(e => e.name).join('|')}\\.`).test(curValue)) {
						return params[curValue.substring(curValue.indexOf('.') + 1)] !== undefined;
					}
				} else {
					return condition?.value !== undefined;
				}
			}

			return true;
		});

	/** 只有多个条件才需要括号拼接 */
	let sql = curConditions.length > 1 ? '(' : '';

	curConditions.forEach((condition, index) => {
		/** 非第一个条件 */
		if (index > 0) {
			sql += ` ${whereJoiner ?? ''} `;
		}

		if (condition.conditions) {
			sql += spliceWhereSQLFragmentByConditions({
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

					if (new RegExp(`^${entities.map(e => e.name).join('|')}\\.`).test(curValue)) {
						value = curValue;
						isEntityField = true;
					} else {
						// 将真实值替换为模板
						// value = params[curValue.substring(curValue.indexOf('.') + 1)] as string;
						let key = curValue.substring(curValue.indexOf('.') + 1);
						value = `\${params.${key}}`;
					}
				}

				sql += `${condition.fieldName} ${condition.operator} ${isEntityField ? value : getValueByOperatorAndFieldType(field.dbType, condition.operator!, value)}`;
			}
		}
	});

	sql += curConditions.length > 1 ? ')' : '';
	let prefix = '';

	/** 最外层 sql */
	if (sql && !whereJoiner) {
		prefix = 'WHERE ';
		const noRelationEntities = entities.filter(entity => !entity.isRelationEntity);
		const relationEntities = entities.filter(entity => entity.isRelationEntity);

		/** 根据所选择的表，计算需要关联的实体 where 语句 */
		noRelationEntities.forEach(entity => {
			const relationFields = entity.fieldAry.filter(field => field.bizType === FieldBizType.RELATION);

			relationFields.forEach(field => {
				const relationEntity = relationEntities.find(e => e.id === field.relationEntityId);

				if (relationEntity) {
					prefix += `${entity.name}.${field.name} = ${relationEntity.name}.id AND `;
				}
			});
		})
	}

	return prefix + sql;
};

/** 获取 select 查询条件中的实体表 ID 列表 */
const getEntityIdsByConditions = (conditions: Condition[]) => {
	const preEntityIds: string[] = [];

	conditions
		.forEach(condition => {
			if (condition.conditions) {
				return preEntityIds.push(...getEntityIdsByConditions(condition.conditions));
			} else {
				return preEntityIds.push(condition.entityId);
			}
		});

	return preEntityIds;
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
				// 将真实值替换为模板
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

	if (entities.length) {
		const sql: string[] = [];
		let fieldList: string[] = [];
		const entityIds = Array.from(
			new Set(
				[
					...getEntityIdsByConditions([conditions]),
					...entities.filter(entity => entity.fieldAry.length).map(entity => entity.id),
					...getEntityIdsByOrders(orders),
				]
			)
		);

		entities = entities.filter(entity => entityIds.includes(entity.id));
		orders = orders.filter(order => order.fieldId);

		/** 字段列表 */
		entities.forEach((entity) => {
			fieldList.push(...entity.fieldAry.map(field => `${entity.name}.${field.name}`));
		}, []);

		/** 前置 sql */
		sql.push(`SELECT ${fieldList.join(', ')} FROM ${entities.map(entity => entity.name).join(', ')}`);
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			originEntities,
		}));

		if (orders.length) {
			sql.push(`ORDER BY ${orders.map(o => o.fieldName).join(', ')}`)
		}

		sql.push(`LIMIT ${limit}`);

		if (pageIndex) {
			if (pageIndex.startsWith('{') && pageIndex.endsWith('}')) {
				const curValue = params[pageIndex.slice(pageIndex.indexOf('.') + 1, -1)];

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

	if (entities.length) {
		const sql: string[] = [];
		const entityIds = Array.from(
			new Set(
				[
					...getEntityIdsByConditions([conditions]),
					...entities.filter(entity => entity.fieldAry.length).map(entity => entity.id),
					...getEntityIdsByOrders(orders),
				]
			)
		);

		entities = entities.filter(entity => entityIds.includes(entity.id));

		/** 前置 sql */
		sql.push(`SELECT count(*) as total FROM ${entities.map(entity => entity.name).join(', ')}`);
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