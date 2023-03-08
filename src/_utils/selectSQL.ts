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
	bizType: AnyType;
	dbType: AnyType;
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
	whereJoiner: AnyType;
}

type Order = { fieldId: string; fieldName: string; order: AnyType; entityId: string };

type AnyType = any;

/** 根据规则以及实体拼接 select 语句 */
export const spliceSelectSQLByConditions = (fnParams: {
	orders: Order[];
	conditions: Condition;
	entities: Entity[];
	params: Record<string, unknown>;
	limit: { type: string; value: number | string };
	pageIndex?: string;
}, templateMode?) => {
	/** 根据字段类型返回拼接 sql 的具体指 */
	const getValueByFieldType = (dbType: string, val: string) => {
		switch (dbType) {
		case "varchar": return `"${val}"`;
		case "bigint": return val;
		case "mediumtext": return `"${val}"`;
		default: return val;
		}
	};
	
	/** 根据字段类型以及操作符号返回拼接 sql 的具体值 */
	const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
		if (operator === "LIKE" || operator === "NOT LIKE") {
			return `"%${val}%"`;
		} else if (operator === "IN" || operator === "NOT IN") {
			return `(${val.split(",").map(item => getValueByFieldType(dbType, item)).join(",")})`;
		}
		
		return getValueByFieldType(dbType, val);
	};
	
	/** 根据条件拼接 where sql */
	const spliceWhereSQLFragmentByConditions = (fnParams: {
		conditions: Condition[];
		entities: Entity[];
		/** entityMap 是全量实体表 map */
		entityMap: Record<string, Entity>;
		curEntity: Entity;
		params: Record<string, unknown>;
		whereJoiner?: AnyType;
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
					if (condition.value?.startsWith("{") && condition.value?.endsWith("}")) {
						const curValue = condition.value.substr(1, condition.value.length - 2);
					
						/** 非实体字段，即使用的变量，如 params.id */
						if (!new RegExp(`^${entities.map(e => e.name).join("|")}\\.`).test(curValue)) {
							return params[curValue.substring(curValue.indexOf(".") + 1)] !== undefined;
						}
					} else {
						return condition?.value !== undefined;
					}
				}
			
				return true;
			});
		
		const conditionSqlList: string[] = [];
		
		curConditions.forEach(condition => {
			let curSQL = "";
			
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
						const mappingField = curEntity.fieldAry.find(f => f.mapping?.entity?.id === condition.entityId);
						const curField = mappingField?.mapping?.entity?.fieldAry.find(f => f.id === condition.fieldId);
						
						fieldName = `MAPPING_${mappingField?.name || entityMapElement.name}` + (curField?.isPrimaryKey ? `.MAPPING_${mappingField?.name || entityMapElement.name}_` : ".") + (curField?.name || field.name);
					}
					let value = condition.value || "";
					let isEntityField = false;
					/** 支持直接使用数据库字段，如 文件表.id = 用户表.文件id */
					if (condition.value.startsWith("{") && condition.value.endsWith("}")) {
						const curValue = condition.value.substr(1, condition.value.length - 2);
						
						if (new RegExp(`^${entities.map(e => e.name).join("|")}\\.`).test(curValue)) {
							value = curValue;
							isEntityField = true;
						} else {
							if (templateMode) {
								let key = curValue.substring(curValue.indexOf(".") + 1);
								value = `\${params.${key}}`;
							} else {
								value = params[curValue.substring(curValue.indexOf(".") + 1)] as string;
							}
						}
					}
					
					curSQL = `${fieldName} ${condition.operator} ${isEntityField ? value : getValueByOperatorAndFieldType(field.dbType, condition.operator!, value)}`;
				}
			}
			
			curSQL && conditionSqlList.push(curSQL);
		});
		
		/** 只有多个条件才需要括号拼接 */
		let sql = `${conditionSqlList.length > 1 ? "(" : ""}${conditionSqlList.join(` ${whereJoiner} `)}${conditionSqlList.length > 1 ? ")" : ""}`;
		let prefix = "";
		
		/** whereJoiner 不存在表示最外层 SQL */
		if (!whereJoiner) {
			/** 当 condition 存在时 */
			prefix = `WHERE _STATUS_DELETED = 0${sql ? " AND " : ""}`;
		}
		
		return prefix + sql;
	};
	
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
			return field.selected && field.mapping?.entity?.fieldAry?.length && entityMap[field.mapping.entity.id];
		});
		
		mappingFields.forEach(mappingField => {
			const entity = mappingField.mapping!.entity!;
			const condition = String(mappingField.mapping!.condition!);
			const type = mappingField.mapping!.type!;
			const fieldJoiner = mappingField.mapping!.fieldJoiner!;
			/** 源实体，即实体面板中存在的实体 */
			const originEntity = entityMap[entity.id];
			
			/** 与主实体存在关联关系的外键字段 */
			let relationField: Field | null = null;
			if (type === "primary") {
				relationField = originEntity.fieldAry.find(f => f.isPrimaryKey) ?? null;
			} else {
				relationField = originEntity.fieldAry.find(f => f.bizType === "relation" && f.relationEntityId === curEntity.id) ?? null;
			}
			
			if (!relationField) {
				return;
			}
			
			const isMaxCondition = condition.startsWith("max(") && condition.endsWith(")");
			let entityName = "";
			/** 被关联 */
			if (type === "primary") {
				if (condition === "-1") {
					const relationField = curEntity.fieldAry.find(f => ["relation", "SYS_USER", "SYS_USER.CREATOR", "SYS_USER.UPDATER"].includes(f.bizType) && f.relationEntityId === originEntity.id);
					const extraFieldName = entity.fieldAry.filter(f => !f.isPrimaryKey).map(f => f.name).join(", ");
					
					entityName = `LEFT JOIN (SELECT id AS MAPPING_${mappingField.name}_id${extraFieldName ? `, ${extraFieldName}` : ""} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0) MAPPING_${mappingField.name} ON MAPPING_${mappingField.name}.MAPPING_${mappingField.name}_id = ${curEntity.name}.${relationField?.name}`;
				}
			} else {
				/** 关联 */
				if (condition === "-1") {
					const extraFieldName = entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => `GROUP_CONCAT(${f.name} SEPARATOR "${fieldJoiner}") ${f.name}`).join(", ");
					
					entityName = `LEFT JOIN (SELECT id AS MAPPING_${mappingField.name}_id, ${relationField.name}${extraFieldName ? `, ${extraFieldName}` : ""} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name}) MAPPING_${mappingField.name} ON MAPPING_${mappingField.name}.${relationField.name} = ${curEntity.name}.id`;
				} else if (isMaxCondition) {
					const filedName = condition.substr(4, condition.length - 5);
					const extraFieldName = entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => f.name).join(", ");
					
					entityName = `LEFT JOIN (SELECT id AS MAPPING_${mappingField.name}_id, ${relationField.name}${extraFieldName ? `, ${extraFieldName}` : ""} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 AND ${filedName} IN (SELECT max(${filedName}) FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name})) MAPPING_${mappingField.name} ON MAPPING_${mappingField.name}.${relationField.name} = ${curEntity.name}.id`;
				}
			}
			
			entityNames.push(entityName);
		});
		
		/** 字段列表 */
		fieldList.push(
			...curEntity.fieldAry
				.filter(field => field.bizType !== "mapping" && field.selected)
				.map(field => `${curEntity.name}.${field.name}`)
		);
		/** mapping 字段列表 */
		mappingFields.forEach(field => {
			const entity = field.mapping!.entity!;
			
			fieldList.push(
				...entity.fieldAry.map(f => {
					if (f.isPrimaryKey) {
						return `MAPPING_${field.name}.MAPPING_${field.name}_id AS "${field.name}_${f.name}"`;
					} else {
						return `MAPPING_${field.name}.${f.name} AS "${field.name}_${f.name}"`;
					}
				})
			);
		});
		
		/** 前置 sql */
		sql.push(`SELECT ${fieldList.join(", ")} FROM ${entityNames.join(" ")}`);
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
					
					currentField && orderList.push(`MAPPING_${mappingField.name}.${currentField.isPrimaryKey ? `MAPPING_${mappingField.name}_` : ""}${currentField.name} ${order.order}`);
				} else {
					const field = curEntity.fieldAry.find(f => f.id === order.fieldId);
					
					if (field) {
						orderList.push(`${curEntity.name}.${field.name} ${order.order}`);
					}
				}
			});
			orderList.length && sql.push(`ORDER BY ${orderList.join(", ")}`);
		}
		
		let limitValue: AnyType = limit.value ? String(limit.value) :"";
		if (limitValue) {
			if (limitValue.startsWith("{") && limitValue.endsWith("}")) {
				limitValue = params[limitValue.slice(limitValue.indexOf(".") + 1, -1)];
				
				if (limitValue) {
					sql.push(`LIMIT ${limitValue}`);
				}
			} else {
				sql.push(`LIMIT ${limitValue}`);
			}
		}
		
		if (pageIndex) {
			if (pageIndex.startsWith("{") && pageIndex.endsWith("}")) {
				const curValue = params[pageIndex.slice(pageIndex.indexOf(".") + 1, -1)];
				
				if (curValue) {
					sql.push(`OFFSET ${(Number(curValue) - 1) * Number(limitValue)}`);
				}
			} else if (!Number.isNaN(Number(pageIndex))) {
				sql.push(`OFFSET ${(Number(pageIndex) - 1) * Number(limitValue)}`);
			}
		}
		
		return sql.join(" ");
	}
};

