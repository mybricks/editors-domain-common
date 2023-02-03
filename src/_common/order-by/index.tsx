import React, { FC, ReactNode } from 'react';
// @ts-ignore
import { evt, useComputed, useObservable } from '@mybricks/rxui';
import { AnyType } from '../../_types';
import { SQLOrder } from '../../_constants/field';
import { Entity, Field } from '../../_types/domain';

import styles from './index.less';

type OrderType = { fieldId: string; fieldName: string; order: SQLOrder; entityId: string };
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
				<span
					className={styles.addOrder}
					onClick={evt(() => orderContext.addOrder()).stop}
				>
					新增排序规则
				</span>
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
	
	const orderFieldIds = useComputed(() => {
		return orderContext.nowValue.orders.map((o: OrderType) => o.fieldId);
	});
	
	/** 字段选择时下拉列表 */
	const fieldSelectOptions = useComputed(() => {
		const options: ReactNode[] = [];
		orderContext.domainModal?.entityAry
			.filter((oriEntity: Entity) => orderContext.nowValue?.entities.find((e: Entity) => e.id === oriEntity.id))
			.forEach((entity: Entity) => {
				options.push(
					...entity?.fieldAry.map((field) => {
						return (
							<option key={field.id} value={`${entity.id}&&${field.id}`} disabled={orderFieldIds.includes(field.id)}>
								{entity?.name}.{field.name}
							</option>
						);
					}) || []
				);
			});
		
		return options;
	});
	
	
	return (
		<div className={styles.orderItem}>
			<span className={styles.index}>{index + 1}.</span>
			按
			<select
				className={styles.fieldSelect}
				value={order.entityId ? `${order.entityId}&&${order.fieldId}` : ''}
				/** 更新条件语句 */
				onChange={(e) => {
					const [entityId, fieldId] = e.target.value.split('&&');
					const originEntity = orderContext.nowValue?.entities.find((entity: Entity) => entity.id === entityId);
					
					if (originEntity) {
						const originField = originEntity.fieldAry.find((field: Field) => field.id === fieldId);
						
						if (originField) {
							order.entityId = originEntity.id;
							order.fieldId = originField.id;
							order.fieldName = `${originEntity.name}.${originField.name}`;
						}
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
		</div>
	);
};

export default OrderBy;