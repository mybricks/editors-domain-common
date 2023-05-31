import React, { useCallback, useMemo, useRef, useState } from 'react';
// @ts-ignore
import { evt, getPosition, useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import Where from '../_common/select-where';
import PopView from '../_common/pop-view';
import { AnyType } from '../_types';
import { SQLLimitType, SQLWhereJoiner } from '../_constants/field';
import { Entity, Field } from '../_types/domain';
import OrderBy from '../_common/order-by';
import SelectFromCollapse from './SelectFromCollapse';
import {
	formatConditionByOriginEntities,
	formatEntitiesByOriginEntities,
	formatFieldsByOriginEntities,
	formatOrderByOriginEntities
} from '../_utils/entity';

import css from './QueryEditor.less';

let ctx: QueryCtx;

export default function QueryEditor({ domainModel, paramSchema, value, close, showPager, selectCount }: AnyType) {
	ctx = useObservable(QueryCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));//深度复制
		} else {
			val = {
				fields: [],
				whereJoiner: 'and',
				conditions: {
					entityId: Date.now(),
					fieldId: Date.now(),
					fieldName: '条件组',
					whereJoiner: SQLWhereJoiner.AND,
					conditions: []
				},
				entities: domainModel.entityAry.map((entity: AnyType) => entity.toJSON()),
				limit: {
					type: showPager ? SQLLimitType.CUSTOM : SQLLimitType.ENUM,
					value: showPager ? '{params.pageSize}' : 100
				},
				pageNum: showPager ? '{params.pageNum}' : '',
			};
		}
		
		/** 实体信息可能存在变更，每次使用最新的实体信息 */
		val.entities = formatEntitiesByOriginEntities(val.entities, domainModel.entityAry.map((entity: AnyType) => entity.toJSON()));
		val.fields = formatFieldsByOriginEntities(val.fields ?? [], domainModel.entityAry);
		val.orders = formatOrderByOriginEntities(val.orders ?? [], val.entities);
		val.conditions = formatConditionByOriginEntities(val.conditions, val.entities);

		next({
			domainModel,
			paramSchema,
			nowValue: val,
			value,
			close,
			showPager,
			selectCount
		});
	}, { to: 'children' });

	return (
		<PopView close={close} save={ctx.save} clickView={evt(ctx.blurAll).stop}>
		  <SelectFrom />
		  {
			  ctx.nowValue.entities?.length ? (
				  <>
					  <Where
						  addBlur={ctx.addBlur}
						  nowValue={ctx.nowValue}
						  paramSchema={ctx.paramSchema}
						  domainModal={ctx.domainModel}
					  />
					  {selectCount ? null : <OrderBy nowValue={ctx.nowValue} domainModal={ctx.domainModel}/>}
					  {showPager || selectCount ? null : <Limit/>}
					  {/*{showPager ? <Offset /> : null}*/}
				  </>
			  ) : null
		  }
		</PopView>
	);
}

function SelectFrom() {
	const nowValue = ctx.nowValue;
	const currentEntity = useComputed(() => {
		return nowValue.entities.find(e => e.selected);
	});
	const selectedAll = useComputed(() => {
		const fields = nowValue.fields;
		
		return !!currentEntity?.fieldAry.filter(f => !f.isPrivate).every(field => fields.some(f => f.fieldId === field.id && !f.fromPath.length));
	});
	const onSelectAll = useCallback(() => {
		ctx.onSelectAllFields(selectedAll);
	}, [selectedAll]);

	return (
		<>
			<div className={`${css.segTitle} ${css.noTopBorder}`}>1. 选择表与字段</div>
			<div className={css.select}>
				<div className={css.tables}>
					{
						nowValue.entities.filter(e => !e.isSystem).map(et => {
							return (
								<div
									title={`${et.name}(${et.desc})`}
									key={et.id}
									className={`${css.table} ${et.selected ? css.selected : ''}`}
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
					{currentEntity ? (
						ctx.selectCount ? (
							<div className={`${css.field} ${css.disabled}`}>
								<input type="checkbox" checked/>
								<span>总数</span>
								<span>查询总数</span>
							</div>
						) : (
							<>
								<div className={`${css.field} ${css.allField}`}>
									<input type="checkbox" checked={selectedAll} onChange={onSelectAll}/>
									<span onClick={onSelectAll}>{selectedAll ? '取消所有字段' : '选中所有字段'}</span>
									<span></span>
								</div>
								{currentEntity.fieldAry.filter(f => !f.isPrivate).map(field => {
									return (
										<SelectFromCollapse
											key={field.id}
											initialOpen
											entity={currentEntity as Entity}
											ctx={ctx}
											fromPath={[]}
											field={field as Field}
										/>
									);
								})}
							</>
						)
					) : []}
				</div>
			</div>
		</>
	);
}

function Limit() {
	const nowValue = ctx.nowValue;
	const [showPop, setShowPop] = useState(false);
	const containerEle = useRef(null);
	const popEle = useRef<AnyType>(null);
	
	const addExpression = useCallback(param => {
		nowValue.limit.value = param;
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
		<div style={{ marginBottom: '12px', position: 'relative' }} ref={containerEle}>
			<div className={css.segTitle}>
        4. 限制数量
				{!ctx.showPager ? (
					<select
						className={css.selectDom}
		        value={nowValue.limit.value}
		        onChange={e => {
			        nowValue.limit = { type: SQLLimitType.ENUM, value: Number(e.target.value) };
		        }}
					>
						<option value={10}>10条数据</option>
						<option value={20}>20条数据</option>
						<option value={50}>50条数据</option>
						<option value={100}>100条数据</option>
						<option value={500}>500条数据</option>
						<option value={1000}>1000条数据</option>
					</select>
				) : null}
				
				{ctx.showPager ? (
					<input
						className={css.pageInput}
						type="text"
						value={nowValue.limit.value}
						onChange={e => nowValue.limit.value = e.target.value}
						onClick={evt((e: Event) => {
							popEle.current = e.target;
							setShowPop(true);
							ctx.addBlur(() => setShowPop(false));
						}).stop}
					/>
				) : null}
			</div>
			{popParamValues}
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
		nowValue.pageNum = param;
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
					value={nowValue.pageNum}
					onChange={e => nowValue.pageNum = e.target.value}
					onClick={evt((e: Event) => {
						popEle.current = e.target;
						setShowPop(true);
						ctx.addBlur(() => setShowPop(false));
					}).stop}
				/>
			</div>
			{popParamValues}
		</div>
	);
};