/** 根据规则以及实体拼接 select 查询总数语句 */
export const spliceSelectCountSQLByConditions = (fnParams: {
	conditions: Condition;
	entities: Entity[];
	params: Record<string, unknown>;
}, templateMode?) => {
	/** 根据字段类型返回拼接 sql 的具体指 */
	const getValueByFieldType = (dbType: string, val: string) => {
		switch (dbType) {
		case "varchar": return `"${val}"`;
		case "bigint": return val;
		case "mediumtext": return `"${val}"`;
		default: return val;
		}
	};
	
	/** 根据字段类型以及操作符号返回拼接 sql 的具体值 */
	const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
		if (operator === "LIKE" || operator === "NOT LIKE") {
			return `"%${val}%"`;
		} else if (operator === "IN" || operator === "NOT IN") {
			return `(${val.split(",").map(item => getValueByFieldType(dbType, item)).join(",")})`;
		}
		
		return getValueByFieldType(dbType, val);
	};
	
	/** 根据条件拼接 where sql */
	const spliceWhereSQLFragmentByConditions = (fnParams: {
		conditions: Condition[];
		entities: Entity[];
		/** entityMap 是全量实体表 map */
		entityMap: Record<string, Entity>;
		curEntity: Entity;
		params: Record<string, unknown>;
		whereJoiner?: AnyType;
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
					if (condition.value?.startsWith("{") && condition.value?.endsWith("}")) {
						const curValue = condition.value.substr(1, condition.value.length - 2);
					
						/** 非实体字段，即使用的变量，如 params.id */
						if (!new RegExp(`^${entities.map(e => e.name).join("|")}\\.`).test(curValue)) {
							return params[curValue.substring(curValue.indexOf(".") + 1)] !== undefined;
						}
					} else {
						return condition?.value !== undefined;
					}
				}
			
				return true;
			});
		
		const conditionSqlList: string[] = [];
		
		curConditions.forEach(condition => {
			let curSQL = "";
			
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
						const mappingField = curEntity.fieldAry.find(f => f.mapping?.entity?.id === condition.entityId);
						const curField = mappingField?.mapping?.entity?.fieldAry.find(f => f.id === condition.fieldId);
						
						fieldName = `MAPPING_${mappingField?.name || entityMapElement.name}` + (curField?.isPrimaryKey ? `.MAPPING_${mappingField?.name || entityMapElement.name}_` : ".") + (curField?.name || field.name);
					}
					let value = condition.value || "";
					let isEntityField = false;
					/** 支持直接使用数据库字段，如 文件表.id = 用户表.文件id */
					if (condition.value.startsWith("{") && condition.value.endsWith("}")) {
						const curValue = condition.value.substr(1, condition.value.length - 2);
						
						if (new RegExp(`^${entities.map(e => e.name).join("|")}\\.`).test(curValue)) {
							value = curValue;
							isEntityField = true;
						} else {
							if (templateMode) {
								let key = curValue.substring(curValue.indexOf(".") + 1);
								value = `\${params.${key}}`;
							} else {
								value = params[curValue.substring(curValue.indexOf(".") + 1)] as string;
							}
						}
					}
					
					curSQL = `${fieldName} ${condition.operator} ${isEntityField ? value : getValueByOperatorAndFieldType(field.dbType, condition.operator!, value)}`;
				}
			}
			
			curSQL && conditionSqlList.push(curSQL);
		});
		
		/** 只有多个条件才需要括号拼接 */
		let sql = `${conditionSqlList.length > 1 ? "(" : ""}${conditionSqlList.join(` ${whereJoiner} `)}${conditionSqlList.length > 1 ? ")" : ""}`;
		let prefix = "";
		
		/** whereJoiner 不存在表示最外层 SQL */
		if (!whereJoiner) {
			/** 当 condition 存在时 */
			prefix = `WHERE _STATUS_DELETED = 0${sql ? " AND " : ""}`;
		}
		
		return prefix + sql;
	};
	
	let { conditions, entities, params } = fnParams;
	const entityMap = {};
	entities.forEach(e => entityMap[e.id] = e);
	const curEntity = entities.find(e => e.selected);
	
	if (curEntity && curEntity.fieldAry.length) {
		const sql: string[] = [];
		const entityNames: string[] = [curEntity.name];
		
		/** mapping 字段，存在映射且实体存在 */
		const mappingFields = curEntity.fieldAry.filter(field => {
			return field.selected && field.mapping?.entity?.fieldAry?.length && entityMap[field.mapping.entity.id];
		});
		mappingFields.forEach(mappingField => {
			const entity = mappingField.mapping!.entity!;
			const condition = String(mappingField.mapping!.condition!);
			const type = mappingField.mapping!.type!;
			const fieldJoiner = mappingField.mapping!.fieldJoiner!;
			/** 源实体，即实体面板中存在的实体 */
			const originEntity = entityMap[entity.id];
			
			/** 与主实体存在关联关系的外键字段 */
			let relationField: Field | null = null;
			if (type === "primary") {
				relationField = originEntity.fieldAry.find(f => f.isPrimaryKey) ?? null;
			} else {
				relationField = originEntity.fieldAry.find(f => f.bizType === "relation" && f.relationEntityId === curEntity.id) ?? null;
			}
			
			if (!relationField) {
				return;
			}
			
			const isMaxCondition = condition.startsWith("max(") && condition.endsWith(")");
			let entityName = "";
			/** 被关联 */
			if (type === "primary") {
				if (condition === "-1") {
					const relationField = curEntity.fieldAry.find(f => ["relation", "SYS_USER", "SYS_USER.CREATOR", "SYS_USER.UPDATER"].includes(f.bizType) && f.relationEntityId === originEntity.id);
					const extraFieldName = entity.fieldAry.filter(f => !f.isPrimaryKey).map(f => f.name).join(", ");
					
					entityName = `LEFT JOIN (SELECT id AS MAPPING_${mappingField.name}_id${extraFieldName ? `, ${extraFieldName}` : ""} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0) MAPPING_${mappingField.name} ON MAPPING_${mappingField.name}.MAPPING_${mappingField.name}_id = ${curEntity.name}.${relationField?.name}`;
				}
			} else {
				/** 关联 */
				if (condition === "-1") {
					const extraFieldName = entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => `GROUP_CONCAT(${f.name} SEPARATOR "${fieldJoiner}") ${f.name}`).join(", ");
					
					entityName = `LEFT JOIN (SELECT id AS MAPPING_${mappingField.name}_id, ${relationField.name}${extraFieldName ? `, ${extraFieldName}` : ""} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name}) MAPPING_${mappingField.name} ON MAPPING_${mappingField.name}.${relationField.name} = ${curEntity.name}.id`;
				} else if (isMaxCondition) {
					const filedName = condition.substr(4, condition.length - 5);
					const extraFieldName = entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => f.name).join(", ");
					
					entityName = `LEFT JOIN (SELECT id AS MAPPING_${mappingField.name}_id, ${relationField.name}${extraFieldName ? `, ${extraFieldName}` : ""} FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 AND ${filedName} IN (SELECT max(${filedName}) FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name})) MAPPING_${mappingField.name} ON MAPPING_${mappingField.name}.${relationField.name} = ${curEntity.name}.id`;
				}
			}
			
			entityNames.push(entityName);
		});
		
		/** 前置 sql */
		sql.push(`SELECT count(*) as total FROM ${entityNames.join(" ")}`);
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			entityMap,
			curEntity,
		}, templateMode));
		
		return sql.join(" ");
	}
};