import { evt, getPosition, observe, useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx, { T_Entity } from './QueryCtx';
import React, { useCallback } from 'react';
import { Remove } from './Icons';
import { AnyType } from '../_types';
import { getFieldConditionAry } from '../_utils/field';

// @ts-ignore
import css from './Where.less';

class MyCtx {
	whereEle: HTMLElement | undefined;

	popEle: HTMLElement | undefined;

	popFields: { entity: T_Entity; } | undefined;

	popParams: { condition: AnyType; field: AnyType } | undefined;
}

let ctx: QueryCtx;
let wCtx: MyCtx;

export default function Where() {
	ctx = observe(QueryCtx, { from: 'parents' });
	wCtx = useObservable(MyCtx);

	const nowValue = ctx.nowValue;

	const addWhere = useCallback(() => {
		wCtx.popFields = { entity: ctx.getOriEntity() };
		ctx.addBlur(() => {
			wCtx.popFields = void 0;
		});
	}, []);

	const addCondition = useCallback((field) => {
		ctx.addCondition(field);
		wCtx.popFields = void 0;
	}, []);

	console.log('nowValue', nowValue);
	return (
		<div className={css.where} ref={ele => ele && (wCtx.whereEle = ele)}>
			<div className={css.segTitle}>
        2. 筛选符合以下
				<select className={css.selectDom}
					value={nowValue.whereJoiner}
					onChange={e => {
						nowValue.whereJoiner = e.target.value;
					}}>
					<option value={'and'}>所有条件</option>
					<option value={'or'}>任一条件</option>
				</select>
        的数据
				<span className={css.addWhere} onClick={evt(addWhere).stop}>+</span>
				{
					wCtx.popFields ? (
						<div className={css.popMenu}>
							{
								wCtx.popFields.entity.fieldAry.map(field => {
									const used = nowValue.conditions.find(con => con.fieldId === field.id);

									return (
										<div key={field.id}
											className={`${css.item} ${used ? css.used : ''}`}
											onClick={!used ? () => addCondition(field) : undefined}>
											{field.name}
										</div>
									);
								})
							}
						</div>
					) : null
				}
			</div>
			<Conditions/>
		</div>
	);
}

function Conditions() {
	const nowValue = ctx.nowValue;

	const remove = useCallback(fieldId => {
		ctx.removeCondition(fieldId);
	}, []);

	const allCons = useComputed(() => {
		return nowValue.conditions.map(condition => {
			const oriField = ctx.getOriField(condition.fieldId);
			if (oriField) {
				//存在表切换的情况
				const operators = getFieldConditionAry(oriField.dbType);

				if (!condition.operator) {
					condition.operator = operators[0].value;
				}

				return (
					<div key={condition.fieldId}
						className={css.condition}
						data-joiner={nowValue.whereJoiner === 'and' ? '并且' : '或'}>
						<span className={css.name}>
							{condition.fieldName}
						</span>

						<select value={condition.operator}
							onChange={e => {
								condition.operator = e.target.value;
							}}>
							{
								operators.map((operator, idx) => {
									return (
										<option key={idx} value={operator.value}>
											{operator.label}
										</option>
									);
								})
							}
						</select>
						<input type={'text'}
							value={condition.value}
							onChange={e => {
								condition.value = e.target.value;
							}}
							onClick={evt(e => {
								wCtx.popEle = e.target as any;
								wCtx.popParams = {
									condition,
									field: oriField
								};
								ctx.addBlur(() => {
									wCtx.popParams = void 0;
								});
							}).stop}/>
						<span className={css.icons}
							onClick={e => {
								remove(condition.fieldId);
							}}>
							{Remove}
						</span>
					</div>
				);
			}
		}).filter(f => f);
	});

	const addExpression = useCallback(param => {
		wCtx.popParams.condition.value = `{params.${param}}`;
	}, []);

	const popParamValues = useComputed(() => {
		if (wCtx.popParams) {
			const params = ctx.paramSchema.properties;
			const po = getPosition(wCtx.popEle, wCtx.whereEle);

			const style = { left: po.x, top: po.y + wCtx.popEle.offsetHeight };

			return (
				<div className={css.popMenu} style={style}>
					{
						Object.keys(params).map(param => {
							return (
								<div key={param}
									className={`${css.item}`}
									onClick={e => addExpression(param)}>
                  params.{param}
								</div>
							);
						})
					}
				</div>
			);
		}
		return null;
	});

	return (
		<div className={css.conditions}>
			{
				allCons.length > 0 ? allCons : (
					<div className={css.empty}>（没有限制条件）</div>
				)
			}
			{popParamValues}
		</div>
	);
}