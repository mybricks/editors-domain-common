import React, { FC } from 'react';
// @ts-ignore
import { evt, useObservable } from '@mybricks/rxui';
import { AnyType } from '../_types';
import { Entity, Field } from '../_types/domain';
import PopView from '../_common/pop-view';
import Where from '../_common/where';
import { SQLWhereJoiner } from '../_constants/field';

import styles from './index.less';

class DeleteContext {
	domainModel!: AnyType;
	nowValue!: AnyType;
	paramSchema: Record<string, unknown> = {};
	value!: AnyType;
	/** 失焦执行的方法 */
	blurAry: Array<() => void> = [];
	
	addBlur(fn: () => void) {
		this.blurAry.push(fn);
	}
	
	blurAll() {
		if (this.blurAry.length > 0) {
			this.blurAry.forEach(fn => fn());
		}
	}
	close!: () => void;
	save() {
		const nowValue = this.nowValue;
		let desc = '';
		
		if (nowValue.entities?.length && nowValue.entities[0].fieldAry.length > 0) {
			desc = `${nowValue.entities[0].name}`;
		}
		
		this.nowValue.desc = desc;
		this.value.set(this.nowValue);
		
		this.close();
	}
}

interface DeleteEditorProps {
	domainModel: AnyType;
	paramSchema: Record<string, unknown>;
	value: AnyType;
	close(): void;
}

const DeleteEditor: FC<DeleteEditorProps> = props => {
	const { domainModel, value, paramSchema, close } = props;
	const deleteContext = useObservable(DeleteContext, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));
		} else {
			val = {
				conAry: [],
				entities: [domainModel.entityAry[0]?.toJSON()] ?? [],
				conditions: {
					fieldId: Date.now(),
					whereJoiner: SQLWhereJoiner.AND,
					fieldName: '条件组',
					conditions: []
				},
			};
		}
		
		/** 实体信息可能存在变更，每次使用最新的实体信息 */
		val.entities = val.entities.map((entity: Entity) => {
			let originEntity = domainModel.entityAry.find((e: Entity) => e.id === entity.id);
			
			if (originEntity) {
				originEntity = originEntity.toJSON();
				
				return {
					...originEntity,
					fieldAry: entity.fieldAry.map((field: Field) => {
						const originField = originEntity.fieldAry.find((f: Field) => f.id === field.id);
						
						return originField ? { ...originField } : undefined;
					}).filter(Boolean),
				};
			}
		}).filter(Boolean);
		
		next({
			domainModel,
			paramSchema,
			nowValue: val,
			value,
			close
		});
	});
	
	return (
		<PopView close={close} save={deleteContext.save} clickView={evt(deleteContext.blurAll).stop}>
			<Where
				titleClassName={styles.whereTitle}
				title="1. 删除符合以下条件的数据"
				nowValue={deleteContext.nowValue}
				paramSchema={deleteContext.paramSchema}
				addBlur={deleteContext.addBlur}
				domainModal={deleteContext.domainModel}
			/>
		</PopView>
	);
};

export default DeleteEditor;