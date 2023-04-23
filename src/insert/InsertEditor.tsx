import React from 'react';
// @ts-ignore
import { evt, useComputed, useObservable } from '@mybricks/rxui';
import InsertCtx from './InsertCtx';
import FromTo from '../_common/from-to';
import { AnyType } from '../_types';
import { getFieldSchema } from '../_utils/field';
import PopView from '../_common/pop-view';
import { formatConAryByEntity, formatEntitiesByOriginEntities } from '../_utils/entity';
import { DefaultValueWhenCreate, FieldBizType } from '../_constants/field';

import styles from './InsertEditor.less';

let ctx: InsertCtx;

const InsertEditor = ({ domainModel, paramSchema, value, close, batch }: AnyType) => {
	ctx = useObservable(InsertCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));
			
			/** 实体信息可能存在变更，每次使用最新的实体信息 */
			const format = formatEntitiesByOriginEntities(val.entities, domainModel.entityAry);
			const currentEntity = format.find(e => e.selected) ?? format[0];
			val.entities = currentEntity ? [currentEntity] : [];
			val.conAry = formatConAryByEntity(val.conAry, currentEntity);
		} else {
			const entity = domainModel.entityAry.filter(e => !e.isSystem)[0];
			
			val = {
				conAry: [],
				entities: entity ? [{ ...entity.toJSON(), selected: true }] : [],
			};
		}

		next({
			domainModel,
			paramSchema,
			batch,
			nowValue: val,
			value,
			close
		});
	}, { to: 'children' });

	const nowValue = ctx.nowValue;
	
	const fieldSchema = useComputed(() => {
		const nowEntity = nowValue.entities[0];
		if (nowEntity) {
			const properties: Record<string, unknown> = {};
			const rtn = {
				type: 'object',
				properties
			};
			
			nowEntity.fieldAry.forEach((field: AnyType) => {
				if (
					!field.isPrimaryKey
					&& field.bizType !== FieldBizType.MAPPING
					&& !field.isPrivate
					&& field.defaultValueWhenCreate !== DefaultValueWhenCreate.CURRENT_TIME
				) {
					properties[field.name] = getFieldSchema(field.dbType);
				}
			});
			return rtn;
		}
	});
	const curParmaSchema = useComputed(() => {
		return batch ? paramSchema.items || { type: 'object', properties: {} } : paramSchema;
	});

	return (
		<PopView close={close} save={ctx.save} clickView={evt(ctx.blurAll).stop}>
			<div className={styles.segTitle}>
				向
				<select
					className={styles.selectDom}
				  value={nowValue.entities[0]?.id}
	        onChange={e => ctx.setEntity(e.target.value)}
				>
					{
						ctx.domainModel.entityAry.filter(e => !e.isSystem).map((et) => {
							return <option key={et.id} value={et.id}>{et.name}</option>;
						})
					}
				</select>
				中通过以下规则添加数据
			</div>
			<FromTo
				conAry={nowValue.conAry}
			  from={{ title: '参数', schema: curParmaSchema }}
				to={{ title: nowValue.entities[0]?.name, schema: fieldSchema }}
				addBlurFn={ctx.addBlur}
			/>
		</PopView>
	);
};

export default InsertEditor;




