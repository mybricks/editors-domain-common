import { Entity, Field, SelectedField } from '../_types/domain';
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

export const formatFieldsByOriginEntities = (fields: SelectedField[], originEntities: AnyType[]) => {
	const entityFieldMap: Record<string, Field> = {};
	originEntities.forEach(entity => {
		entity.fieldAry.forEach(field => {
			entityFieldMap[entity.id + field.id] = field;
			
			if (entity.isSystem && !field.isPrivate) {
				entityFieldMap[entity.id + field.name] = field;
			}
		});
	});
	const nextFields = fields.filter(field => !!entityFieldMap[field.entityId + field.fieldId] && !field.fromPath.length);
	const entityMap: Record<string, boolean> = {};
	fields.filter(field => !!entityFieldMap[field.entityId + field.fieldId] && field.fromPath.length).forEach(field => {
		if (entityMap[field.entityId]) {
			return;
		}
		const entityField = entityFieldMap[field.fromPath[0].entityId + field.fromPath[0].fieldId];
		entityMap[field.entityId] = true;
		
		entityField?.mapping?.entity?.fieldAry.forEach(f => {
			nextFields.push({
				fieldName: f.name,
				fieldId: f.id,
				entityId: (entityField.mapping!.entity!.id as string),
				fromPath: [{ fieldId: entityField.id, fieldName: entityField.name, entityId: field.entityId, fromPath: [] }],
			});
		});
	});
	
	return nextFields;
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

