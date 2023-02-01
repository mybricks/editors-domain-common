import React, { FC, useCallback } from 'react';
// @ts-ignore
import { evt, getPosition, useComputed, useObservable } from '@mybricks/rxui';
import { AnyType } from '../../_types';
import { getFieldConditionAry } from '../../_utils/field';
import { Remove } from '../../_constants/icons';
import { Condition, Entity, Field } from '../../_types/domain';
import { SQLWhereJoiner } from '../../_constants/field';

import styles from './index.less';

class WhereContext {
	nowValue: {
		desc: string;
		sql: string;
		entity: Entity;
		whereJoiner: SQLWhereJoiner;
		conditions: Condition[];
		limit: number;
	} | undefined;
	whereEle: HTMLElement | undefined;
	
	popEle: HTMLElement | undefined;
	
	popFields: { entity: Entity; } | undefined;
	
	popParams: { condition: AnyType; field: AnyType } | undefined;
	addCondition: ((field: Field) => void) | undefined;
	addBlur: ((fn: () => void) => void) | undefined ;
	removeCondition: ((fieldId: string) => void) | undefined;
	paramSchema: Record<string, unknown> = {};
}

let whereContext: WhereContext;

interface WhereProps {
	nowValue: AnyType;
	paramSchema: AnyType;
	addBlur(fn: () => void): void;
	addCondition(field: Field): void;
	removeCondition(fieldId: string): void;
}

const Where: FC<WhereProps> = props => {
	const { nowValue, addBlur, addCondition, removeCondition, paramSchema } = props;
	whereContext = useObservable(WhereContext, next => {
		next({
			nowValue,
			paramSchema,
			addCondition,
			addBlur,
			removeCondition,
		});
	});
	
	const addWhere = useCallback(() => {
		whereContext.popFields = { entity: whereContext.nowValue?.entity as unknown as Entity };
		whereContext.addBlur?.(() => {
			whereContext.popFields = void 0;
		});
	}, []);
	
	const curAddCondition = useCallback((field) => {
		whereContext.addCondition?.(field);
		whereContext.popFields = void 0;
	}, []);
	
	return (
		<div className={styles.where} ref={ele => ele && (whereContext.whereEle = ele)}>
			<div className={styles.segTitle}>
				2. 筛选符合以下
				<select
					className={styles.selectDom}
	        value={nowValue.whereJoiner}
	        onChange={e => nowValue.whereJoiner = e.target.value}
				>
					<option value={SQLWhereJoiner.AND}>所有条件</option>
					<option value={SQLWhereJoiner.OR}>任一条件</option>
				</select>
				的数据
				<span className={styles.addWhere} onClick={evt(addWhere).stop}>+</span>
				{
					whereContext.popFields ? (
						<div className={styles.popMenu}>
							{
								whereContext.popFields.entity.fieldAry.map((field) => {
									const used = nowValue.conditions.find((con: Condition) => con.fieldId === field.id);
									
									return (
										<div
											key={field.id}
								      className={`${styles.item} ${used ? styles.used : ''}`}
								      onClick={!used ? () => curAddCondition(field) : undefined}
										>
											{field.name}
										</div>
									);
								})
							}
						</div>
					) : null
				}
			</div>
			<Conditions />
		</div>
	);
};


const Conditions: FC = () => {
	const nowValue = whereContext.nowValue;
	
	const remove = useCallback(fieldId => {
		whereContext.removeCondition?.(fieldId);
	}, []);
	
	const allCons = useComputed(() => {
		return nowValue?.conditions.map(condition => {
			const oriField = nowValue?.entity.fieldAry.find(field => field.id === condition.fieldId);
			
			if (oriField) {
				//存在表切换的情况
				const operators = getFieldConditionAry(oriField.dbType);
				
				if (!condition.operator) {
					condition.operator = operators[0].value;
				}
				
				return (
					<div
						key={condition.fieldId}
						className={styles.condition}
						data-joiner={nowValue.whereJoiner === SQLWhereJoiner.AND ? '并且' : '或'}
					>
						<span className={styles.name}>
							{condition.fieldName}
						</span>
						
						<select
							value={condition.operator}
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
							type={'text'}
						  value={condition.value}
						  onChange={e => condition.value = e.target.value}
				       onClick={evt((e: Event) => {
					       whereContext.popEle = e.target as AnyType;
					       whereContext.popParams = {
						       condition,
						       field: oriField
					       };
					       whereContext.addBlur?.(() => {
						       whereContext.popParams = void 0;
					       });
				       }).stop}/>
						<span
							className={styles.icons}
							onClick={() => remove(condition.fieldId)}>
							{Remove}
						</span>
					</div>
				);
			}
		}).filter(f => f) || [];
	});
	
	const addExpression = useCallback(param => {
		// @ts-ignore
		whereContext.popParams.condition.value = `{params.${param}}`;
	}, []);
	
	const popParamValues = useComputed(() => {
		if (whereContext.popParams) {
			const params = whereContext.paramSchema.properties;
			const po = getPosition(whereContext.popEle, whereContext.whereEle);
			
			// @ts-ignore
			const style = { left: po.x, top: po.y + whereContext.popEle.offsetHeight };
			
			return (
				<div className={styles.popMenu} style={style}>
					{
						Object.keys(params as object).map(param => {
							return (
								<div key={param} className={`${styles.item}`} onClick={() => addExpression(param)}>
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
		<div className={styles.conditions}>
			{allCons.length > 0 ? allCons : <div className={styles.empty}>（没有限制条件）</div>}
			{popParamValues}
		</div>
	);
};

export default Where;