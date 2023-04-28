import React, { FC } from 'react';
// @ts-ignore
import { evt, useObservable } from '@mybricks/rxui';
import { AnyType } from '../_types';
import PopView from '../_common/pop-view';
import Where from '../_common/where';
import { FieldBizType, SQLWhereJoiner } from '../_constants/field';
import { formatEntitiesByOriginEntities } from '../_utils/entity';
import { Condition, Entity } from '../_types/domain';
import { spliceDeleteSQLByConditions } from '../_utils/sql';
import { getParamsByConditions } from '../_utils/params';
import { safeEncodeURIComponent } from '../_utils/util';

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
	filterConditionByEffectFieldIds(conditions: Condition[], allowUseFields: string[]) {
		conditions.forEach(con => {
			if (con.conditions) {
				this.filterConditionByEffectFieldIds(con.conditions, allowUseFields);
			} else {
				if (!allowUseFields.includes(con.fieldId)) {
					con.fieldId = '';
					con.fieldName = '';
					con.entityId = '';
				}
			}
		});
	}
	save() {
		const { entities, conditions } = this.nowValue;
		let desc = '';
		const currentEntity = entities.find(entity => entity.fieldAry.length && entity.selected);

		if (currentEntity && currentEntity.fieldAry.length > 0) {
			desc = `${currentEntity.name}`;
			/** 统计所有允许使用的 field id */
			const allowUseFields: string[] = [];
			currentEntity.fieldAry.forEach(field => {
				if (field.mapping?.entity && field.selected) {
					if (field.bizType !== FieldBizType.MAPPING) {
						allowUseFields.push(field.id);
					}
					field.mapping?.entity?.fieldAry?.filter(field => !field.isPrimaryKey).forEach(f => allowUseFields.push(f.id));
				} else {
					allowUseFields.push(field.id);
				}
			});
			this.filterConditionByEffectFieldIds([conditions], allowUseFields);

			let params = getParamsByConditions(conditions.conditions);
			let sql = spliceDeleteSQLByConditions({
				params,
				entities: entities,
				conditions: conditions,
			}, true);

			let script = `
			(params)=>{
				return \`${sql}\`;
			}
			`;
			
			this.nowValue.script = safeEncodeURIComponent(script);
		} else {
			this.nowValue.script = void 0;
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
			
			/** 实体信息可能存在变更，每次使用最新的实体信息 */
			const format = formatEntitiesByOriginEntities(
				val.entities,
				domainModel.entityAry.filter(e => e.id === val.entities[0]?.id).map((entity: AnyType) => entity.toJSON())
			);
			const currentEntity = format.find(e => e.selected) ?? format[0];
			val.entities = currentEntity ? [currentEntity] : [];
		} else {
			const entity = domainModel.entityAry.filter(e => !e.isSystem)[0];
			
			val = {
				conAry: [],
				entities: entity ? [{ ...entity.toJSON(), selected: true }] : [],
				conditions: {
					fieldId: Date.now(),
					whereJoiner: SQLWhereJoiner.AND,
					fieldName: '条件组',
					conditions: []
				},
			};
		}

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
				title={
					<>
						1. 删除
						<select
							className={styles.selectDom}
							value={deleteContext.nowValue.entities[0]?.id}
							onChange={e => {
								const originEntity = deleteContext.domainModel.entityAry.find((entity: Entity) => entity.id === e.target.value);

								if (originEntity) {
									deleteContext.nowValue.entities = [{ ...originEntity.toJSON(), selected: true }];
								}
							}}
						>
							{
								deleteContext.domainModel.entityAry.filter(e => !e.isSystem).map((et: Entity) => {
									return <option key={et.id} value={et.id}>{et.name}</option>;
								})
							}
						</select>
						中符合以下条件的数据
					</>
				}
				nowValue={deleteContext.nowValue}
				paramSchema={deleteContext.paramSchema}
				addBlur={deleteContext.addBlur}
				domainModal={deleteContext.domainModel}
			/>
		</PopView>
	);
};

export default DeleteEditor;
