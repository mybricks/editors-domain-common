import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
// @ts-ignore
import { evt, getPosition, useComputed, useObservable } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import Where from '../_common/select-where';
import PopView from '../_common/pop-view';
import { AnyType } from '../_types';
import { SQLLimitType, SQLWhereJoiner } from '../_constants/field';
import { Entity, Field } from '../_types/domain';
import OrderBy from '../_common/order-by';
import {
	formatConditionByOriginEntities,
	formatEntitiesByOriginEntities,
	formatFieldsByOriginEntities,
	formatOrderByOriginEntities
} from '../_utils/entity';

import css from './QueryEditor.less';

let ctx: QueryCtx;

export default function QueryEditor({ domainModel, paramSchema, value, close, showPager }: AnyType) {
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
				pageIndex: showPager ? '{params.pageIndex}' : '',
			};
		}
		
		/** 实体信息可能存在变更，每次使用最新的实体信息 */
		val.entities = formatEntitiesByOriginEntities(val.entities, domainModel.entityAry);
		val.fields = formatFieldsByOriginEntities(val.fields ?? [], domainModel.entityAry);
		val.orders = formatOrderByOriginEntities(val.fields ?? [], val.orders ?? [], domainModel.entityAry);
		val.conditions = formatConditionByOriginEntities(val.fields ?? [], val.conditions, domainModel.entityAry);

		next({
			domainModel,
			paramSchema,
			nowValue: val,
			value,
			close,
			showPager
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
					  {showPager ? null : <Limit/>}
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
	const entityFieldMap = useComputed(() => {
		const entityFieldMap = {};
		nowValue.entities.forEach(entity => {
			entity.fieldAry.forEach(field => {
				entityFieldMap[entity.id + field.id] = field;
				
				if (entity.isSystem && !field.isPrivate) {
					entityFieldMap[entity.id + field.name] = field;
				}
			});
		});
		
		return entityFieldMap;
	});

	const renderFieldsByEntities = useComputed(() => {
		return (entities: Entity[]) => {
			const res: ReactNode[] = [];
			
			if (entities.length) {
				entities.map((entity) => {
					res.push(
						...entity.fieldAry
							.filter(field => !field.isPrivate)
							.map((field: Field) => {
								const selected = !!nowValue.fields.find(f => f.entityId === entity.id && f.fieldId === field.id && !f.fromPath.length);
								
								return (
									<div
										key={field.id}
										className={css.field}
										title={`${field.name}(${field.desc ?? ''})`}
									>
										<input type="checkbox" checked={selected} onChange={() => ctx.setField(entity as AnyType, field.id)} />
										<span onClick={() => ctx.setField(entity as AnyType, field.id)}>{field.name}</span>
										<span>{field.desc}</span>
									</div>
								);
							})
					);
				});
			}
			
			return res;
		};
	});
	
	const selectedMappingFields = useComputed(() => {
		const res: AnyType[] = [];
		let depIndex = 0;
		let selectedField = nowValue.fields.filter(f => f.fromPath.length === depIndex);

		while (selectedField.length) {
			const mappingFields = selectedField.filter(f => entityFieldMap[f.entityId + f.fieldId]?.mapping?.entity?.fieldAry.length);
			
			if (mappingFields.length) {
				const curMappings = mappingFields.map(f => ({ ...entityFieldMap[f.entityId + f.fieldId], entityId: f.entityId, fromPath: f.fromPath }));
				
				if (!res[depIndex]) {
					res[depIndex] = [...curMappings];
				} else {
					res[depIndex].push(...curMappings);
				}
			} else {
				break;
			}
			
			depIndex++;
			selectedField = nowValue.fields.filter(f => f.fromPath.length === depIndex);
		}
		
		return res;
	});
	
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
					{currentEntity ? renderFieldsByEntities([currentEntity as Entity]) : []}
				</div>
				{selectedMappingFields.map((mapping, index) => {
					return (
						<div key={index} className={`${css.fields} ${css.relationFields}`}>
							{mapping.map(field => {
								const pathName = field.fromPath.map(path => entityFieldMap[path.entityId + path.fieldId]?.name || '').join('.');
								
								return (
									<div key={field.id} className={css.mappingFields}>
										<div className={css.mappingFieldHeader}>
											<div>来自：{pathName ? `${pathName}.` : ''}{field.name}</div>
											<div className={css.mappingFieldEntity}>实体：{field.mapping?.entity?.name}</div>
										</div>
										{field.mapping?.entity?.fieldAry.map(f => {
											const selected = !!nowValue.fields.find(
												f2 => f2.entityId === field.mapping?.entity?.id
													&& f2.fieldId === f.id
													&& f2.fromPath.map(path => path.fieldId).join('') === (field.fromPath.map(path => path.fieldId).join('') + field.id)
											);
											const onSelect = () => {
												ctx.setMappingField({
													fieldId: f.id,
													fieldName: f.name,
													entityId: field.mapping?.entity?.id,
													fromPath: [
														...field.fromPath,
														{ fieldId: field.id, fieldName: field.name, entityId: field.entityId, fromPath: [] }
													]
												});
											};
											
											return (
												<div
													key={f.id}
													className={css.field}
													title={`${f.name}(${f.desc ?? ''})`}
												>
													<input type="checkbox" checked={selected} onChange={onSelect} />
													<span onClick={onSelect}>{f.name}</span>
													<span>{f.desc}</span>
												</div>
											);
										})}
									</div>
								);
							})}
						</div>
					);
				})}
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
					}).stop}
				/>
			</div>
			{popParamValues}
		</div>
	);
};