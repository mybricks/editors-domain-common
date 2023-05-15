import { Modal, Tabs } from 'antd';
import React, { FC } from 'react';
import { AnyType } from '../_types';

import styles from './CalcFieldModal.less';

interface CalcFieldModalProps {
	visible: boolean;
	onCancel(): void;
	onOK(field: AnyType): void;
}

const CalcFieldModal: FC<CalcFieldModalProps> = props => {
	const { visible, onCancel, onOK } = props;
	
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
							内容 2
						</Tabs.TabPane>
					</Tabs>
				</div>
			</div>
		</Modal>
	);
};

export default CalcFieldModal;
