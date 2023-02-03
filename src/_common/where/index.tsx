import React, { FC, ReactNode, useCallback } from 'react';
// @ts-ignore
import { evt, getPosition, useComputed, useObservable } from '@mybricks/rxui';
import { AnyType } from '../../_types';
import { getFieldConditionAry } from '../../_utils/field';
import { Remove } from '../../_constants/icons';
import { Condition, Entity, Field } from '../../_types/domain';
import { FieldDBType, SQLWhereJoiner } from '../../_constants/field';

import styles from './index.less';

class WhereContext {
	nowValue: {
		desc: string;
		sql: string;
		entities: Entity[];
		conditions: Condition;
		limit: number;
	} | undefined;
	whereEle: HTMLElement | undefined;
	
	popEle: HTMLElement | undefined;
	popParams: { condition: AnyType; field: AnyType } | undefined;
	paramSchema: Record<string, unknown> = {};
	domainModal: AnyType;
	
	addBlur: ((fn: () => void) => void) | undefined;
	
	addCondition(params: { isGroup: boolean; parentCondition: Condition }) {
		const { isGroup, parentCondition } = params;
		
		if (parentCondition) {
			parentCondition.conditions!.push(
				(isGroup ? {
					fieldId: String(Date.now()),
					fieldName: '条件组',
					conditions: [],
					whereJoiner: SQLWhereJoiner.AND,
				} : {
					entityId: '',
					fieldId: '',
					fieldName: '',
					operator: void 0,
					value: ''
				}) as unknown as Condition
			);
		} else {
			this.nowValue!.conditions.conditions!.push(
				(isGroup ? {
					fieldId: String(Date.now()),
					fieldName: '条件组',
					conditions: [],
					whereJoiner: SQLWhereJoiner.AND,
				} : {
					fieldId: '',
					fieldName: '',
					operator: void 0,
					value: ''
				}) as unknown as Condition
			);
		}
	}
	
	removeCondition(params: { index: number; parentCondition: Condition }) {
		const { index, parentCondition } = params;
		
		parentCondition.conditions = parentCondition.conditions?.filter((_, idx) => idx !== index);
	}
}

let whereContext: WhereContext;

interface WhereProps {
	nowValue: AnyType;
	paramSchema: AnyType;
	domainModal: AnyType;
	addBlur(fn: () => void): void;
}

const Where: FC<WhereProps> = props => {
	const { nowValue, addBlur, paramSchema, domainModal } = props;
	whereContext = useObservable(WhereContext, next => {
		next({
			nowValue,
			paramSchema,
			addBlur,
			domainModal,
		});
	});
	
	return (
		<div className={styles.where} ref={ele => ele && (whereContext.whereEle = ele)}>
			<div className={styles.segTitle}>
				2. 筛选符合以下条件的数据
			</div>
			<Conditions />
		</div>
	);
};


