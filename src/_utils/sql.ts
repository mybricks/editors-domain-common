/** 字段类型 */
enum FieldBizType {
	STRING = 'string',
	NUMBER = 'number',
	/** 外键，关联其他表 */
	RELATION = 'relation',
	/** 映射其他表 */
	MAPPING = 'mapping',
}

/** 数据库字段类型 */
enum FieldDBType {
	VARCHAR = 'varchar',
	BIGINT = 'bigint',
	MEDIUMTEXT = 'mediumtext',
}

enum SQLWhereJoiner {
	AND = 'AND',
	OR = 'OR',
}

enum SQLOperator {
	/** 等于 */
	EQUAL = '=',
	/** 不等于 */
	NOT_EQUAL = '<>',
	/** 匹配 */
	LIKE = 'like',
	/** 不匹配 */
	NOT_LIKE = 'not like',
	/** 包含 */
	IN = 'in',
	/** 不包含 */
	NOT_IN = 'not in',
	/** 大于等于 */
	GE = '>=',
	/** 小于等于 */
	LE = '<=',
}

/** sql 排序规则 */
enum SQLOrder {
	ASC = 'ASC',
	DESC = 'DESC',
}
interface Entity {
	/** 表 ID，在前端编辑页使用 */
	id: string;
	/** 表名 */
	name: string;
	/** 表备注 */
	desc: string;
	fieldAry: Field[];
	selected?: boolean;
}

interface Field {
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
	selected?: string;
	/** 是否为主键 */
	isPrimaryKey?: boolean;
	mapping?: {
		condition: string;
		fieldJoiner: string;
		entity?: Entity;
		type?: string;
		sql: string;
		desc: string;
	};
}

interface Condition {
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

type Order = { fieldId: string; fieldName: string; order: SQLOrder; entityId: string };


/** 根据字段类型返回拼接 sql 的具体指 */
export const getValueByFieldType = (dbType: string, val: string) => {
	switch (dbType) {
	case FieldDBType.VARCHAR: return `'${val}'`;
	case FieldDBType.BIGINT: return val;
	case FieldDBType.MEDIUMTEXT: return `'${val}'`;
	default: return val;
	}
};

/** 根据字段类型以及操作符号返回拼接 sql 的具体指 */
export const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
	if (operator === SQLOperator.LIKE || operator === SQLOperator.NOT_LIKE) {
		return `%${getValueByFieldType(dbType, val)}%`;
	} else if (operator === SQLOperator.IN || operator === SQLOperator.NOT_IN) {
		return `(${val.split(',').map(item => getValueByFieldType(dbType, item)).join(',')})`;
	}

	return getValueByFieldType(dbType, val);
};

type AnyType = any;

