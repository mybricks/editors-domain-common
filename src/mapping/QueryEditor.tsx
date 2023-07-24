import React, { useCallback, useState } from 'react';
// @ts-ignore
import { evt, useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import Where from './Where';
import { AnyType } from '../_types';
import PopView from '../_common/pop-view';
import { Entity } from '../_types/domain';
import CalcFieldModal from './CalcFieldModal';
import { CountCondition } from './constant';
import { FieldBizType } from '../_constants/field';

import css from './QueryEditor.less';

let ctx: QueryCtx;

export default function QueryEditor({ domainModel, fieldModel, value, close }: AnyType) {
	ctx = useObservable(QueryCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));//深度复制
		} else {
			val = { condition: '-1', fieldJoiner: ',' };
		}

		const myEntity = fieldModel.parent;

		const entityInfo = {};
		const entityAry: Entity[] = [];

		if (fieldModel.bizType === FieldBizType.MAPPING) {
			const parentEntity = fieldModel.parent;
			entityAry.push(parentEntity);
			entityInfo[fieldModel.parent.id] = { type: 'primary', field: parentEntity.fieldAry[0]?.toJSON() };
		}

		domainModel.entityAry.forEach(et => {
			if (FieldBizType.RELATION === fieldModel.bizType) {
				if (et.id === fieldModel.relationEntityId) {
					entityAry.push(et);
					entityInfo[et.id] = { type: 'primary', field: fieldModel.toJSON() };
				}
			} else if (!et.isSystem) {//忽略系统表
				//主键关联
				const foreignerField = et.searchRelationFieldByForeignerId(myEntity.id);
				if (foreignerField) {
					entityAry.push(et);
					entityInfo[et.id] = { type: 'foreigner', field: foreignerField };
				} else {
					const primaryField = myEntity.searchRelationFieldByForeignerId(et.id);
					if (primaryField) {
						entityAry.push(et);
						entityInfo[et.id] = { type: 'primary', field: primaryField };
					}
				}
			}
		});

		next({
			domainModel,
			entityAry,
			entityInfo,
			fieldModel,
			nowValue: val,
			value,
			close
		});
	}, { to: 'children' });

	return (
		<PopView close={close} save={ctx.save} clickView={evt(ctx.blurAll).stop}>
			<SelectFrom/>
			{ctx.nowValue.entity ? <Where /> : null}
		</PopView>
	);
}

function SelectFrom() {
	const nowValue = ctx.nowValue;
	const [visible, setVisible] = useState(false);
	const [curEditField, setCurEditField] = useState<AnyType>(null);
	const onCancel = useCallback(() => setVisible(false), []);
	const onOk = useCallback(field => {
		console.log(field);
		setVisible(false);
	}, []);

	const fields = useComputed(() => {
		const nowEntity = nowValue.entity;
		if (nowEntity && nowEntity.id !== ctx.fieldModel.parent.id) {
			const oriEntity = ctx.entityAry.find(et => et.id === nowEntity.id);
			return oriEntity ? (
				oriEntity.fieldAry.map(field => {
					if (!field.isPrivate) {
						let checked = false;
						if (nowEntity.fieldAry) {
							checked = !!nowEntity.fieldAry.find(f => f.name === field.name);
						}

						return (
							<div key={field.id} className={css.field}>
								<input type="checkbox" checked={checked} onChange={() => ctx.setField(field.id)} />
								<span onClick={() => ctx.setField(field.id)}>{field.name}</span>
								<span>{field.desc}</span>
							</div>
						);
					}
				}).filter(f => f)
			) : null;
		}

		return null;
	});
	const selectedAll = useComputed(() => {
		const oriEntity = ctx.entityAry.find(et => et.id === nowValue.entity?.id);
		if (!oriEntity) {
			return false;
		}
		
		return !!oriEntity?.fieldAry
			.filter(f => !f.isPrivate)
			.every(field => nowValue.entity.fieldAry?.find(f => f.name === field.name));
	});
	const addCalcField = useCallback(() => {
		setCurEditField(null);
		setVisible(true);
	}, []);
	const onSelectAll = useCallback(() => {
		if (selectedAll) {
			nowValue.entity.fieldAry = [];
		} else {
			const oriEntity = ctx.entityAry.find(et => et.id === nowValue.entity?.id);
			nowValue.entity.fieldAry = oriEntity?.fieldAry
				.filter(f => !f.isPrivate)
				.map(f => {
					const curField = f.toJSON();

					return {
						id: curField.id,
						name: curField.name,
						bizType: curField.bizType,
						dbType: curField.dbType,
						isPrimaryKey: curField.isPrimaryKey,
						relationEntityId: curField.relationEntityId,
					};
				})?? [];
		}
	}, [selectedAll]);

	return (
		<>
			<div className={css.segTitle} style={{ borderTop: 'none' }}>
        1. 选择表与字段
			</div>
			<div className={css.select}>
				<div className={css.tables}>
					{
						ctx.entityAry.map(et => {
							const info = ctx.entityInfo[et.id];
							const selected = nowValue.entity?.id === et.id;

							return (
								<div
									key={et.id}
									className={`${css.table} ${ctx.isEntityForeigner(et.id) ? css.foreigner : ''}  ${selected ? css.selected : ''}`}
									onClick={selected ? undefined : () => ctx.setEntity(et)}
								>
									<div className={css.nm}>
										<span>{et.name}{et.id === ctx.fieldModel.parent.id ? ' (当前实体)' : ''}</span>
										<span>{info.type === 'foreigner' ? 'id' : info.field.name}</span>
									</div>
									<div className={css.desc}>{et.desc}</div>
								</div>
							);
						})
					}
				</div>
				{nowValue.condition === CountCondition ? (
					<div className={css.fields}>
						<div className={`${css.field} ${css.disabled}`}>
							<input type="checkbox" checked />
							<span>总数</span>
							<span>查询数据总数</span>
						</div>
					</div>
				) : (
					<div className={css.fields}>
						{/*{nowValue.entity ? (*/}
						{/*	<div className={`${css.field} ${css.addCalcField}`} onClick={addCalcField}>*/}
						{/*		<span className={css.addButton}>*/}
						{/*		+*/}
						{/*		</span>*/}
						{/*		<span>新增计算字段</span>*/}
						{/*		<span></span>*/}
						{/*	</div>*/}
						{/*) : null}*/}
						{nowValue.entity && nowValue.entity.id !== ctx.fieldModel.parent.id ? (
							<div className={`${css.field} ${css.allField}`}>
								<input type="checkbox" checked={selectedAll} onChange={onSelectAll}/>
								<span onClick={onSelectAll}>{selectedAll ? '取消所有字段' : '选中所有字段'}</span>
								<span></span>
							</div>
						) : null}
						{fields}
					</div>
				)}
			</div>
			
			<CalcFieldModal field={curEditField} visible={visible} onCancel={onCancel} onOK={onOk} />
		</>
	);
}
