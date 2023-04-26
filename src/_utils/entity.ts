import { Condition, Entity, Field, Order, SelectedField } from '../_types/domain';
import { AnyType } from '../_types';
import { DefaultValueWhenCreate, FieldBizType } from '../_constants/field';

/**
 * 实体信息可能存在变更，每次使用最新的实体信息
 * 根据 domainModal 中实体列表刷新 editor 中的 entities（已选择实体列表） */
export const formatEntitiesByOriginEntities = (entities: Entity[], originEntities: AnyType[]) => {
	return originEntities.map((originEntity: Entity) => {
		const entity = entities.find((e: Entity) => e.id === originEntity.id);
		
		if (entity) {
			const originEntityJSON = (originEntity as AnyType).toJSON();
			
			return {
				...originEntityJSON,
				selected: entity.selected,
				fieldAry: originEntityJSON.fieldAry.map((originField: Field) => {
					const field = entity.fieldAry.find((f: Field) => f.id === originField.id);
					
					return field ? { ...originField, selected: (field.name === originField.name) && field.selected } : originField;
				}),
			};
		} else {
			return (originEntity as AnyType).toJSON();
		}
	});
};

export const getEntityFieldMap = (entities: Entity[]) => {
	const entityFieldMap: Record<string, Field> = {};
	
	entities.forEach(entity => {
		entity.fieldAry.forEach(field => {
			entityFieldMap[entity.id + field.id] = field;
			
			if (entity.isSystem && !field.isPrivate) {
				entityFieldMap[entity.id + field.name] = field;
			}
		});
	});
	
	return entityFieldMap;
};

/** 打开面板时格式化选择字段，存在不匹配变更即删除 */
export const formatFieldsByOriginEntities = (fields: SelectedField[], originEntities: AnyType[]) => {
	const entityFieldMap = getEntityFieldMap(originEntities);
	
	return fields.filter(field => {
		let hasEffect = !!entityFieldMap[field.entityId + field.fieldId];
		
		if (field.fromPath.length) {
			for (let idx = 0; idx < field.fromPath.length; idx++) {
				if (!hasEffect) {
					break;
				}
				const path = field.fromPath[idx];
				const nextPath = field.fromPath[idx + 1] || field;
				const entityField = entityFieldMap[path.entityId + path.fieldId];
				
				if (!entityField || !entityField.mapping?.entity?.fieldAry.length || entityField.mapping?.entity?.id !== nextPath.entityId) {
					hasEffect = false;
				} else {
					hasEffect = !!entityField.mapping?.entity?.fieldAry.find(f => f.id === nextPath.fieldId);
				}
			}
		}
		
		return hasEffect;
	});
};

export const formatConditionByOriginEntities = (fields: SelectedField[], condition: Condition, originEntities: AnyType[]) => {
	const entityFieldMap = getEntityFieldMap(originEntities);
	
	const formatCondition = (condition: Condition[]) => {
		condition.forEach(con => {
			if (con.conditions) {
				formatCondition(con.conditions);
			} else {
				let hasEffect = !!entityFieldMap[con.entityId + con.fieldId];
				
				if (con.fromPath?.length) {
					const fromPath = JSON.parse(JSON.stringify(con.fromPath));
					const parentPath = fromPath.pop();
					parentPath.fromPath = fromPath;
					
					const parentField = fields.find(f => {
						return f.fieldId === parentPath.fieldId
							&& f.entityId === parentPath.entityId
							&& f.fromPath.map(p => p.fieldId).join('') === parentPath.fromPath.map(p => p.fieldId).join('');
					});
					const entityField = entityFieldMap[parentPath.entityId + parentPath.fieldId];
					
					if (!parentField || !entityField || !entityField.mapping?.entity?.fieldAry.find(f => f.id === con.fieldId)) {
						hasEffect = false;
					}
				}
				
				if (!hasEffect) {
					con.fieldId = '';
					con.fieldName = '';
					con.entityId = '';
					con.fromPath = [];
				} else if (!con.fromPath) {
					con.fromPath = [];
				}
			}
		});
	};
	formatCondition([condition]);
	
	return condition;
};

/** 打开面板时格式化排序项，存在不匹配变更即置为失效 */
export const formatOrderByOriginEntities = (fields: SelectedField[], orders: Order[], originEntities: AnyType[]) => {
	const entityFieldMap = getEntityFieldMap(originEntities);
	
	return orders.map(order => {
		let hasEffect = !!entityFieldMap[order.entityId + order.fieldId];
		
		if (order.fromPath?.length) {
			const fromPath = JSON.parse(JSON.stringify(order.fromPath));
			const parentPath = fromPath.pop();
			parentPath.fromPath = fromPath;
			
			const parentField = fields.find(f => {
				return f.fieldId === parentPath.fieldId
					&& f.entityId === parentPath.entityId
					&& f.fromPath.map(p => p.fieldId).join('') === parentPath.fromPath.map(p => p.fieldId).join('');
			});
			const entityField = entityFieldMap[parentPath.entityId + parentPath.fieldId];
			
			if (!parentField || !entityField || !entityField.mapping?.entity?.fieldAry.find(f => f.id === order.fieldId)) {
				hasEffect = false;
			}
		}
		
		if (!hasEffect) {
			order.fieldId = '';
			order.fieldName = '';
			order.entityId = '';
			order.fromPath = [];
		} else if (!order.fromPath) {
			order.fromPath = [];
		}
		
		return order;
	});
};

/** 格式化无效的连接 */
export const formatConAryByEntity = (conAry: Array<{ from: string; to: string }>, entity: Entity | null) => {
	return entity?.fieldAry.map(field => {
		/** 业务设置的字段 */
		if (!field.isPrimaryKey && !field.isPrivate && field.bizType !== FieldBizType.MAPPING && field.defaultValueWhenCreate !== DefaultValueWhenCreate.CURRENT_TIME) {
			return conAry.find(con => con.to === `/${field.name}`);
		}
	}).filter(Boolean) || [];
};

