import React, { ReactNode, useCallback, useState } from 'react';
// @ts-ignore
import { evt, useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import Where from './Where';
import { AnyType } from '../_types';
import PopView from '../_common/pop-view';
import { Entity, Field } from '../_types/domain';
import CalcFieldModal from './CalcFieldModal';
import { CountCondition } from './constant';
import { FieldBizType } from '../_constants/field';

import styles from './QueryEditor.less';

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
		if (curEditField) {
			const index = nowValue.entity.fieldAry.findIndex(f => f.id === field.id);

			if (index !== -1) {
				nowValue.entity.fieldAry[index] = field;
			}
		} else {
			nowValue.entity.fieldAry.push(field);
		}
		setVisible(false);
	}, [curEditField]);

	const onEditField = useCallback((field: Field) => {
		setCurEditField(field);
		setVisible(true);
	}, []);

	const onRemoveField = useCallback((field: Field) => {
		nowValue.entity.fieldAry = nowValue.entity.fieldAry.filter(f => f.id !== field.id);
	}, []);

	const fields = useComputed(() => {
		let fieldElements: ReactNode[] = [];
		const nowEntity = nowValue.entity;
		if (nowEntity && nowEntity.id !== ctx.fieldModel.parent.id) {
			const oriEntity = ctx.entityAry.find(et => et.id === nowEntity.id);
			
			fieldElements = oriEntity.fieldAry
				.map(field => {
					if (!field.isPrivate) {
						let checked = false;
						if (nowEntity.fieldAry) {
							checked = !!nowEntity.fieldAry.find(f => f.name === field.name);
						}

						return (
							<div key={field.id} className={styles.field}>
								<input type="checkbox" checked={checked} onChange={() => ctx.setField(field.id)} />
								<span onClick={() => ctx.setField(field.id)}>{field.name}</span>
								<span>{field.desc}</span>
							</div>
						);
					}
				})
				.filter(f => f);
		}

		const calcFields = nowEntity.fieldAry
			.filter(filed => filed.bizType === FieldBizType.CALC)
			.map(field => {
				return (
					<div key={field.id} className={`${styles.field} ${styles.disabled}`}>
						<input type="checkbox" checked />
						<span>{field.name}</span>
						<span>{field.desc}</span>
						<svg viewBox="64 64 896 896" className={`${styles.remove} ${styles.edit}`} onClick={() => onEditField(field as Field)}>
							<path d="M904 512h-56c-4.4 0-8 3.6-8 8v320H184V184h320c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V520c0-4.4-3.6-8-8-8z"></path><path d="M355.9 534.9L354 653.8c-.1 8.9 7.1 16.2 16 16.2h.4l118-2.9c2-.1 4-.9 5.4-2.3l415.9-415c3.1-3.1 3.1-8.2 0-11.3L785.4 114.3c-1.6-1.6-3.6-2.3-5.7-2.3s-4.1.8-5.7 2.3l-415.8 415a8.3 8.3 0 00-2.3 5.6zm63.5 23.6L779.7 199l45.2 45.1-360.5 359.7-45.7 1.1.7-46.4z"></path>
						</svg>
						<svg className={styles.remove} onClick={() => onRemoveField(field as Field)} viewBox="64 64 896 896">
							<path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z"></path>
						</svg>
					</div>
				);
			});

		if (calcFields.length) {
			fieldElements.push(<div className={styles.calcFieldTitle}>计算字段:</div>);
			fieldElements.push(...calcFields);
		}
		return fieldElements;
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
			nowValue.entity.fieldAry = nowValue.entity.fieldAry.filter(f => f.bizType === FieldBizType.CALC);
		} else {
			const oriEntity = ctx.entityAry.find(et => et.id === nowValue.entity?.id);
			nowValue.entity.fieldAry = [
				...oriEntity?.fieldAry
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
					})?? [],
				...nowValue.entity.fieldAry.filter(f => f.bizType === FieldBizType.CALC)
			];
		}
	}, [selectedAll]);

	return (
		<>
			<div className={styles.segTitle} style={{ borderTop: 'none' }}>
        1. 选择表与字段
			</div>
			<div className={styles.select}>
				<div className={styles.tables}>
					{
						ctx.entityAry.map(et => {
							const info = ctx.entityInfo[et.id];
							const selected = nowValue.entity?.id === et.id;

							return (
								<div
									key={et.id}
									className={`${styles.table} ${ctx.isEntityForeigner(et.id) ? styles.foreigner : ''}  ${selected ? styles.selected : ''}`}
									onClick={selected ? undefined : () => ctx.setEntity(et)}
								>
									<div className={styles.nm}>
										<span>{et.name}{et.id === ctx.fieldModel.parent.id ? ' (当前实体)' : ''}</span>
										<span>{info.type === 'foreigner' ? 'id' : info.field.name}</span>
									</div>
									<div className={styles.desc}>{et.desc}</div>
								</div>
							);
						})
					}
				</div>
				{nowValue.condition === CountCondition ? (
					<div className={styles.fields}>
						<div className={`${styles.field} ${styles.disabled}`}>
							<input type="checkbox" checked />
							<span>总数</span>
							<span>查询数据总数</span>
						</div>
					</div>
				) : (
					<div className={styles.fields}>
						{nowValue.entity ? (
							<div className={`${styles.field} ${styles.addCalcField}`} onClick={addCalcField}>
								<span className={styles.addButton}>
								+
								</span>
								<span>新增计算字段</span>
								<span></span>
							</div>
						) : null}
						{nowValue.entity && nowValue.entity.id !== ctx.fieldModel.parent.id ? (
							<div className={`${styles.field} ${styles.allField}`}>
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