/** 根据条件拼接 where sql */
export const spliceWhereSQLFragmentByConditions = (fnParams: {
	conditions: Condition[];
	entities: Entity[];
	/** entityMap 是全量实体表 map */
	entityMap: Record<string, Entity>;
	curEntity: Entity;
	params: Record<string, unknown>;
	whereJoiner?: SQLWhereJoiner;
}, templateMode?) => {
	const { conditions, entities, params, whereJoiner, entityMap, curEntity } = fnParams;
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

	const conditionSqlList: string[] = [];

	curConditions.forEach(condition => {
		let curSQL = '';

		if (condition.conditions) {
			curSQL = spliceWhereSQLFragmentByConditions({
				conditions: condition.conditions,
				entities,
				whereJoiner: condition.whereJoiner,
				params,
				entityMap,
				curEntity,
			}, templateMode);
		} else {
			const entityMapElement = entityMap[condition.entityId];
			const field = entityMapElement?.fieldAry.find(f => f.id === condition.fieldId);
			
			if (field) {
				let fieldName = `${curEntity.name}.${field.name}`;
				
				/** mapping 字段映射的实体 */
				if (entityMapElement.id !== curEntity.id) {
					const mappingField = curEntity.fieldAry.find(f => f.bizType === FieldBizType.MAPPING && f.mapping?.entity?.id === condition.entityId);
					fieldName = `MAPPING_${mappingField?.name || entityMapElement.name}` + '.' + (mappingField?.mapping?.entity?.fieldAry.find(f => f.id === condition.fieldId)?.name || field.name);
				}
				let value = condition.value || '';
				let isEntityField = false;
				/** 支持直接使用数据库字段，如 文件表.id = 用户表.文件id */
				if (condition.value.startsWith('{') && condition.value.endsWith('}')) {
					const curValue = condition.value.substr(1, condition.value.length - 2);

					if (new RegExp(`^${entities.map(e => e.name).join('|')}\\.`).test(curValue)) {
						value = curValue;
						isEntityField = true;
					} else {
						if (templateMode) {
							let key = curValue.substring(curValue.indexOf('.') + 1);
							value = `\${params.${key}}`;
						} else {
							value = params[curValue.substring(curValue.indexOf('.') + 1)] as string;
						}
					}
				}

				curSQL = `${fieldName} ${condition.operator} ${isEntityField ? value : getValueByOperatorAndFieldType(field.dbType, condition.operator!, value)}`;
			}
		}

		curSQL && conditionSqlList.push(curSQL);
	});

	/** 只有多个条件才需要括号拼接 */
	let sql = `${conditionSqlList.length > 1 ? '(' : ''}${conditionSqlList.join(` ${whereJoiner} `)}${conditionSqlList.length > 1 ? ')' : ''}`;
	let prefix = '';
	/** mapping 字段，存在映射且实体存在 */
	const mappingFields = curEntity.fieldAry.filter(field => {
		return field.bizType === FieldBizType.MAPPING && field.mapping?.entity && entityMap[field.mapping.entity?.id];
	});

	/** whereJoiner 不存在表示最外层 SQL */
	if (!whereJoiner) {
		/** 当 condition 存在或者映射字段存在时 */
		if (sql || mappingFields.length) {
			prefix = 'WHERE _STATUS_DELETED = 0 AND ';

			mappingFields.forEach((mappingField, index) => {
				/** 被关联 */
				if (mappingField.mapping?.type === 'primary') {
					const relationField = curEntity.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === mappingField.mapping?.entity?.id);

					if (relationField) {
						prefix += `MAPPING_${mappingField.name}.MAPPING_${mappingField.name}_id = ${curEntity.name}.${relationField.name} ${(sql || index < mappingFields.length - 1) ? 'AND ' : ''}`;
					}
				} else {
					/** 与主实体存在关联关系的外键字段 */
					const relationField = entityMap[mappingField.mapping!.entity!.id]?.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === curEntity.id);

					if (relationField) {
						prefix += `MAPPING_${mappingField.name}.${relationField.name} = ${curEntity.name}.id ${(sql || index < mappingFields.length - 1) ? 'AND ' : ''}`;
					}
				}
			});
		} else {
			prefix = 'WHERE _STATUS_DELETED = 0';
		}
	}

	return prefix + sql;
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
const getFieldIdsByOrdersAndEntityIds = (orders: Order[], entityIds: string[]) => {
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
}) => {
	const { connectors, entity } = fnParams;
	return connectors
		.map(connector => {
			const { from, to } = connector;
			const toFieldName = to.replace('/', '');
			const field = entity.fieldAry.find(f => f.name === toFieldName);
			const fromNames = from.split('/').filter(Boolean);

			let value = 'params';
			fromNames.forEach(key => {
				value += `.${key}`;
			});
			value = `\${${value}}`;

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
	params: Record<string, unknown>;
	limit: number;
	pageIndex?: string;
}, templateMode?) => {
	let { conditions, entities, params, limit, orders, pageIndex } = fnParams;
	const entityMap = {};
	entities.forEach(e => entityMap[e.id] = e);
	const curEntity = entities.find(e => e.selected);

	if (curEntity && curEntity.fieldAry.length) {
		const sql: string[] = [];
		const fieldList: string[] = [];
		const entityNames: string[] = [curEntity.name];

		orders = orders.filter(order => order.fieldId);

		/** mapping 字段，存在映射且实体存在 */
		const mappingFields = curEntity.fieldAry.filter(field => {
			return field.bizType === FieldBizType.MAPPING && field.mapping?.entity && field.mapping?.entity?.fieldAry?.length && entityMap[field.mapping.entity.id];
		});

		mappingFields.forEach(mappingField => {
			const entity = mappingField.mapping!.entity!;
			const condition = mappingField.mapping!.condition!;
			const type = mappingField.mapping!.type!;
			const fieldJoiner = mappingField.mapping!.fieldJoiner!;
			/** 源实体，即实体面板中存在的实体 */
			const originEntity = entityMap[entity.id];

			/** 与主实体存在关联关系的外键字段 */
			let relationField: Field | null = null;
			if (type === 'primary') {
				relationField = originEntity.fieldAry.find(f => f.isPrimaryKey) ?? null;
			} else {
				relationField = originEntity.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === curEntity.id) ?? null;
			}

			if (!relationField) {
				return;
			}

			const isMaxCondition = condition.startsWith('max(') && condition.endsWith(')');
			let entityName = '';
			/** 被关联 */
			if (type === 'primary') {
				if (condition === '-1') {
					entityName = `(SELECT id AS MAPPING_${mappingField.name}_id, ${entity.fieldAry.filter(f => !f.isPrimaryKey).map(f => f.name).join(', ')} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0) AS MAPPING_${mappingField.name}`;
				}
			} else {
				/** 关联 */
				if (condition === '-1') {
					entityName = `(SELECT id AS MAPPING_${mappingField.name}_id, ${relationField.name}, ${entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => `GROUP_CONCAT(${f.name} SEPARATOR '${fieldJoiner}') ${f.name}`)} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name}) AS MAPPING_${mappingField.name}`;
				} else if (isMaxCondition) {
					const filedName = condition.substr(4, condition.length - 5);

					entityName = `(SELECT id AS MAPPING_${mappingField.name}_id, ${relationField.name}, ${entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => f.name)} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 AND ${filedName} IN (SELECT max(${filedName}) FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name})) AS MAPPING_${mappingField.name}`;
				}
			}

			entityNames.push(entityName);
		});

		/** 字段列表 */
		fieldList.push(
			...curEntity.fieldAry
				.filter(field => field.bizType !== FieldBizType.MAPPING && field.selected)
				.map(field => `${curEntity.name}.${field.name}`)
		);
		/** mapping 字段列表 */
		mappingFields.forEach(field => {
			const entity = field.mapping!.entity!;

			fieldList.push(
				...entity.fieldAry.map(f => {
					if (f.isPrimaryKey) {
						return `MAPPING_${field.name}.MAPPING_${field.name}_id AS '${field.name}.${f.name}'`;
					} else {
						return `MAPPING_${field.name}.${f.name} AS '${field.name}.${f.name}'`;
					}
				})
			);
		});

		/** 前置 sql */
		sql.push(`SELECT ${fieldList.join(', ')} FROM ${entityNames.join(', ')}`);
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			entityMap,
			curEntity,
		}, templateMode));

		if (orders.length) {
			const orderList: string[] = [];
			orders.forEach(order => {
				const mappingField = mappingFields.find(m => m.mapping?.entity?.id === order.entityId);

				if (mappingField) {
					const currentField = mappingField.mapping?.entity?.fieldAry.find(f => f.id === order.fieldId);

					currentField && orderList.push(`MAPPING_${mappingField.name}.${currentField.name} ${order.order}`);
				} else {
					const field = curEntity.fieldAry.find(f => f.id === order.fieldId);

					if (field) {
						orderList.push(`${curEntity.name}.${field.name} ${order.order}`);
					}
				}
			});
			orderList.length && sql.push(`ORDER BY ${orderList.join(', ')}`);
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
	params: Record<string, unknown>;
}, templateMode?) => {
	let { conditions, entities, params } = fnParams;
	const entityMap = {};
	entities.forEach(e => entityMap[e.id] = e);
	const curEntity = entities.find(e => e.selected);

	if (curEntity && curEntity.fieldAry.length) {
		const sql: string[] = [];
		const entityNames: string[] = [curEntity.name];

		/** mapping 字段，存在映射且实体存在 */
		const mappingFields = curEntity.fieldAry.filter(field => {
			return field.bizType === FieldBizType.MAPPING && field.mapping?.entity && field.mapping?.entity?.fieldAry?.length && entityMap[field.mapping.entity.id];
		});
		mappingFields.forEach(mappingField => {
			const entity = mappingField.mapping!.entity!;
			const condition = mappingField.mapping!.condition!;
			const type = mappingField.mapping!.type!;
			const fieldJoiner = mappingField.mapping!.fieldJoiner!;
			/** 源实体，即实体面板中存在的实体 */
			const originEntity = entityMap[entity.id];

			/** 与主实体存在关联关系的外键字段 */
			let relationField: Field | null = null;
			if (type === 'primary') {
				relationField = originEntity.fieldAry.find(f => f.isPrimaryKey) ?? null;
			} else {
				relationField = originEntity.fieldAry.find(f => f.bizType === FieldBizType.RELATION && f.relationEntityId === curEntity.id) ?? null;
			}

			if (!relationField) {
				return;
			}

			const isMaxCondition = condition.startsWith('max(') && condition.endsWith(')');
			let entityName = '';
			/** 被关联 */
			if (type === 'primary') {
				if (condition === '-1') {
					entityName = `(SELECT id AS MAPPING_${mappingField.name}_id, ${entity.fieldAry.filter(f => !f.isPrimaryKey).map(f => f.name).join(', ')} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0) AS MAPPING_${mappingField.name}`; entityName = `(SELECT id AS MAPPING_${mappingField.name}_id, ${entity.fieldAry.filter(f => !f.isPrimaryKey).map(f => f.name).join(', ')} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0) AS MAPPING_${mappingField.name}`;
				}
			} else {
				/** 关联 */
				if (condition === '-1') {
					entityName = `(SELECT id AS MAPPING_${mappingField.name}_id, ${relationField.name}, ${entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => `GROUP_CONCAT(${f.name} SEPARATOR '${fieldJoiner}') ${f.name}`)} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name}) AS MAPPING_${mappingField.name}`;
				} else if (isMaxCondition) {
					const filedName = condition.substr(4, condition.length - 5);

					entityName = `(SELECT id AS MAPPING_${mappingField.name}_id, ${relationField.name}, ${entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => f.name)} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 AND ${filedName} IN (SELECT max(${filedName}) FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name})) AS MAPPING_${mappingField.name}`;
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
			entityMap,
			curEntity,
		}, templateMode));

		return sql.join(' ');
	}
};

/** 根据规则以及实体拼接 update 语句 */
export const spliceUpdateSQLByConditions = (fnParams: {
	conditions: Condition;
	connectors: Array<{ from: string; to: string }>;
	entities: Entity[];
	params: Record<string, unknown>;
}, templateMode?) => {
	const { conditions, entities, params, connectors } = fnParams;
	const entityMap = {};
	entities.forEach(e => entityMap[e.id] = e);
	const curEntity = entities.find(e => e.selected);

	if (curEntity) {
		const sql: string[] = [];

		/** 前置 sql */
		sql.push(`UPDATE ${curEntity.name} SET _UPDATE_USER_ID = '', _UPDATE_TIME = \${Date.now()},`);
		sql.push(spliceUpdateSQLFragmentByConditions({
			connectors,
			entity: curEntity,
		}));
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			curEntity,
			entityMap,
		}, templateMode));

		return sql.join(' ');
	}
};

/** 根据规则以及实体拼接 delete 语句 */
export const spliceDeleteSQLByConditions = (fnParams: {
	conditions: Condition;
	entities: Entity[];
	params: Record<string, unknown>;
}, templateMode?) => {
	const { conditions, entities, params } = fnParams;
	const entityMap = {};
	entities.forEach(e => entityMap[e.id] = e);
	const curEntity = entities.find(e => e.selected);

	if (curEntity) {
		const sql: string[] = [];

		/** 前置 sql */
		sql.push(`UPDATE ${curEntity.name} SET _STATUS_DELETED = 1, _UPDATE_USER_ID = '', _UPDATE_TIME = \${Date.now()}`);
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			curEntity,
			entityMap,
		}, templateMode));

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