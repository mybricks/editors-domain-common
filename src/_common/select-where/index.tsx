import React, { FC, ReactNode, useCallback } from 'react';
// @ts-ignore
import { evt, getPosition, useComputed, useObservable } from '@mybricks/rxui';
import { AnyType } from '../../_types';
import { getFieldConditionAry } from '../../_utils/field';
import { Remove } from '../../_constants/icons';
import { Condition, Entity, Field, SelectedField } from '../../_types/domain';
import { FieldBizType, FieldDBType, SQLWhereJoiner } from '../../_constants/field';
import { getEntityFieldMap } from '../../_utils/entity';

import styles from './index.less';

class WhereContext {
	nowValue!: {
		fields: SelectedField[];
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
	
	const entityFieldMap = useComputed(() => getEntityFieldMap(nowValue.entities));
	
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
	
	const currentEntity = whereContext.nowValue.entities.find(e => e.selected);
	
	/** 字段选择时下拉列表 */
	const fieldSelectOptions: ReactNode[] = [];
	if (currentEntity) {
		fieldSelectOptions.push(
			<optgroup label={`来自实体：${currentEntity.name}`}>
				{currentEntity.fieldAry
					.filter((field: Field) => !field.isPrivate && field.bizType !== FieldBizType.MAPPING)
					.map((field) => {
						const value = field.id;
						const dataValue = JSON.stringify({ fieldId: field.id, fieldName: field.name, entityId: currentEntity.id, fromPath: [] });
					
						return <option key={value} value={value} data-value={dataValue}>{field.name}</option>;
					})}
			</optgroup>
		);
		
		selectedMappingFields.forEach(mapping => {
			mapping.forEach(mappingField => {
				if (mappingField.mapping.entity?.fieldAry.filter(field => !field.isPrimaryKey).length) {
					fieldSelectOptions.push(
						<optgroup label={`来自实体：${mappingField.mapping.entity?.name}`}>
							{mappingField.mapping.entity?.fieldAry.filter(field => !field.isPrimaryKey).map(field => {
								const pathName = [...mappingField.fromPath.map(path => entityFieldMap[path.entityId + path.fieldId]?.name || ''), mappingField.name].join('.');
								const dataValue = JSON.stringify({
									fieldId: field.id,
									fieldName: field.name,
									entityId: mappingField.mapping.entity?.id,
									fromPath: [
										...mappingField.fromPath,
										{  fieldId: mappingField.id, fieldName: mappingField.name, entityId: mappingField.entityId, fromPath: [] }
									]
								});
								const value = [...mappingField.fromPath.map(path => path.fieldId), mappingField.id, field.id].join('.');
								
								return <option key={value} value={value} data-value={dataValue}>{pathName}.{field.name}</option>;
							})}
						</optgroup>
					);
				}
			});
		});
	}
	const renderConditions = (conditions: Condition[], parentCondition: Condition | null) => {
		return conditions.map((condition, index) => {
			let originField: Field | null = null;
			
			/** 查找对应的数据库实体跟字段 */
			if (!condition.conditions) {
				originField = entityFieldMap[condition.entityId + condition.fieldId];
			}
			
			const operators = getFieldConditionAry(originField?.dbType || FieldDBType.VARCHAR);
			
			if (!condition.operator) {
				condition.operator = operators[0].value;
			}
			const selectValue = [...(condition.fromPath?.map(path => path.fieldId) || []), condition.fieldId].join('.');
			
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
						value={condition.entityId ? selectValue : ''}
						/** 更新条件语句 */
						onChange={(e) => {
							if (e.target.value) {
								const option = Array.from(e.target).find((o: AnyType) => o.value === e.target.value);
								
								if (option) {
									const newCondition = JSON.parse(option.getAttribute('data-value') || '{}');
									
									condition.fieldId = newCondition.fieldId;
									condition.fieldName = newCondition.fieldName;
									condition.entityId = newCondition.entityId;
									condition.fromPath = newCondition.fromPath;
								}
							} else {
								condition.fieldId = '';
								condition.fieldName = '';
								condition.entityId = '';
								condition.fromPath = [];
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
						className={`${styles.addWhere} ${styles.icons}`}
						onClick={() => remove({ index, parentCondition })}
					>
						{Remove}
					</span>
				</div>
			);
		}).filter(Boolean) || [];
	};
	
	const addExpression = useCallback(param => {
		// @ts-ignore
		whereContext.popParams.condition.value = param;
	}, []);
	
	const popParamValues = useComputed(() => {
		if (whereContext.popParams) {
			const params = whereContext.paramSchema?.properties;
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
						Object.keys((params || {}) as object).map(param => {
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
