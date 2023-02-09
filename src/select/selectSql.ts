export const spliceSelectSQLByConditions = (fnParams) => {
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
		/** 关联表，在 editor 中使用 */
		isRelationEntity?: boolean;
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
		/** 是否为主键 */
		isPrimaryKey?: boolean;
		mapping?: {
			condition: string;
			fieldJoiner: string;
			entity?: Omit<Entity, 'fieldAry'> & { field: Field };
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

	const getValueByFieldType = (dbType: string, val: string) => {
		switch (dbType) {
			case FieldDBType.VARCHAR: return `'${val}'`;
			case FieldDBType.BIGINT: return val;
			case FieldDBType.MEDIUMTEXT: return `'${val}'`;
			default: return val;
		}
	};

	const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
		if (operator === SQLOperator.LIKE || operator === SQLOperator.NOT_LIKE) {
			return `%${getValueByFieldType(dbType, val)}%`;
		} else if (operator === SQLOperator.IN || operator === SQLOperator.NOT_IN) {
			return `(${val.split(',').map(item => getValueByFieldType(dbType, item)).join(',')})`;
		}

		return getValueByFieldType(dbType, val);
	};

	const spliceWhereSQLFragmentByConditions = (fnParams: {
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
							value = params[curValue.substring(curValue.indexOf('.') + 1)] as string;
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

		return prefix + sql;
	};

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

		mappingFields.forEach(mappingField => {
			const entity = mappingField.mapping!.entity!;
			const condition = mappingField.mapping!.condition!;
			const type = mappingField.mapping!.type!;
			const fieldJoiner = mappingField.mapping!.fieldJoiner!;

			/** 源实体，即实体面板中存在的实体 */
			const originEntity = originEntities.find(e => e.id === entity.id)!;
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
export const spliceSelectCountSQLByConditions = (fnParams) => {

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
		/** 关联表，在 editor 中使用 */
		isRelationEntity?: boolean;
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
		/** 是否为主键 */
		isPrimaryKey?: boolean;
		mapping?: {
			condition: string;
			fieldJoiner: string;
			entity?: Omit<Entity, 'fieldAry'> & { field: Field };
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

	const getValueByFieldType = (dbType: string, val: string) => {
		switch (dbType) {
			case FieldDBType.VARCHAR: return `'${val}'`;
			case FieldDBType.BIGINT: return val;
			case FieldDBType.MEDIUMTEXT: return `'${val}'`;
			default: return val;
		}
	};

	const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
		if (operator === SQLOperator.LIKE || operator === SQLOperator.NOT_LIKE) {
			return `%${getValueByFieldType(dbType, val)}%`;
		} else if (operator === SQLOperator.IN || operator === SQLOperator.NOT_IN) {
			return `(${val.split(',').map(item => getValueByFieldType(dbType, item)).join(',')})`;
		}

		return getValueByFieldType(dbType, val);
	};

	const spliceWhereSQLFragmentByConditions = (fnParams: {
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
							value = params[curValue.substring(curValue.indexOf('.') + 1)] as string;
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

		return prefix + sql;
	};

	let { conditions, entities, params, originEntities, orders } = fnParams;

	if (entities.length && entities[0].fieldAry?.length) {
		const sql: string[] = [];
		const entityNames: string[] = [entities[0].name];

		orders = orders.filter(order => order.fieldId);

		/** mapping 字段，存在映射且实体存在 */
		const mappingFields = entities[0].fieldAry.filter(field => {
			return field.bizType === FieldBizType.MAPPING && field.mapping && originEntities.find(entity => entity.id === field.mapping?.entity?.id);
		});

		mappingFields.forEach(mappingField => {
			const entity = mappingField.mapping!.entity!;
			const condition = mappingField.mapping!.condition!;
			const type = mappingField.mapping!.type!;
			const fieldJoiner = mappingField.mapping!.fieldJoiner!;

			/** 源实体，即实体面板中存在的实体 */
			const originEntity = originEntities.find(e => e.id === entity.id)!;

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
