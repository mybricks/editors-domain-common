import React, { FC, ReactNode, useCallback } from 'react';
// @ts-ignore
import { evt, getPosition, useComputed, useObservable } from '@mybricks/rxui';
import { AnyType } from '../../_types';
import { getFieldConditionAry } from '../../_utils/field';
import { Remove } from '../../_constants/icons';
import { Condition, Entity, Field } from '../../_types/domain';
import { FieldBizType, FieldDBType, SQLWhereJoiner } from '../../_constants/field';
import { getValidFiledForSelect } from '../../_utils/entity';

import styles from './index.less';

class WhereContext {
	nowValue!: {
		desc: string;
		sql: string;
		entities: Entity[];
		conditions: Condition;
		limit: number;
	};
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
	title?: ReactNode;
	titleClassName?: string;
	domainModal: AnyType;
	addBlur(fn: () => void): void;
}

const Where: FC<WhereProps> = props => {
	const { nowValue, addBlur, paramSchema, domainModal, title = '2. 筛选符合以下条件的数据', titleClassName = '' } = props;
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
			<div className={`${styles.segTitle} ${titleClassName}`}>
				{title}
			</div>
			<Conditions />
		</div>
	);
};


const Conditions: FC = () => {
	const nowValue = whereContext.nowValue;
	const currentContext = useObservable(class { showFieldGroupId?: string; });
	const remove = useCallback(params => {
		whereContext.removeCondition?.(params);
	}, []);
	
	const showAdder = useCallback((showFieldGroupId: string) => {
		currentContext.showFieldGroupId = showFieldGroupId;
		
		whereContext.addBlur?.(() => {
			currentContext.showFieldGroupId = void 0;
		});
	}, []);
	
	const renderConditions = useComputed(() => {
		const currentEntity = whereContext.nowValue.entities.find(e => e.selected);
		
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
				const curOperator = operators.find(op => op.value === condition.operator);
				
				/** 字段选择时下拉列表 */
				const fieldSelectOptions: ReactNode[] = [];
				if (currentEntity) {
					fieldSelectOptions.push(
						...getValidFiledForSelect(currentEntity.fieldAry)
							.filter((field: Field) => field.bizType !== FieldBizType.MAPPING)
							.map((field) => {
								return (
									<option key={`${currentEntity.id}&&${field.id}`} value={`${currentEntity.id}&&${field.id}`}>
										{field.name}
									</option>
								);
							}) || []
					);
					/** 映射字段 */
					currentEntity.fieldAry
						.filter(field => field.selected && field.mapping?.entity)
						.forEach(mappingField => {
							const entity = mappingField.mapping?.entity as AnyType;
							const originEntity = whereContext.nowValue.entities.find((originEntity: Entity) => originEntity.id === entity?.id);
							
							if (originEntity && entity?.fieldAry.length) {
								fieldSelectOptions.push(
									...entity?.fieldAry.filter(field => !field.isPrimaryKey).map(field => {
										return (
											<option key={`${entity?.id}&&${field.id}`} value={`${entity?.id}&&${field.id}`}>
												{mappingField.name}.{field.name}
											</option>
										);
									}) || []
								);
							}
						});
				}
				
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
									style={{ paddingBottom: '2px' }}
									onClick={evt(() => showAdder(condition.fieldId)).stop}
								>
									+
								</span>
								{
									currentContext.showFieldGroupId === condition.fieldId ? (
										<div className={styles.popMenu} style={{ left: '140px', top: '28px', width: '180px' }}>
											<div className={styles.item} onClick={() => whereContext.addCondition?.({ isGroup: false, parentCondition: condition })}>
												条件
											</div>
											<div className={styles.item} onClick={() => whereContext.addCondition?.({ isGroup: true, parentCondition: condition })}>
												条件组
											</div>
										</div>
									) : null
								}
							</div>
							{
								condition.conditions.length > 0
									? renderConditions(condition.conditions, condition)
									: <div className={styles.empty}>（没有限制条件）</div>
							}
						</div>
						{parentCondition ? (
							<span className={`${styles.addWhere} ${styles.icons}`} onClick={() => remove({ index, parentCondition })}>
								{Remove}
							</span>
						) : null}
					</div>
				) : (
					<div key={index} className={styles.condition}>
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
							onChange={e => {
								condition.operator = e.target.value;
								const curOperator = operators.find(op => op.value === e.target.value);

								if (curOperator?.notNeedValue) {
									condition.value = '';
								}
							}}
						>
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
						{curOperator?.notNeedValue ? <span style={{ width: '130px', height: '24px' }} /> : (
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
								}).stop}
							/>
						)}
						<span
							className={`${styles.addWhere} ${styles.icons}`}
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
			const po = getPosition(whereContext.popEle, whereContext.whereEle);
			
			let params: string[] = [];
			const getParams = (schema, preKey = '', paths: string[] = []) => {
				if ((schema.type === 'object' || schema.type === 'follow') && schema.properties) {
					Object.entries(schema.properties || {}).forEach(([key, value]: AnyType) => {
						getParams(value, key, [...paths, preKey]);
					});
				} else {
					params.push([...paths, preKey].join('.'));
				}
			};
			getParams(whereContext.paramSchema, '', []);
			
			// @ts-ignore
			const style = { left: po.x, top: po.y + whereContext.popEle.offsetHeight };
			
			return (
				<div className={styles.popMenu} style={style}>
					{
						params.map(path => {
							return (
								<div key={path} className={`${styles.item}`} onClick={() => addExpression(`{params${path}}`)}>
									params{path}
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
		<div className={styles.conditions}>
			{renderConditions(whereContext.nowValue?.conditions ? [whereContext.nowValue?.conditions] : [], null)}
			{popParamValues}
		</div>
	);
};

export default Where;
