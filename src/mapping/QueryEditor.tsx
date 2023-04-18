import React from 'react';
import { evt, useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import Where from './Where';
import { AnyType } from '../_types';

import css from './QueryEditor.less';
import PopView from "../_common/pop-view";

let ctx: QueryCtx;

export default function QueryEditor({ domainModel, fieldModel, value, close }: AnyType) {
	ctx = useObservable(QueryCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));//深度复制
		} else {
			val = {
				condition: '-1',
				fieldJoiner: ','
			};
		}

		const myEntity = fieldModel.parent;

		const entityInfo = {};
		const entityAry = [];
		domainModel.entityAry.forEach(et => {
			if (fieldModel.isBizTypeOfSystem()) {
				if (et.id === fieldModel.relationEntityId) {
					const primaryField = myEntity.searchRelationFieldByForeignerId(et.id);
					if (primaryField) {
						entityAry.push(et);
						entityInfo[et.id] = {
							type: 'primary',
							field: primaryField
						};
					}
				}
			} else if (fieldModel.isBizTypeOfRelation()) {
				if (et.id === fieldModel.relationEntityId) {
					const primaryField = myEntity.searchRelationFieldByForeignerId(et.id);
					if (primaryField) {
						entityAry.push(et);
						entityInfo[et.id] = {
							type: 'primary',
							field: primaryField
						};
					}
				}
			} else if (!et.isSystem) {//忽略系统表
				//主键关联
				const foreignerField = et.searchRelationFieldByForeignerId(myEntity.id);
				if (foreignerField) {
					entityAry.push(et);
					entityInfo[et.id] = {
						type: 'foreigner',
						field: foreignerField
					};
				} else {
					const primaryField = myEntity.searchRelationFieldByForeignerId(et.id);
					if (primaryField) {
						entityAry.push(et);
						entityInfo[et.id] = {
							type: 'primary',
							field: primaryField
						};
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
	}, { to: "children" });

	return (
		<PopView close={close} save={ctx.save} clickView={evt(ctx.blurAll).stop}>
			<SelectFrom/>
			{ctx.nowValue.entity ? <Where /> : null}
		</PopView>
	);
}

function SelectFrom() {
	const nowValue = ctx.nowValue;

	const fields = useComputed(() => {
		const nowEntity = nowValue.entity;
		if (nowEntity) {
			const oriEntity = ctx.entityAry.find(et => et.id === nowEntity.id);
			return (
				oriEntity.fieldAry.map(field => {
					if (!field.isBizTypeOfMapping() && !field.isPrivate) {
						let checked = false;
						if (nowEntity.fieldAry) {
							checked = !!nowEntity.fieldAry.find(f => f.name === field.name);
						}

						return (
							<div key={field.id}
								className={`${css.field}`}
								//onClick={e => ctx.setField(field.id)}
							>
								<input type={'checkbox'}
									checked={checked}
									onChange={() => ctx.setField(field.id)}
								/>
								{field.name}
								<span>{field.desc}</span>
							</div>
						);
					}
				}).filter(f => f)
			);
		}
	});

	const joiner = useComputed(() => {
		const nowEntity = nowValue.entity;

		if (nowEntity && ctx.isEntityForeigner(nowEntity.id) && nowValue.condition === '-1') {
			return (
				<>
          ，多条记录以
					<select className={css.selectDom}
						value={nowValue.fieldJoiner}
						onChange={e => {
							nowValue.fieldJoiner = e.target.value;
						}}>
						<option value={','}>,</option>
						<option value={'、'}>、</option>
						<option value={' '}>空格</option>
					</select>
          连接
				</>
			);
		}
	});

	return (
		<>
			<div className={css.segTitle}>
        1. 选择表与字段
				{joiner}
			</div>
			<div className={css.select}>
				<div className={css.tables}>
					{
						ctx.entityAry.map(et => {
							const info = ctx.entityInfo[et.id];

							return (
								<div key={et.id}
									className={`${css.table} ${ctx.isEntityForeigner(et.id) ? css.foreigner : ''}  ${nowValue.entity?.id === et.id ? css.selected : ''}`}
									onClick={() => ctx.setEntity(et)}>
									<div className={css.nm}>
										<span>{et.name}</span>
										<span>{info.type === 'foreigner' ? 'id' : info.field.name}</span>
									</div>
									<div className={css.desc}>{et.desc}</div>
								</div>
							);
						})
					}
				</div>
				<div className={css.fields}>
					{fields}
				</div>
			</div>
		</>
	);
}