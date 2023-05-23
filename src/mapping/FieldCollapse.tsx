import React, { FC, useCallback, useState } from 'react';
import { message } from 'antd';
import QueryCtx from './QueryCtx';
import { AnyType } from '../_types';
import { Entity, Field } from '../_types/domain';
import { FieldBizType } from '../_constants/field';

import css from './FieldCollapse.less';

interface FieldCollapseProps {
	field: Field;
	ctx: QueryCtx;
	entity: Entity;
	fromPath: Array<Field & { entityId: string; }>;
	initialOpen: boolean;
}

const FieldCollapse: FC<FieldCollapseProps> = props => {
	const { ctx, field, fromPath, entity, initialOpen } = props;
	const [open, setOpen] = useState(initialOpen);
	const isMapping = !!field.mapping?.entity?.fieldAry.length;
	let fieldMappingEntity = field.mapping?.entity as AnyType as Entity;
	
	if (isMapping) {
		fieldMappingEntity = JSON.parse(JSON.stringify(ctx.domainModel.entityAry.find(en => en.id === fieldMappingEntity.id) as AnyType as Entity) || 'null');
		const oldFieldIds = field.mapping?.entity?.fieldAry.map(f => f.id) || [];
		fieldMappingEntity.fieldAry = fieldMappingEntity.fieldAry.filter(f => oldFieldIds.includes(f.id));
	}
	
	/** 映射类型，但为设置映射数据 */
	const disabled = field.bizType === FieldBizType.MAPPING && !isMapping;
	
	const clickOpen = useCallback(event => {
		event.stopPropagation();
		isMapping && setOpen(open => !open);
	}, [isMapping]);
	
	const onClickField = useCallback(() => {
		if (disabled) {
			message.warning(`${field.name}字段未设置对应映射数据`);
			return;
		}
	}, [disabled]);
	
	return (
		<div className={css.selectFromCollapse}>
			<div
				key={field.id}
				className={`${css.field} ${disabled ? css.disabled : ''}`}
				title={`${field.name}(${field.desc ?? ''})`}
				onClick={onClickField}
			>
				<div className={css.collapseIcon} style={open ? { transform: 'rotateZ(90deg)' } : undefined} onClick={clickOpen}>
					{isMapping ? (
						<svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="#aeafb2">
							<path d="M715.8 493.5L335 165.1c-14.2-12.2-35-1.2-35 18.5v656.8c0 19.7 20.8 30.7 35 18.5l380.8-328.4c10.9-9.4 10.9-27.6 0-37z"></path>
						</svg>
					) : null}
				</div>
				<span>{field.name}</span>
				<span>{field.desc}</span>
			</div>
			{open && isMapping ? (
				<div className={css.selectFromChildren}>
					<div className={css.mappingFieldHeader}>
						所属实体：{field.mapping?.entity?.name}
					</div>
					{fieldMappingEntity.fieldAry
						.map(f => (
							<FieldCollapse
								key={f.id}
								initialOpen={false}
								fromPath={[...fromPath, { ...field, entityId: entity.id }]}
								field={f}
								entity={fieldMappingEntity}
								ctx={ctx}
							/>
						))}
				</div>
			) : null}
		</div>
	);
};

export default FieldCollapse;
