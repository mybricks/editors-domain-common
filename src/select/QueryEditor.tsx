import React from 'react';
import { useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import Where from './Where';
import PopView from '../_common/pop-view';

// @ts-ignore
import css from './QueryEditor.less';

let ctx: QueryCtx;

export default function QueryEditor({ domainModel, paramSchema, value, close }) {
	ctx = useObservable(QueryCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));//深度复制
		} else {
			val = {
				whereJoiner: 'and',
				conditions: [],
				limit: 100
			};
		}

		next({
			domainModel,
			paramSchema,
			nowValue: val,
			value,
			close
		});
	}, { to: 'children' });

	return (
		<PopView close={close} save={ctx.save}>
		  <SelectFrom/>
		  {
			  ctx.nowValue.entity ? (
				  <>
					  <Where/>
					  <Limit/>
				  </>
			  ) : null
		  }
		</PopView>
	);
}

function SelectFrom() {
	const nowValue = ctx.nowValue;
	const entityAry = ctx.domainModel.entityAry;

	const fields = useComputed(() => {
		const nowEntity = nowValue.entity;
		if (nowEntity) {
			const oriEntity = entityAry.find(et => et.id === nowEntity.id);
			return (
				oriEntity.fieldAry.map(field => {
					const checked = nowEntity.fieldAry.find(f => f.id === field.id) ? true : false;

					return (
						<div key={field.id}
							className={`${css.field}`}>
							<input type={'checkbox'}
								checked={checked}
								onChange={e => ctx.setField(field.id)}/>
							{field.name}
							<span>{field.desc}</span>
						</div>
					);
				})
			);
		}
	});

	return (
		<>
			<div className={`${css.segTitle} ${css.noTopBorder}`}>1. 选择表与字段</div>
			<div className={css.select}>
				<div className={css.tables}>
					{
						entityAry.map(et => {
							return (
								<div key={et.id}
									className={`${css.table} ${nowValue.entity?.id === et.id ? css.selected : ''}`}
									onClick={e => ctx.setEntity(et)}>
									{et.name}
									<span>{et.desc}</span>
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


function Limit() {
	const nowValue = ctx.nowValue;

	return (
		<div>
			<div className={css.segTitle}>
        3. 限制数量
				<select className={css.selectDom}
					value={nowValue.limit}
					onChange={e => {
						nowValue.limit = e.target.value;
					}}>
					<option value={10}>10条数据</option>
					<option value={100}>100条数据</option>
					<option value={500}>500条数据</option>
					<option value={1000}>1000条数据</option>
				</select>
			</div>
		</div>
	);
}