/* eslint-disable no-useless-escape */
import { Condition, Entity } from '../_types/domain';
import { SQLWhereJoiner } from '../_constants/field';
import { getQuoteByFieldType, getValueByOperatorAndFieldType } from './field';


/** 根据条件拼接 where sql */
export const spliceWhereSQLFragmentByConditions = (fnParams: {
	conditions: Condition[];
	entities: Entity[];
	/** entityMap 是全量实体表 map */
	entityMap: Record<string, Entity>;
	curEntity: Entity;
	params: Record<string, unknown>;
	whereJoiner?: SQLWhereJoiner;
}) => {
	const { conditions, entities, params, whereJoiner, entityMap, curEntity } = fnParams;
	const curConditions = conditions
		.filter(condition => condition.fieldId)
		/** 筛选条件对应值不存在的情况 */
		.filter(condition => {
			if (condition.conditions) {
				return true;
			} else {
				return condition?.value !== undefined;
			}
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
			});
		} else {
			const entityMapElement = entityMap[condition.entityId];
			const field = entityMapElement?.fieldAry.find(f => f.id === condition.fieldId);
			
			if (field) {
				let fieldName = `${field.name}`;
				
				/** mapping 字段映射的实体 */
				if (entityMapElement.id !== curEntity.id) {
					const mappingField = curEntity.fieldAry.find(f => f.mapping?.entity?.id === condition.entityId);
					const curField = mappingField?.mapping?.entity?.fieldAry.find(f => f.id === condition.fieldId);
					
					fieldName = `MAPPING_${mappingField?.name || entityMapElement.name}` + (curField?.isPrimaryKey ? `.MAPPING_${mappingField?.name || entityMapElement.name}_` : '.') + (curField?.name || field.name);
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
						let key = curValue.substring(curValue.indexOf('.') + 1);
						value = `params.${key}`;
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
	
	/** whereJoiner 不存在表示最外层 SQL */
	if (!whereJoiner) {
		/** 当 condition 存在时 */
		prefix = `WHERE _STATUS_DELETED = 0${sql ? ' AND ' : ''}`;
	}

	return prefix + sql;
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
			
			const q = getQuoteByFieldType(field?.dbType as string);
			return field ? `\${${value} === undefined ? "" : \`, ${toFieldName} = \${${value} === null ? null : \`${q}\${${value}}${q}\`}\`}` : undefined;
		})
		.filter(Boolean)
		.join('');
};

/** 根据规则以及实体拼接 update 语句 */
export const spliceUpdateSQLByConditions = (fnParams: {
	conditions: Condition;
	connectors: Array<{ from: string; to: string }>;
	entities: Entity[];
	params: Record<string, unknown>;
}) => {
	const { conditions, entities, params, connectors } = fnParams;
	const entityMap = {};
	entities.forEach(e => entityMap[e.id] = e);
	const curEntity = entities.find(e => e.selected);

	if (curEntity) {
		const sql: string[] = [];

		/** 前置 sql */
		sql.push(`UPDATE ${curEntity.name}\${context.isEdit ? '' : '__VIEW'} SET _UPDATE_USER_ID = \"\", _UPDATE_TIME = \${Date.now()}`);
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
	const entityMap = {};
	entities.forEach(e => entityMap[e.id] = e);
	const curEntity = entities.find(e => e.selected);

	if (curEntity) {
		const sql: string[] = [];

		/** 前置 sql */
		sql.push(`UPDATE ${curEntity.name}\${context.isEdit ? '' : '__VIEW'} SET _STATUS_DELETED = 1, _UPDATE_USER_ID = "", _UPDATE_TIME = \${Date.now()}`);
		sql.push(spliceWhereSQLFragmentByConditions({
			conditions: [conditions],
			entities,
			params,
			curEntity,
			entityMap,
		}));

		return sql.join(' ');
	}
};
