import React, { ReactNode } from 'react';
// @ts-ignore
import { evt, useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import Where from '../_common/where';
import PopView from '../_common/pop-view';
import { AnyType } from '../_types';
import { SQLWhereJoiner } from '../_constants/field';
import { Entity, Field } from '../_types/domain';

import css from './QueryEditor.less';

let ctx: QueryCtx;

export default function QueryEditor({ domainModel, paramSchema, value, close }: AnyType) {
	ctx = useObservable(QueryCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));//深度复制
		} else {
			val = {
				whereJoiner: 'and',
				conditions: {
					fieldId: Date.now(),
					fieldName: '条件组',
					whereJoiner: SQLWhereJoiner.AND,
					conditions: []
				},
				entities: [],
				limit: 100
			};
		}
		
		/** 实体信息可能存在变更，每次使用最新的实体信息 */
		val.entities = val.entities.map((entity: Entity) => {
			const originEntity = domainModel.entityAry.find((e: Entity) => e.id === entity.id);
			
			if (originEntity) {
				return {
					...originEntity,
					fieldAry: entity.fieldAry.map((field: Field) => {
						const originField = originEntity.fieldAry.find((f: Field) => f.id === field.id);
						
						return originField ? { ...originField } : undefined;
					}).filter(Boolean),
				};
			}
		}).filter(Boolean);

		next({
			domainModel,
			paramSchema,
			nowValue: val,
			value,
			close
		});
	}, { to: 'children' });

	return (
		<PopView close={close} save={ctx.save} clickView={evt(ctx.blurAll).stop}>
		  <SelectFrom/>
		  {
			  ctx.nowValue.entities?.length ? (
				  <>
					  <Where
						  addBlur={ctx.addBlur}
						  nowValue={ctx.nowValue}
						  paramSchema={ctx.paramSchema}
					  />
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
		const res: ReactNode[] = [];
		
		if (nowValue.entities.length) {
			nowValue.entities.map((entity) => {
				const originEntity = entityAry.find((et: Entity) => et.id === entity.id);
				
				res.push(...originEntity.fieldAry.map((field: Field) => {
					const checked = Boolean(entity.fieldAry.find(f => f.id === field.id));
					
					return (
						<div key={field.id} className={css.field}>
							<input type="checkbox" checked={checked} onChange={() => ctx.setField(entity, field.id)} />
							{entity.name}.{field.name}
							<span>{field.desc}</span>
						</div>
					);
				}));
			});
		}
		
		return res;
	});

	return (
		<>
			<div className={`${css.segTitle} ${css.noTopBorder}`}>1. 选择表与字段</div>
			<div className={css.select}>
				<div className={css.tables}>
					{
						entityAry.map((et: Entity) => {
							const selected = Boolean(nowValue.entities?.find(entity => entity.id === et.id));
							
							return (
								<div
									key={et.id}
									className={`${css.table} ${selected ? css.selected : ''}`}
									onClick={() => ctx.setEntity(et)}
								>
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
					onChange={e => nowValue.limit = e.target.value}>
					<option value={10}>10条数据</option>
					<option value={100}>100条数据</option>
					<option value={500}>500条数据</option>
					<option value={1000}>1000条数据</option>
				</select>
			</div>
		</div>
	);
}