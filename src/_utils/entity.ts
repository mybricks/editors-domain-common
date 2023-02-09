import { Entity, Field } from '../_types/domain';
import { AnyType } from '../_types';

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

