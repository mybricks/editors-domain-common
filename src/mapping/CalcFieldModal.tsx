import { Input, message, Modal, Tabs } from 'antd';
import React, { FC, useCallback, useRef, useState } from 'react';
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

import styles from './CalcFieldModal.less';
import css from './FieldCollapse.less';

interface CalcFieldModalProps {
	visible: boolean;
	onCancel(): void;
	onOK(field: AnyType): void;
	field: AnyType;
}
export type SuggestionType = {
	label: string;
	insertText: string;
	detail?: string;
	docs?: string;
	properties?: Array<SuggestionType>;
};

const getEntityCompletions = (params: {
	entity: Entity;
	entityAry: Entity[];
	entityIdChain: string[];
	isRoot?: boolean;
}) => {
	const { entity, entityAry, isRoot, entityIdChain } = params;
	const _prop: SuggestionType[] = [];
	const curEntity = entityAry.find(e => e.id === entity.id);

	if (curEntity) {
		const notMapping = entityIdChain[entityIdChain.length - 2] === curEntity.id;
		const fieldAry = curEntity.fieldAry.filter(field => entity.fieldAry.some(f => f.id === field.id && !f.isPrivate));
		fieldAry.forEach(field => {
			if (notMapping && field.bizType === FieldBizType.MAPPING) {
				return;
			}
			const suggestion: SuggestionType = {
				label: field.name,
				insertText: field.name,
				docs: field.name,
				detail: field.name
			};

			if (field?.mapping?.entity?.fieldAry?.length && !notMapping) {
				suggestion.properties = getEntityCompletions({
					entity: field.mapping.entity,
					entityAry,
					entityIdChain: [...entityIdChain, curEntity.id],
				});
			}
			_prop.push(suggestion);
		});

		return isRoot ? [{ label: '$', insertText: '$', docs: '实体字段', detail: '实体字段', properties: _prop }] : _prop;
	}

	return _prop;
};

let ctx: QueryCtx;
const CalcFieldModal: FC<CalcFieldModalProps> = props => {
	const { visible, onCancel, onOK, field } = props;
	const [fieldName, setFieldName] = useState(field?.name ?? '');
	const calcRuleRef = useRef(field?.calcRule ?? '');
	const codeEditor = useRef<AnyType>(null);
	ctx = observe(QueryCtx, { from: 'parents' });
	const currentEntity = useComputed(() => ctx.fieldModel.parent);
	const onChangeCode = useCallback(code => {
		calcRuleRef.current = code;
	}, []);
	const onChangeFieldName = useCallback(event => {
		setFieldName(event.target.value);
	}, []);

	const clickField = useCallback((field) => {
		const name = [...field.fromPath, field].map(f => f.name).join('.');

		codeEditor.current?.insertDoc(` $.${name}`);
	}, []);
	const clickMethod = useCallback((method: MethodItem) => {
		codeEditor.current?.insertDoc(' ' + method.method + method.suffix);
	}, []);

	const onModalOK = useCallback(() => {
		if (!fieldName) {
			message.warning('字段名称不能为空');
			return;
		} else if (!calcRuleRef.current) {
			message.warning('计算规则不能为空');
			return;
		}

		onOK({ id: field?.id || uuid(), name: fieldName, calcRule: calcRuleRef.current?.trim() });
	}, [field, fieldName]);

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
							{currentEntity ? currentEntity.fieldAry.filter(f => !f.isPrivate).map(field => {
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
						className={styles.code}
						value={field?.calcRule ?? ''}
						completions={
							getEntityCompletions({
								entity: currentEntity,
								entityAry: ctx.domainModel.entityAry,
								entityIdChain: [],
								isRoot: true,
							}) as AnyType[]
						}
						theme={{
							focused: {
								outline: '1px solid #fa6400',
							}
						}}
						onChange={onChangeCode}
					/>
				</div>
			</div>
		</Modal>
	);
};

export default CalcFieldModal;
