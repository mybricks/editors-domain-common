import React, { FC, useCallback, useState } from 'react';
import { message } from 'antd';
import QueryCtx from './QueryCtx';
import { AnyType } from '../_types';
import { Entity, Field } from '../_types/domain';
import { FieldBizType } from '../_constants/field';
import { CountCondition } from '../mapping/constant';

import css from './QueryEditor.less';

interface SelectFromProps {
	field: Field;
	ctx: QueryCtx;
	entityIdChain: string[];
	entity: Entity;
	fromPath: Array<Field & { entityId: string; }>;
	initialOpen: boolean;
	/** 指定下一层级不允许映射 */
	notMapping?: boolean;
}

const SelectFromCollapse: FC<SelectFromProps> = props => {
	const { ctx, field, fromPath, entity, initialOpen, entityIdChain, notMapping } = props;
	const [open, setOpen] = useState(initialOpen);
	const selected = !!ctx.nowValue.fields.find(
		f2 => f2.fieldId === field.id
			&& f2.fromPath.map(path => path.fieldId).join('') === (fromPath.map(path => path.id).join(''))
	);
	const isMapping = !notMapping && !!field.mapping?.entity?.fieldAry?.length;
	let fieldMappingEntity = field.mapping?.entity as AnyType as Entity;
	
	if (isMapping) {
		const oldFieldIds = field.mapping?.entity?.fieldAry.map(f => f.id) || [];
		let curEntity = ctx.nowValue.entities.find(en => en.id === fieldMappingEntity.id);

		if (curEntity) {
			curEntity = JSON.parse(JSON.stringify(curEntity));
			fieldMappingEntity = { ...curEntity as AnyType as Entity };
			fieldMappingEntity.fieldAry = fieldMappingEntity.fieldAry.filter(f => oldFieldIds.includes(f.id));
		} else {
			fieldMappingEntity.fieldAry = [];
		}

		if (field.mapping?.condition === CountCondition) {
			const primaryField = fieldMappingEntity.fieldAry.find(f => f.name === 'id');

			if (primaryField) {
				primaryField.name = '总数';
				primaryField.desc = '查询数据总数';
			}
		}
	}
	/** 映射类型，但未设置映射数据 */
	const disabled = field.bizType === FieldBizType.MAPPING && !isMapping;

	const onSelect = () => {
		if (disabled) {
			message.warning(notMapping ? '不允许选择循环嵌套字段' : `${field.name}字段未设置对应映射数据`);
			return;
		}
		if (fromPath.length) {
			ctx.setMappingField({
				fieldId: field.id,
				fieldName: field.name,
				entityId: entity.id,
				fromPath: fromPath.map(f => ({ fieldId: f.id, fieldName: f.name, entityId: f.entityId, fromPath: [] }))
			});
		} else {
			ctx.setField(entity as AnyType, field.id);
			setOpen(!selected);
		}
	};
	
	const clickOpen = useCallback(() => isMapping && setOpen(open => !open), [isMapping]);
	
	return (
		<div className={css.selectFromCollapse}>
			<div
				key={field.id}
				className={`${css.field} ${disabled ? css.disabled : ''}`}
				title={`${field.name}(${field.desc ?? ''})`}
			>
				<div className={css.collapseIcon} style={open ? { transform: 'rotateZ(90deg)' } : undefined} onClick={clickOpen}>
					{isMapping && selected ? (
						<svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="#aeafb2">
							<path d="M715.8 493.5L335 165.1c-14.2-12.2-35-1.2-35 18.5v656.8c0 19.7 20.8 30.7 35 18.5l380.8-328.4c10.9-9.4 10.9-27.6 0-37z"></path>
						</svg>
					) : null}
				</div>
				<input type="checkbox" checked={selected} onChange={onSelect} />
				<span onClick={onSelect}>{field.name}</span>
				<span>{field.desc}</span>
			</div>
			{open && isMapping && selected ? (
				<div className={css.selectFromChildren}>
					<div className={css.mappingFieldHeader}>
						所属实体：{field.mapping?.entity?.name}
					</div>
					{fieldMappingEntity.fieldAry
						.map(f => (
							<SelectFromCollapse
								key={f.id}
								entityIdChain={[...entityIdChain, fieldMappingEntity.id]}
								initialOpen={false}
								fromPath={[...fromPath, { ...field, entityId: entity.id }]}
								field={f}
								entity={fieldMappingEntity}
								ctx={ctx}
								notMapping={entityIdChain[entityIdChain.length - 2] === fieldMappingEntity.id}
							/>
						))}
				</div>
			) : null}
		</div>
	);
};

export default SelectFromCollapse;
