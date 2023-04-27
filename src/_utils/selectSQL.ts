/* eslint-disable no-useless-escape */
import { SelectedField } from "../_types/domain";

interface Entity {
	/** 表 ID，在前端编辑页使用 */
	id: string;
	/** 表名 */
	name: string;
	/** 表备注 */
	desc: string;
	fieldAry: Field[];
	selected?: boolean;
	isSystem: boolean;
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
	isPrivate?: boolean;
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
	fromPath: SelectedField[]
}

type Order = { fieldId: string; fieldName: string | string[]; order: AnyType; entityId: string; fromPath: SelectedField[] };

type AnyType = any;

/** 根据规则以及实体拼接 select 语句 */
export const spliceSelectSQLByConditions = (fnParams: {
	orders: Order[];
	conditions: Condition;
	fields: SelectedField[];
	entities: Entity[];
	params: Record<string, unknown>;
	limit: { type: string; value: number | string };
	pageIndex?: string;
}, templateMode?) => {
	/** 根据字段类型返回拼接 sql 的具体指 */
	const getValueByFieldType = (dbType: string, val: string) => {
		switch (dbType) {
		case "varchar": return `'${val}'`;
		case "bigint": return val;
		case "mediumtext": return `'${val}'`;
		default: return val;
		}
	};
	
	/** 根据字段类型以及操作符号返回拼接 sql 的具体值 */
	const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
		if (operator === "LIKE" || operator === "NOT LIKE") {
			return `'%${val}%'`;
		} else if (operator === "IN" || operator === "NOT IN") {
			return `(${val.split(",").map(item => getValueByFieldType(dbType, item)).join(",")})`;
		}
		
		return getValueByFieldType(dbType, val);
	};
	
	let { conditions, entities, params, limit, orders = [], pageIndex, fields } = fnParams;
	const curEntity = entities.find(e => e.selected);
	
	if (curEntity && curEntity.fieldAry.length) {
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
					const field = entityFieldMap[condition.entityId + condition.fieldId];
					const fieldName = condition.fromPath.length
						? `MAPPING_${[...condition.fromPath.map(p => entityFieldMap[p.entityId + p.fieldId].name), field.name].join('_')}`
						: field.name;
					
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
		/** 实体 Map */
		const entityMap = {};
		entities.forEach(e => entityMap[e.id] = e);
		/** 实体 + 字段的 Map */
		const entityFieldMap: Record<string, Field> = {};
		entities.forEach(entity => {
			entity.fieldAry.forEach(field => {
				entityFieldMap[entity.id + field.id] = field;
				
				if (entity.isSystem && !field.isPrivate) {
					entityFieldMap[entity.id + field.name] = field;
				}
			});
		});
		const sql: string[] = [];
		const fieldList: string[] = [];
		const entityNames: string[] = [curEntity.name];
		const conditionFields: SelectedField[] = [];
		const formatCondition = (condition: Condition[]) => {
			condition.forEach(con => {
				if (con.conditions?.length) {
					formatCondition(con.conditions);
				} else {
					con.fieldId && conditionFields.push(con as AnyType);
				}
			});
		};
		formatCondition([conditions]);
		
		orders = orders.map(order => {
			if (order.fieldId) {
				return { ...order, fromPath: order.fromPath || [] };
			} else if (order.fieldName) {
				/** 前端传入的排序，根据排序字段名称（如： 物料.物料ID）匹配出 Order 类型数据 */
				const names = String(order.fieldName).split('.');
				const fieldPath: SelectedField[] = [];
				let nowEntity: Entity | undefined = curEntity;
				while (names.length) {
					if (!nowEntity) {
						return;
					}
					
					const curField = nowEntity.fieldAry.find(field => field.name === names.shift());
					
					if (!curField) {
						return;
					}
					fieldPath.push({ fieldId: curField.id, entityId: nowEntity.id, fieldName: curField.name, fromPath: [] });
					nowEntity = curField.mapping?.entity;
				}
				
				if (fieldPath.length) {
					return { ...fieldPath.pop(), fromPath: fieldPath };
				}
			}
		}).filter(Boolean) as AnyType as Order[];
		/** 所有使用到的字段，类型定义为 SelectedField */
		let allFields: SelectedField[] = [...fields, ...(orders as AnyType), ...conditionFields];
		const allFieldsMap: Record<string, boolean> = {};
		allFields = allFields.filter(field => {
			const paths = [...field.fromPath.map(p => p.fieldId), field.fieldId].join('.');
			
			if (allFieldsMap[paths]) {
				return false;
			}
			
			allFieldsMap[paths] = true;
			return true;
		});
		/** 当前实体中被使用到的字段 ID */
		const curFieldIds = allFields.filter(field => field.entityId === curEntity.id && !field.fromPath?.length).map(field => field.fieldId);
		
		const spliceLeftJoinSql = (mappingFields: Field[], depIndex: number, fromPath: Field[], parentEntity: Entity) => {
			const entityNames: string[] = [];
			mappingFields.forEach(parentField => {
				if (!parentField) {
					return;
				}
				const depFields = allFields.filter(f => f.fromPath.length === depIndex && f.fromPath[f.fromPath.length - 1].fieldId === parentField.id);
				if (!depFields.length) {
					return;
				}
				const entity = parentField.mapping!.entity!;
				const condition = String(parentField.mapping!.condition!);
				const type = parentField.mapping!.type!;
				/** 源实体，即实体面板中存在的实体 */
				const originEntity = entityMap[entity.id];
				
				/** 与主实体存在关联关系的外键字段 */
				let relationField: Field | null = null;
				if (type === "primary") {
					relationField = originEntity.fieldAry.find(f => f.isPrimaryKey) ?? null;
				} else if (type === 'foreigner') {
					relationField = originEntity.fieldAry.find(f => f.bizType === "relation" && f.relationEntityId === curEntity.id) ?? null;
				}
				
				if (!relationField) {
					return;
				}
				
				const leftJoinSqlList = spliceLeftJoinSql(depFields.map(f => entityFieldMap[f.entityId + f.fieldId]), depIndex + 1, [...fromPath, parentField], originEntity);
				const isMaxCondition = condition.startsWith("max(") && condition.endsWith(")");
				const SEPARATOR = `$$`;
				let entityName = "";
				
				/** 关联，当前实体主动关联另一个实体，即当前实体字段存在一个字段作为外键关联另一个实体的主键（id） */
				if (type === "primary") {
					if (condition === "-1") {
						const relationField = parentEntity.fieldAry.find(f => ["relation", "SYS_USER", "SYS_USER.CREATOR", "SYS_USER.UPDATER"].includes(f.bizType) && f.relationEntityId === originEntity.id);
						const mappingTableName = [...fromPath.map(p => p.name), parentField.name].join('_');
						let jsonFieldNameList: string[] = [];
						/** 标识对应的 json 字段是否已被拼接 */
						const jsonMappingFieldMap = {};
						
						const extraFieldNames = allFields
							.filter(f => f.fromPath.find(path => path.fieldId === parentField.id && path.entityId === parentEntity.id))
							.map(f => {
								const currentField = entityFieldMap[f.entityId + f.fieldId];
								
								if (f.entityId === originEntity.id && currentField.isPrimaryKey) {
									jsonFieldNameList.push(`'${currentField.name}', ${currentField.name}`);
									return;
								}
								
								const index = f.fromPath.findIndex(path => path.fieldId === parentField.id && path.entityId === parentEntity.id);
								const mappingFieldName = `MAPPING_${[...(f.fromPath.map(path => entityFieldMap[path.entityId + path.fieldId].name)), currentField.name].join('_')}`;
								
								/** 字段来源于当前表中 */
								if (f.fromPath.length - 1 === index) {
									const isMapping = allFields.find(p => p.fromPath.length === f.fromPath.length + 1 && p.fromPath[p.fromPath.length - 1].fieldId === currentField.id);
									jsonFieldNameList.push(`'${isMapping ? '_' : ''}${currentField.name}', ${currentField.name}`);
									
									return `${currentField.name} AS ${mappingFieldName}`;
								} else {
									const entityFieldMapElement = entityFieldMap[f.fromPath[index + 1].entityId + f.fromPath[index + 1].fieldId];
									
									if (!jsonMappingFieldMap[entityFieldMapElement.name]) {
										jsonFieldNameList.push(`'${entityFieldMapElement.name}', ${entityFieldMapElement.name}_JSON`);
										jsonMappingFieldMap[entityFieldMapElement.name] = 1;
									}
									
									/** 字段来源于子查询 */
									return mappingFieldName;
								}
							}).filter(Boolean);
						entityName = `LEFT JOIN (SELECT id AS MAPPING_${mappingTableName}_id${extraFieldNames.length ? `, ${extraFieldNames.join(', ')}` : ""}${jsonFieldNameList.length ? `, JSON_OBJECT(${jsonFieldNameList.join(', ')}) ${parentField.name}_JSON` : ""} FROM ${originEntity.name} ${leftJoinSqlList.join(' ')} WHERE _STATUS_DELETED = 0) MAPPING_${mappingTableName} ON MAPPING_${mappingTableName}.MAPPING_${mappingTableName}_id = ${(parentEntity.name)}.${(relationField?.name)}`;
					}
				} else if (type === 'foreigner') {
					/** 被关联，当前实体被另一实体关联，即当前实体的主键（id）被另一个实体作为外键相互关联 */
					const mappingTableName = [...fromPath.map(p => p.name), parentField.name].join('_');
					const curRelationFieldName = 'MAPPING_' + [mappingTableName, relationField?.name].join('_');
					let jsonFieldNameList: string[] = [];
					/** 标识对应的 json 字段是否已被拼接 */
					const jsonMappingFieldMap = {};
					
					if (condition === "-1") {
						const extraFieldNames = allFields
							.filter(f => {
								return f.fromPath.find(path => path.fieldId === parentField.id && path.entityId === parentEntity.id);
							})
							.map(f => {
								const currentField = entityFieldMap[f.entityId + f.fieldId];
								
								if ((f.entityId === originEntity.id ? currentField.isPrimaryKey : false) || currentField.name === relationField?.name) {
									const isMapping = allFields.find(p => p.fromPath.length === f.fromPath.length + 1 && p.fromPath[p.fromPath.length - 1].fieldId === currentField.id);
									jsonFieldNameList.push(`'${isMapping ? '_' : ''}${currentField.name}', ${currentField.name}`);
									
									return;
								}
								
								const index = f.fromPath.findIndex(path => path.fieldId === parentField.id && path.entityId === parentEntity.id);
								const mappingFieldName = `MAPPING_${[...(f.fromPath.map(path => entityFieldMap[path.entityId + path.fieldId].name)), entityFieldMap[f.entityId + f.fieldId].name].join('_')}`;
								
								if (f.fromPath.length - 1 === index) {
									const isMapping = allFields.find(p => p.fromPath.length === f.fromPath.length + 1 && p.fromPath[p.fromPath.length - 1].fieldId === currentField.id);
									jsonFieldNameList.push(`'${isMapping ? '_' : ''}${currentField.name}', ${currentField.name}`);
									
									return `GROUP_CONCAT(${entityFieldMap[f.entityId + f.fieldId].name} SEPARATOR \"${SEPARATOR}\") ${mappingFieldName}`;
								} else {
									const entityFieldMapElement = entityFieldMap[f.fromPath[index + 1].entityId + f.fromPath[index + 1].fieldId];
									if (!jsonMappingFieldMap[entityFieldMapElement.name]) {
										jsonFieldNameList.push(`'${entityFieldMapElement.name}', ${entityFieldMapElement.name}_JSON`);
										jsonMappingFieldMap[entityFieldMapElement.name] = 1;
									}
									
									return `GROUP_CONCAT(${mappingFieldName} SEPARATOR \"${SEPARATOR}\") ${mappingFieldName}`;
								}
							})
							.filter(Boolean);
						
						entityName = `LEFT JOIN (SELECT GROUP_CONCAT(id SEPARATOR \"${SEPARATOR}\") MAPPING_${mappingTableName}_id, GROUP_CONCAT(${relationField?.name} SEPARATOR \"${SEPARATOR}\") ${curRelationFieldName}${extraFieldNames.length ? `, ${extraFieldNames.join(', ')}` : ""}${jsonFieldNameList.length ? `, JSON_ARRAYAGG(JSON_OBJECT(${jsonFieldNameList.join(', ')})) ${parentField.name}_JSON` : ""} FROM ${originEntity.name} ${leftJoinSqlList.join(' ')} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField?.name}) MAPPING_${mappingTableName} ON MAPPING_${mappingTableName}.${curRelationFieldName} = ${(parentEntity.name)}.id`;
					} else if (isMaxCondition) {
						const filedName = condition.substr(4, condition.length - 5);
						const extraFieldNames = allFields
							.filter(f => {
								return f.fromPath.find(path => path.fieldId === parentField.id && path.entityId === parentEntity.id);
							})
							.map(f => {
								const currentField = entityFieldMap[f.entityId + f.fieldId];
							
								if ((f.entityId === originEntity.id ? currentField.isPrimaryKey : false) || currentField.name === relationField?.name) {
									const isMapping = allFields.find(p => p.fromPath.length === f.fromPath.length + 1 && p.fromPath[p.fromPath.length - 1].fieldId === currentField.id);
									jsonFieldNameList.push(`'${isMapping ? '_' : ''}${currentField.name}', ${currentField.name}`);
									
									return;
								}
								const index = f.fromPath.findIndex(path => path.fieldId === parentField.id && path.entityId === parentEntity.id);
								const mappingFieldName = `MAPPING_${[...(f.fromPath.map(path => entityFieldMap[path.entityId + path.fieldId].name)), entityFieldMap[f.entityId + f.fieldId].name].join('_')}`;
							
								if (f.fromPath.length - 1 === index) {
									const isMapping = allFields.find(p => p.fromPath.length === f.fromPath.length + 1 && p.fromPath[p.fromPath.length - 1].fieldId === currentField.id);
									jsonFieldNameList.push(`'${isMapping ? '_' : ''}${currentField.name}', ${currentField.name}`);
									
									return `${entityFieldMap[f.entityId + f.fieldId].name} AS ${mappingFieldName}`;
								} else {
									const entityFieldMapElement = entityFieldMap[f.fromPath[index + 1].entityId + f.fromPath[index + 1].fieldId];
									if (!jsonMappingFieldMap[entityFieldMapElement.name]) {
										jsonFieldNameList.push(`'${entityFieldMapElement.name}', ${entityFieldMapElement.name}_JSON`);
										jsonMappingFieldMap[entityFieldMapElement.name] = 1;
									}
									
									return mappingFieldName;
								}
							})
							.filter(Boolean);
						
						entityName = `LEFT JOIN (SELECT GROUP_CONCAT(id SEPARATOR \"${SEPARATOR}\") MAPPING_${mappingTableName}_id, GROUP_CONCAT(${relationField?.name} SEPARATOR \"${SEPARATOR}\") ${curRelationFieldName}${extraFieldNames.length ? `, ${extraFieldNames.join(', ')}` : ""}${jsonFieldNameList.length ? `, JSON_ARRAYAGG(JSON_OBJECT(${jsonFieldNameList.join(', ')})) ${parentField.name}_JSON` : ""} FROM ${originEntity.name} ${leftJoinSqlList.join(' ')} WHERE _STATUS_DELETED = 0 AND ${filedName} IN (SELECT max(${filedName}) FROM ${originEntity.name} WHERE _STATUS_DELETED = 0 GROUP BY ${relationField.name})) MAPPING_${mappingTableName} ON MAPPING_${mappingTableName}.${curRelationFieldName} = ${(parentEntity.name)}.id`;
					}
				}
				
				entityName && entityNames.push(entityName);
			});
			
			return entityNames;
		};
		
		/** mapping 字段，存在数据映射且实体存在 */
		entityNames.push(...spliceLeftJoinSql(curEntity.fieldAry
			.filter(field => {
				return curFieldIds.includes(field.id) && field.mapping?.entity?.fieldAry?.length && entityMap[field.mapping.entity.id];
			}), 1, [], curEntity));
		
		/** 字段列表 */
		fields
			.filter(field => !field.fromPath.length)
			.map(field => {
				const entityField = entityFieldMap[field.entityId + field.fieldId];
				if (entityField.bizType === 'mapping') {
					fieldList.push(`${entityField.name}_JSON AS ${entityField.name}`);
					return;
				}
				
				const isMapping = allFields.find(p => p.fromPath[0]?.fieldId === field.fieldId);
				
				if (isMapping) {
					fieldList.push(`${entityField.name} AS _${entityField.name}`, `${entityField.name}_JSON AS ${entityField.name}`);
				} else {
					fieldList.push(entityField.name);
				}
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
				const entityField = entityFieldMap[order.entityId + order.fieldId];
				if (!entityField) {
					return;
				}
				
				if (order.fromPath.length) {
					orderList.push(`MAPPING_${[...order.fromPath.map(path => entityFieldMap[path.entityId + path.fieldId].name), entityField.name].join('_')} ${order.order}`);
				} else {
					fieldList.push(`${entityField.name} ${order.order}`);
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
		case "varchar": return `'${val}'`;
		case "bigint": return val;
		case "mediumtext": return `'${val}'`;
		default: return val;
		}
	};
	
	/** 根据字段类型以及操作符号返回拼接 sql 的具体值 */
	const getValueByOperatorAndFieldType = (dbType: string, operator: string, val: string) => {
		if (operator === "LIKE" || operator === "NOT LIKE") {
			return `'%${val}%'`;
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
					const extraFieldName = entity.fieldAry.filter(f => !f.isPrimaryKey && f.name !== relationField?.name).map(f => `GROUP_CONCAT(${f.name} SEPARATOR \"${fieldJoiner}\") ${f.name}`).join(", ");
					
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
