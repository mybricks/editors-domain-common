import React, { FC, ReactNode } from 'react';
// @ts-ignore
import { evt, useComputed, useObservable } from '@mybricks/rxui';
import { AnyType } from '../../_types';
import { FieldBizType, SQLOrder } from '../../_constants/field';
import { Field, SelectedField } from '../../_types/domain';
import { Remove } from '../../_constants/icons';
import { getEntityFieldMap } from '../../_utils/entity';

import styles from './index.less';

type OrderType = { fieldId: string; fieldName: string; order: SQLOrder; entityId: string; fromPath: SelectedField[] };
class OrderByContext {
	nowValue: AnyType;
	domainModal: AnyType;
	
	addOrder() {
		this.nowValue.orders.push({
			fieldId: '',
			fieldName: '',
			entityId: '',
			order: SQLOrder.DESC
		});
	}
	removeOrder(index: number) {
		this.nowValue.orders.splice(index, 1);
	}
}

interface OrderByProps {
	nowValue: AnyType;
	domainModal: AnyType;
}

let orderContext: OrderByContext;

const OrderBy: FC<OrderByProps> = props => {
	const { nowValue, domainModal } = props;
	orderContext = useObservable(OrderByContext, next => {
		if (!nowValue.orders) {
			nowValue.orders = [];
		}
		next({ nowValue, domainModal });
	});
	
	return (
		<div className={styles.orderByContainer}>
			<div className={styles.segTitle}>
				3. 按以下规则排序
				<span className={styles.addOrder} onClick={evt(() => orderContext.addOrder()).stop}>+</span>
			</div>
			
			<div className={styles.orderList}>
				{orderContext.nowValue.orders.map((order: OrderType, index: number) => {
					return <OrderItem order={order} key={index} index={index} />;
				})}
			</div>
		</div>
	);
};

interface OrderItemProps {
	order: OrderType;
	index: number;
}

const OrderItem: FC<OrderItemProps> = props => {
	const { order, index } = props;
	
	const currentEntity = useComputed(() => {
		return orderContext.nowValue.entities.find(e => e.selected);
	});
	
	const orderFieldIds = useComputed(() => {
		return orderContext.nowValue.orders.map((o: OrderType) => [...(o.fromPath?.map(path => path.fieldId) || []), o.fieldId].join('.')) || [];
	});
	
	const entityFieldMap = useComputed(() => getEntityFieldMap(orderContext.nowValue.entities));
	
	const selectedMappingFields = useComputed(() => {
		const res: AnyType[] = [];
		let depIndex = 0;
		let selectedField = orderContext.nowValue.fields.filter(f => f.fromPath.length === depIndex);
		
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
			selectedField = orderContext.nowValue.fields.filter(f => f.fromPath.length === depIndex);
		}
		
		return res;
	});
	
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
					
						return <option key={value} disabled={orderFieldIds.includes(value)} value={value} data-value={dataValue}>{field.name}</option>;
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
	const selectValue = [...(order.fromPath?.map(path => path.fieldId) || []), order.fieldId].join('.');
	
	return (
		<div className={styles.orderItem}>
			<span className={styles.index}>{index + 1}.</span>
			按
			<select
				className={styles.fieldSelect}
				value={order.entityId ? selectValue : ''}
				/** 更新条件语句 */
				onChange={(e) => {
					if (e.target.value) {
						const option = Array.from(e.target).find((o: AnyType) => o.value === e.target.value);
						
						if (option) {
							const newCondition = JSON.parse(option.getAttribute('data-value') || '{}');
							
							order.fieldId = newCondition.fieldId;
							order.fieldName = newCondition.fieldName;
							order.entityId = newCondition.entityId;
							order.fromPath = newCondition.fromPath;
						}
					} else {
						order.fieldId = '';
						order.fieldName = '';
						order.entityId = '';
						order.fromPath = [];
					}
				}}>
				<option key="" value="">请选择字段</option>
				{fieldSelectOptions}
			</select>
			字段
			<select
				value={order.order}
				className={styles.orderSelect}
				onChange={e => order.order = e.target.value as SQLOrder}
			>
				<option value={SQLOrder.ASC}>升序</option>
				<option value={SQLOrder.DESC}>降序</option>
			</select>
			排序
			<span
				className={`${styles.addOrder} ${styles.icons}`}
				onClick={() => orderContext.removeOrder(index)}
			>
				{Remove}
			</span>
		</div>
	);
};

export default OrderBy;