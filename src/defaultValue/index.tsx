import React, { FC, ReactNode, useCallback, useRef, useState } from 'react';
import { Input, Select } from 'antd';
import { AnyType } from '../_types';
import { DefaultValueWhenCreate, FieldBizType, FieldDBType } from '../_constants/field';

import styles from './index.less';

const DefaultValue: FC = ({ editConfig: { value, options } }: AnyType) => {
	const [curValue, setCurValue] = useState(value.get() || null);
	const [error, setError] = useState('');
	const containerRef = useRef<HTMLElement>(document.body);
	const fieldModel = options.fieldModel;
	let formItem: ReactNode;
	
	if (fieldModel.bizType === FieldBizType.NUMBER) {
		const onBlur = (event) => {
			const targetValue = event.target.value.trim();
			
			if (/^([-+])?\d+(\.\d+)?$/.test(targetValue)) {
				value.set(targetValue);
			} else {
				setError('请输入正确的数字');
			}
		};
		formItem = (
			<Input
				size="small"
				onChange={e => setCurValue(e.target.value.trim())}
				value={curValue}
				onBlur={onBlur}
			/>
		);
	} else if (fieldModel.bizType === FieldBizType.DATETIME) {
		formItem = (
			<DefaultDate
				containerRef={containerRef.current}
				value={curValue}
				onError={setError}
				onChange={v => value.set(v)}
			/>
		);
	} else if (fieldModel.bizType === FieldBizType.ENUM) {
		formItem = (
			<Select
				size="small"
				style={{ width: '100%' }}
				value={curValue === null ? '__empty__' : curValue}
				getPopupContainer={() => containerRef.current}
				onChange={v => {
					setCurValue(v);
					value.set(v === '__empty__' ? null : v);
				}}
			>
				<Select.Option value="__empty__">无</Select.Option>
				{fieldModel.enumValues?.map((em, index) => <Select.Option key={index} value={em}>{em}</Select.Option>)}
			</Select>
		);
	} else if (fieldModel.dbType === FieldDBType.MEDIUMTEXT) {
		formItem = (
			<Input.TextArea
				rows={4}
				size="small"
				value={curValue}
				onChange={e => setCurValue(e.target.value)}
				onBlur={e => value.set(e.target.value)}
			/>
		);
	} else {
		formItem = (
			<Input
				size="small"
				value={curValue}
				onChange={e => setCurValue(e.target.value)}
				onBlur={e => value.set(e.target.value)}
			/>
		);
	}
	
	return (
		<div className={styles.defaultValue} ref={ref => ref && (containerRef.current = ref)}>
			{formItem}
			{error ? <div className={styles.error}>{error}</div> : null}
		</div>
	);
};

const DefaultDate: FC<{
	onChange(value: AnyType): void;
	onError(error: string): void;
	value: string;
	containerRef: HTMLElement
}> = props => {
	const { value, onChange, onError, containerRef } = props;
	const [type, setType] = useState(
		value !== undefined
			? (value === null ? '' : (value === DefaultValueWhenCreate.CURRENT_TIME ? value : 'custom'))
			: ''
	);
	const [curValue, setCurValue] = useState(
		value !== undefined && value !== null && value !== DefaultValueWhenCreate.CURRENT_TIME
			? window.moment(value).format('yyyy-MM-DD HH:mm:ss')
			: ''
	);
	const onBlur = useCallback(e => {
		const v = e.target.value?.trim();
		
		if (v) {
			if (/^[1-9]\d{3}-(0[1-9]|1[0-2])-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(v)) {
				onChange(window.moment(v).valueOf());
			} else {
				onError('请输入正确的日期时间');
			}
		}
		setCurValue(v);
	}, [onChange]);
	const onInputChange = useCallback(e => setCurValue(e.target.value), []);
	
	return (
		<>
			<div className={styles.date}>
				<Select
					style={{ width: '110px', flexShrink: 0 }}
					size="small"
					getPopupContainer={() => containerRef}
					value={type}
					onChange={v => {
						setType(v);
					
						if (v !== 'custom') {
							onChange(v || null);
						}
					}}
				>
					<Select.Option value="">无</Select.Option>
					<Select.Option value={DefaultValueWhenCreate.CURRENT_TIME}>填充当前时间</Select.Option>
					<Select.Option value="custom">自定义</Select.Option>
				</Select>
				{type === 'custom' ? (
					<Input
						size="small"
						style={{ height: '24px', marginLeft: '4px' }}
						placeholder="请按格式输入日期时间，如：2020-01-01"
						value={curValue}
						onChange={onInputChange}
						onBlur={onBlur}
					/>
				) : null}
			</div>
			{type === 'custom' ? (
				<div className={styles.dateTip}>请按 yyyy-MM-DD HH:mm:ss 格式输入日期时间，如：{window.moment().format('yyyy-MM-DD HH:mm:ss')}</div>
			) : null}
		</>
	);
};

export default DefaultValue;
