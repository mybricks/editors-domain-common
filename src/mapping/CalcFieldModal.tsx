import { Input, Modal, Tabs } from 'antd';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { observe, useComputed } from '@mybricks/rxui';
import { CodeEditor } from '@astii/code-editor';
import QueryCtx from './QueryCtx';
import { Entity, Field } from '../_types/domain';
import FieldCollapse from './FieldCollapse';
import { AnyType } from '../_types';
import { uuid } from '../_utils';
import { FieldBizType } from '../_constants/field';
import { MethodList } from '../_constants/method';
import MethodCollapse, { MethodItem } from './MethodCollapse';
import { getDBTypeByFieldBizType } from '../_utils/field';
import {
	formatSQLByCalcRule,
	getEntityCompletions,
	getFieldsFromCalcRule,
	getFieldTypeFromCalcRule,
	getMethodCompletions
} from './util';
import { getValidFiledForSelect } from '../_utils/entity';

import styles from './CalcFieldModal.less';
import css from './FieldCollapse.less';

interface CalcFieldModalProps {
	visible: boolean;
	onCancel(): void;
	onOK(field: AnyType): void;
	field: AnyType;
}

let ctx: QueryCtx;
const CalcFieldModal: FC<CalcFieldModalProps> = props => {
	const { visible, onCancel, onOK, field } = props;
	const [fieldName, setFieldName] = useState(field?.name ?? '');
	const [error, setError] = useState('');
	const calcRuleRef = useRef(field?.calcRule ?? '');
	const codeEditor = useRef<AnyType>(null);
	const codeEditorKey = useRef(Date.now());
	ctx = observe(QueryCtx, { from: 'parents' });
	const currentEntity = useComputed(() => {
		return ctx.domainModel.entityAry.find(e => e.id === ctx.nowValue?.entity?.id);
	});

	const onChangeCode = useCallback(code => {
		calcRuleRef.current = code;
	}, []);
	const onChangeFieldName = useCallback(event => {
		setFieldName(event.target.value);
	}, []);

	const clickField = useCallback((field) => {
		const name = [...field.fromPath, field].map(f => f.name).join('.');

		codeEditor.current?.insertDoc(` $.${name}$`);
	}, []);
	const clickMethod = useCallback((method: MethodItem) => {
		codeEditor.current?.insertDoc(' ' + method.method + method.suffix);
	}, []);

	const onModalOK = useCallback(() => {
		const curCalcRule = calcRuleRef.current?.trim();
		if (!fieldName) {
			setError('字段名称不能为空');
			return;
		} else if (currentEntity?.fieldAry.find(f => f.name === fieldName)) {
			setError('字段名称不能重复');
			return;
		} else if (!curCalcRule) {
			setError('计算规则不能为空');
			return;
		}

		const filedType = getFieldTypeFromCalcRule(curCalcRule, currentEntity, ctx.domainModel.entityAry);
		if (!filedType) {
			setError('计算字段存在语法错误，请检查计算规则');
			return;
		}

		setError('');
		onOK({
			id: field?.id || uuid(),
			name: fieldName,
			calcRule: curCalcRule,
			bizType: FieldBizType.CALC,
			filedBizType: filedType || FieldBizType.STRING,
			dbType: getDBTypeByFieldBizType(filedType),
			sql: formatSQLByCalcRule(curCalcRule, ctx.fieldModel),
			fields: getFieldsFromCalcRule(curCalcRule, currentEntity, ctx.domainModel.entityAry, ctx.fieldModel)
		});
	}, [field, fieldName, currentEntity]);

	const onCodeBlur = useCallback(() => {
		const curCalcRule = calcRuleRef.current?.trim();
		if (!curCalcRule) {
			setError('计算规则不能为空');
			return;
		}

		const filedType = getFieldTypeFromCalcRule(curCalcRule, currentEntity, ctx.domainModel.entityAry);
		if (!filedType) {
			setError('计算字段存在语法错误，请检查计算规则');
			return;
		}

		setError('');
	}, [currentEntity]);

	useEffect(() => {
		if (visible) {
			setFieldName(field?.name ?? '');
			calcRuleRef.current = field?.calcRule ?? '';
			codeEditorKey.current = Date.now();
			setError('');
		}
	}, [visible]);

	return (
		<Modal
			title="计算字段编辑器"
			width={1000}
			centered
			visible={visible}
			onOk={onModalOK}
			onCancel={onCancel}
			wrapClassName="fangzhou-theme"
			cancelText="取消"
			okText="确定"
			className={styles.calcModal}
		>
			<div className={styles.modalContainer}>
				<div className={styles.leftMenu}>
					<Tabs type="card">
						<Tabs.TabPane tab="函数方法" key="function">
							{MethodList.map((method, key) => {
								return <MethodCollapse key={method.type} initialOpen={!key} method={method} clickMethod={clickMethod} />;
							})}
						</Tabs.TabPane>
						<Tabs.TabPane tab="字段参数" key="fields">
							<div className={css.mappingFieldHeader}>
								所属实体：{currentEntity?.name}
							</div>
							{currentEntity ? getValidFiledForSelect(currentEntity.fieldAry).map(field => {
								return (
									<FieldCollapse
										key={field.id}
										initialOpen
										entityIdChain={[currentEntity.id]}
										entity={currentEntity as Entity}
										ctx={ctx}
										fromPath={[]}
										clickField={clickField}
										field={field as Field}
									/>
								);
							}) : []}
						</Tabs.TabPane>
					</Tabs>
				</div>
				<div className={styles.rightCode}>
					<label>字段名称</label>
					<Input className={styles.fieldName} placeholder="请输入字段名称" value={fieldName} onChange={onChangeFieldName} />
					<label>计算规则</label>
					<CodeEditor
						ref={codeEditor}
						key={codeEditorKey.current}
						className={styles.code}
						value={field?.calcRule ?? ''}
						events={{ blur: onCodeBlur } as AnyType}
						completions={[
							...getEntityCompletions({
								entity: currentEntity,
								entityAry: ctx.domainModel.entityAry,
								entityIdChain: [],
								isRoot: true,
							}) as AnyType[],
							...getMethodCompletions()
						]}
						theme={{
							focused: {
								outline: '1px solid #fa6400',
							}
						}}
						onChange={onChangeCode}
					/>
					<div className={styles.error}>{error}</div>
				</div>
			</div>
		</Modal>
	);
};

export default CalcFieldModal;
