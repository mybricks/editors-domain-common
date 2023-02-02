import { Condition, Entity } from '../_types/domain';
import { SQLWhereJoiner } from '../_constants/field';
import { getValueByOperatorAndFieldType } from './field';

/** 根据条件拼接 where sql */
export const spliceWhereSQLByConditions = (conditions: Condition[], entities: Entity[], whereJoiner?: SQLWhereJoiner) => {
	const curConditions = conditions.filter(condition => condition.fieldId);
	
	/** 只有多个条件才需要括号拼接 */
	let sql = curConditions.length > 1 ? '(' : '';
	
	curConditions.forEach((condition, index) => {
		/** 非第一个条件 */
		if (index > 0) {
			sql += ` ${whereJoiner ?? ''} `;
		}
		
		if (condition.conditions) {
			sql += spliceWhereSQLByConditions(condition.conditions, entities, condition.whereJoiner);
		} else {
			const field = entities.find(e => e.id === condition.entityId)?.fieldAry.find(f => f.id === condition.fieldId);
			
			if (field) {
				let value = condition.value || '';
				let isEntityField = false;
				/** 支持直接使用数据库字段，如 文件表.id = 用户表.文件id */
				if (condition.value.startsWith('{') && condition.value.endsWith('}')) {
					const curValue = condition.value.substr(1, condition.value.length - 2);
					
					if (new RegExp(`^${entities.map(e => e.name).join('|')}\\.`).test(curValue)) {
						value = curValue;
						isEntityField = true;
					}
				}
				
				sql += `${condition.fieldName} ${condition.operator} ${isEntityField ? value : getValueByOperatorAndFieldType(field.dbType, condition.operator!, value)}`;
			}
		}
	});
	
	sql += curConditions.length > 1 ? ')' : '';
	
	return (!whereJoiner ? 'WHERE ' : '') +  sql;
};