const Conditions: FC = () => {
	const nowValue = whereContext.nowValue;
	
	const remove = useCallback(params => {
		whereContext.removeCondition?.(params);
	}, []);
	
	const conditionFieldIds = useComputed(() => {
		return () => {
			const fieldIds: string[] = [];
			const getFieldId = (conditions: Condition[]) => {
				conditions.forEach((con: Condition) => {
					if (con.conditions) {
						getFieldId(con.conditions);
					} else {
						fieldIds.push(con.fieldId);
					}
				});
			};
			
			getFieldId(whereContext.nowValue?.conditions ? [whereContext.nowValue?.conditions] : []);
			
			return fieldIds;
		};
	});
	
	const renderConditions = useComputed(() => {
		return (conditions: Condition[], parentCondition: Condition | null) => {
			return conditions.map((condition, index) => {
				let originField: Field | null = null;
				
				/** 查找对应的数据库实体跟字段 */
				if (!condition.conditions) {
					for (let idx = 0; idx < (nowValue?.entities.length || 0); idx++) {
						const entity = nowValue?.entities[idx];
						if (originField) {
							break;
						}
						
						for (let j = 0; j < (entity?.fieldAry.length || 0); j++) {
							const field = entity?.fieldAry[j];
							
							if (field?.id === condition.fieldId) {
								originField = field as Field;
								break;
							}
						}
					}
				}
				
				const operators = getFieldConditionAry(originField?.dbType || FieldDBType.VARCHAR);
				
				if (!condition.operator) {
					condition.operator = operators[0].value;
				}
				
				/** 字段选择时下拉列表 */
				const fieldSelectOptions: ReactNode[] = [];
				whereContext.domainModal?.entityAry
					.filter((oriEntity: Entity) => nowValue?.entities.find(e => e.id === oriEntity.id))
					.forEach((entity: Entity) => {
						fieldSelectOptions.push(
							...entity?.fieldAry.map((field) => {
								return (
									<option
										key={`${entity.id}&&${field.id}`}
										value={`${entity.id}&&${field.id}`}
										disabled={conditionFieldIds().includes(field.id)}
									>
										{entity?.name}.{field.name}
									</option>
								);
							}) || []
						);
					});
				
				return condition.conditions ? (
					<div key={condition.fieldId} className={styles.conditionGroupContainer}>
						<div className={styles.conditionGroup} data-joiner={condition.whereJoiner === SQLWhereJoiner.AND ? '并且' : '或'}>
							<div className={`${styles.segTitle} ${styles.noTopBorder}`}>
								满足条件组中
								<select
									className={styles.selectDom}
									value={condition.whereJoiner}
									onChange={e => condition.whereJoiner = e.target.value as SQLWhereJoiner}
								>
									<option value={SQLWhereJoiner.AND}>所有条件</option>
									<option value={SQLWhereJoiner.OR}>任一条件</option>
								</select>
								
								<span
									className={styles.addWhere}
									onClick={evt(() => {
										whereContext.addCondition?.({ isGroup: false, parentCondition: condition });
									}).stop}
								>
									新增条件
								</span>
								<span
									className={styles.addWhere}
									onClick={evt(() => {
										whereContext.addCondition?.({ isGroup: true, parentCondition: condition });
									}).stop}
								>
									新增条件组
								</span>
							</div>
							{
								condition.conditions.length > 0
									? renderConditions(condition.conditions, condition)
									: <div className={styles.empty}>（没有限制条件）</div>
							}
						</div>
						{parentCondition ? (
							<span className={styles.icons} onClick={() => remove({ index, parentCondition })}>
								{Remove}
							</span>
						) : null}
					</div>
				) : (
					<div key={index} className={styles.condition}>
						{/*<input*/}
						{/*	className={styles.checkbox}*/}
						{/*	type="checkbox"*/}
						{/*	checked={condition.checkExist}*/}
						{/*	onClick={() => condition.checkExist = !condition.checkExist}*/}
						{/*/>*/}
						{/*<label>判空</label>*/}
						<select
							className={styles.fieldSelect}
							value={condition.entityId ? `${condition.entityId}&&${condition.fieldId}` : ''}
							/** 更新条件语句 */
							onChange={(e) => {
								const [entityId, fieldId] = e.target.value.split('&&');
								let originEntity = whereContext?.domainModal.entityAry.find((entity: Entity) => entity.id === entityId);
								
								if (originEntity) {
									const originField = originEntity.fieldAry.find((field: Field) => field.id === fieldId);
									
									if (originField) {
										condition.entityId = entityId;
										condition.fieldId = originField.id;
										condition.fieldName = `${originEntity.name}.${originField.name}`;
									}
								}
							}}>
							<option key="" value="">请选择字段</option>
							{fieldSelectOptions}
						</select>
						
						<select
							value={condition.operator}
							className={styles.operatorSelect}
							onChange={e => condition.operator = e.target.value}>
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
						<input
							className={styles.valueInput}
							type="text"
							value={condition.value}
							onChange={e => condition.value = e.target.value}
							onClick={evt((e: Event) => {
								whereContext.popEle = e.target as AnyType;
								whereContext.popParams = {
									condition,
									field: originField
								};
								whereContext.addBlur?.(() => {
									whereContext.popParams = void 0;
								});
							}).stop}/>
						<span
							className={styles.icons}
							onClick={() => remove({ index, parentCondition })}
						>
							{Remove}
						</span>
					</div>
				);
			}).filter(Boolean) || [];
		};
	});
	
	const addExpression = useCallback(param => {
		// @ts-ignore
		whereContext.popParams.condition.value = param;
	}, []);
	
	const popParamValues = useComputed(() => {
		if (whereContext.popParams) {
			const params = whereContext.paramSchema.properties;
			const po = getPosition(whereContext.popEle, whereContext.whereEle);
			const popNodes: ReactNode[] = [];
			
			/** 获取实体中字段提示项 */
			nowValue?.entities.forEach(entity => {
				popNodes.push(...entity.fieldAry.map(field => {
					return (
						<div
							key={field.name}
							className={styles.item}
							onClick={() => addExpression(`{${entity.name}.${field.name}}`)}
						>
							{entity.name}.{field.name}
						</div>
					);
				}));
			});
			
			// @ts-ignore
			const style = { left: po.x, top: po.y + whereContext.popEle.offsetHeight };
			
			return (
				<div className={styles.popMenu} style={style}>
					{
						Object.keys(params as object).map(param => {
							return (
								<div key={param} className={`${styles.item}`} onClick={() => addExpression(`{params.${param}}`)}>
									params.{param}
								</div>
							);
						})
					}
					{/*{popNodes}*/}
				</div>
			);
		}
		return null;
	});
	
	return (
		<div className={styles.conditions}>
			{renderConditions(whereContext.nowValue?.conditions ? [whereContext.nowValue?.conditions] : [], null)}
			{popParamValues}
		</div>
	);
};

export default Where;