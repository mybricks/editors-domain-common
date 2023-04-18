import React, {FC, ReactNode, useState} from 'react';
import { AnyType } from '../_types';
import { FieldBizType } from '../_constants/field';

import styles from './index.less';

const DefaultValue: FC = ({ editConfig: { value, options } }: AnyType) => {
	const [curValue, setCurValue] = useState(value.get());
	const [error, setError] = useState('');
	const fieldModel = options.fieldModel;
	let formItem: ReactNode | null = null;
	
	if (fieldModel.bizType === FieldBizType.STRING) {
		formItem = <input value={curValue} onChange={e => setCurValue(e.target.value)} />;
	} else if (fieldModel.bizType === FieldBizType.NUMBER) {
		const onBlur = (event) => {
			const targetValue = event.target.value;
			
			if (/^([-+])?\d+(\.\d+)?$/.test(targetValue)) {
				value.set(targetValue);
			} else {
				setError('请输入正确的数字');
			}
		};
		formItem = <input value={curValue} onChange={e => setCurValue(e.target.value)} onBlur={onBlur} />;
	} else if (fieldModel.bizType === FieldBizType.DATETIME) {
		const onBlur = (event) => {
			const targetValue = event.target.value;
			
			if (/^([-+])?\d+(\.\d+)?$/.test(targetValue)) {
				setCurValue(targetValue);
			} else {
				setError('请输入正确的数字');
			}
		};
		formItem = <input value={curValue} onChange={e => setCurValue(e.target.value)} onBlur={onBlur} />;
	}
	
	return (
		<div className={styles.defaultValue}>
			{formItem}
			{error ? <div className={styles.error}>{error}</div> : null}
		</div>
	);
};

export default DefaultValue;