import React from 'react';
// @ts-ignore
import { evt, useComputed, useObservable } from '@mybricks/rxui';
import InsertCtx from './InsertCtx';
import FromTo from '../_common/from-to';
import PopView from '../_common/pop-view';
import { getFieldSchema } from '../_utils/field';
import { AnyType } from '../_types';
import Where from '../_common/where';
import { FieldBizType, SQLWhereJoiner } from '../_constants/field';
import { formatConAryByEntity, formatEntitiesByOriginEntities } from '../_utils/entity';

import css from './InsertEditor.less';

let ctx: InsertCtx;

export default function InsertEditor({ domainModel, paramSchema, value, close }: AnyType) {
	ctx = useObservable(InsertCtx, next => {
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
			val.conAry = formatConAryByEntity(val.conAry, currentEntity, paramSchema);
		} else {
			const entity = domainModel.entityAry.filter(e => !e.isSystem)[0];
			
			val = {
				conAry: [],
				entities: entity ? [{ ...entity.toJSON(), selected: true }] : [],
				conditions: {
					fieldId: Date.now(),
					fieldName: '条件组',
					whereJoiner: SQLWhereJoiner.AND,
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
				if (!field.isPrimaryKey && field.bizType !== FieldBizType.MAPPING && !field.isPrivate) {
					properties[field.name] = getFieldSchema(field.dbType);
				}
			});
			return rtn;
		}
	});

	return (
		<PopView close={close} save={ctx.save} clickView={evt(ctx.blurAll).stop}>
			<div className={css.segTitle}>
				1. 向
				<select
					className={css.selectDom}
					value={nowValue.entities[0]?.id}
					onChange={e => ctx.setEntity(e.target.value)}
				>
					{
						ctx.domainModel.entityAry.filter(e => !e.isSystem).map((et) => {
							return (
								<option key={et.id} value={et.id}>
									{et.name}
								</option>
							);
						})
					}
				</select>
				中通过以下规则编辑数据
			</div>
			<FromTo
				conAry={nowValue.conAry}
				from={{ title: '参数', schema: paramSchema }}
				to={{ title: nowValue.entities[0]?.name, schema: fieldSchema }}
				addBlurFn={ctx.addBlur}
			/>
			
			<Where
				title="2. 更新符合以下条件的数据"
				nowValue={ctx.nowValue}
				paramSchema={ctx.paramSchema}
				addBlur={ctx.addBlur}
				domainModal={ctx.domainModel}
			/>
		</PopView>
	);
}




