import React, { FC, useCallback, useState } from 'react';
import QueryCtx from "./QueryCtx";
import { AnyType } from "../_types";
import { Entity, Field } from "../_types/domain";

import css from "./QueryEditor.less";

interface SelectFromProps {
	field: Field;
	ctx: QueryCtx;
	entity: Entity;
	fromPath: Array<Field & { entityId: string; }>;
	initialOpen: boolean;
}

const SelectFromCollapse: FC<SelectFromProps> = props => {
	const { ctx, field, fromPath, entity, initialOpen } = props;
	const [open, setOpen] = useState(initialOpen);
	const selected = !!ctx.nowValue.fields.find(
		f2 => f2.fieldId === field.id
			&& f2.fromPath.map(path => path.fieldId).join('') === (fromPath.map(path => path.id).join(''))
	);
	const isMapping = !!field.mapping?.entity?.fieldAry.length;
	const fieldMappingEntity = field.mapping?.entity as AnyType as Entity;
	
	const onSelect = () => {
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
				className={css.field}
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
								initialOpen={false}
								fromPath={[...fromPath, { ...field, entityId: entity.id }]}
								field={f}
								entity={field.mapping!.entity!}
								ctx={ctx}
							/>
						))}
				</div>
			) : null}
		</div>
	);
};

export default SelectFromCollapse;
