import { Entity, Field } from '../_types/domain';
import { AnyType } from '../_types';

/**
 * 实体信息可能存在变更，每次使用最新的实体信息
 * 根据 domainModal 中实体列表刷新 editor 中的 entities（已选择实体列表） */
export const formatEntitiesByOriginEntities = (entities: Entity[], originEntities: AnyType[]) => {

	return entities.map((entity: Entity) => {
		let originEntity = originEntities.find((e: Entity) => e.id === entity.id);
		
		if (originEntity) {
			originEntity = originEntity.toJSON();
			
			return {
				...originEntity,
				fieldAry: entity.fieldAry.map((field: Field) => {
					const originField = originEntity.fieldAry.find((f: Field) => f.id === field.id);
					
					return originField ? { ...originField } : undefined;
				}).filter(Boolean),
			};
		}
	}).filter(Boolean);
};