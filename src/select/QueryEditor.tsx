import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
// @ts-ignore
import { evt, getPosition, useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import Where from '../_common/where';
import PopView from '../_common/pop-view';
import { AnyType } from '../_types';
import { CountFieldId, SQLWhereJoiner } from '../_constants/field';
import { Entity, Field } from '../_types/domain';
import OrderBy from '../_common/order-by';

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
			let originEntity = domainModel.entityAry.find((e: Entity) => e.id === entity.id);
			
			if (originEntity) {
				originEntity = originEntity.toJSON();
				
				return {
					...originEntity,
					fieldAry: entity.fieldAry.map((field: Field) => {
						const originField = originEntity.fieldAry.find((f: Field) => f.id === field.id);
						
						return field.id === CountFieldId ? field : (originField ? { ...originField } : undefined);
					}).filter(Boolean),
				};
			}
		}).filter(Boolean);
		val.originEntities = domainModel.entityAry.map((entity: AnyType) => entity.toJSON());

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
						  domainModal={ctx.domainModel}
					  />
					  <OrderBy nowValue={ctx.nowValue} domainModal={ctx.domainModel} />
					  <Limit/>
					  <Offset />
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
				
				res.push((
					<div key={CountFieldId} className={css.field}>
						<input
							type="checkbox"
							checked={Boolean(entity.fieldAry.find(f => f.id === CountFieldId))}
							onChange={() => ctx.setField(entity, CountFieldId)}
						/>
						查询总数
						<span>COUNT(*)</span>
					</div>
				));
				
				res.push(
					...originEntity.fieldAry.map((field: Field) => {
						const checked = Boolean(entity.fieldAry.find(f => f.id === field.id));
					
						return (
							<div key={field.id} className={css.field}>
								<input type="checkbox" checked={checked} onChange={() => ctx.setField(entity, field.id)} />
								{entity.name}.{field.name}
								<span>{field.desc}</span>
							</div>
						);
					})
				);
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
									<span>{et.name}</span>
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
		<div style={{ marginBottom: '12px' }}>
			<div className={css.segTitle}>
        4. 限制数量
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

/** 分页数据 */
const Offset = () => {
	const nowValue = ctx.nowValue;
	const [showPop, setShowPop] = useState(false);
	const containerEle = useRef(null);
	const popEle = useRef<AnyType>(null);
	
	const addExpression = useCallback(param => {
		nowValue.pageIndex = param;
	}, []);
	
	const popParamValues = useMemo(() => {
		if (showPop) {
			const params = ctx.paramSchema?.properties;
			const po = getPosition(popEle.current, containerEle.current);
			
			// @ts-ignore
			const style = { left: po.x, top: po.y + popEle.current.offsetHeight };
			
			return (
				<div className={css.popMenu} style={style}>
					{
						Object.keys((params || {}) as object).map(param => {
							return (
								<div key={param} className={`${css.item}`} onClick={() => addExpression(`{params.${param}}`)}>
									params.{param}
								</div>
							);
						})
					}
				</div>
			);
		}
		
		return null;
	}, [showPop]);
	
	return (
		<div ref={containerEle} className={css.offsetContainer}>
			<div className={css.segTitle}>
				5. 限制分页
			</div>
			<div className={css.content}>
				分页数值（页码）为
				<input
					className={css.pageInput}
					type="text"
					value={nowValue.pageIndex}
					onChange={e => nowValue.pageIndex = e.target.value}
					onClick={evt((e: Event) => {
						popEle.current = e.target;
						setShowPop(true);
						ctx.addBlur(() => setShowPop(false));
					}).stop}/>
			</div>
			{popParamValues}
		</div>
	);
};