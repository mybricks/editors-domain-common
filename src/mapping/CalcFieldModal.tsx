import { Modal, Tabs } from 'antd';
import React, { FC } from 'react';
import { observe, useComputed } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import { Entity, Field } from '../_types/domain';
import FieldCollapse from './FieldCollapse';
import { AnyType } from '../_types';

import styles from './CalcFieldModal.less';
import css from './FieldCollapse.less';

interface CalcFieldModalProps {
	visible: boolean;
	onCancel(): void;
	onOK(field: AnyType): void;
}

let ctx: QueryCtx;
const CalcFieldModal: FC<CalcFieldModalProps> = props => {
	const { visible, onCancel, onOK } = props;
	ctx = observe(QueryCtx, { from: 'parents' });
	const currentEntity = useComputed(() => ctx.fieldModel.parent);
	
	return (
		<Modal
			title="计算字段编辑器"
			width={1000}
			centered
			visible={visible}
			onOk={onOK}
			onCancel={onCancel}
			cancelText="取消"
			okText="确定"
			className={styles.calcModal}
		>
			<div className={styles.modalContainer}>
				<div className={styles.leftMenu}>
					<Tabs type="card">
						<Tabs.TabPane tab="函数方法" key="function">
							内容 1
						</Tabs.TabPane>
						<Tabs.TabPane tab="字段参数" key="fields">
							<div className={css.mappingFieldHeader}>
								所属实体：{currentEntity?.name}
							</div>
							{currentEntity ? currentEntity.fieldAry.filter(f => !f.isPrivate).map(field => {
								return (
									<FieldCollapse
										key={field.id}
										initialOpen
										entity={currentEntity as Entity}
										ctx={ctx}
										fromPath={[]}
										field={field as Field}
									/>
								);
							}) : []}
						</Tabs.TabPane>
					</Tabs>
				</div>
			</div>
		</Modal>
	);
};

export default CalcFieldModal;
