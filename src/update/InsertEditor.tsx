import React, { useMemo } from 'react';
import { useObservable } from '@mybricks/rxui';
import InsertCtx from './InsertCtx';
import FromTo from '../_common/from-to';
import PopView from '../_common/pop-view';
import { Entity, Field } from '../_types/domain';
import { getFieldSchema } from '../_utils/field';
import { AnyType } from '../_types';

import css from './InsertEditor.less';

let ctx: InsertCtx;

export default function InsertEditor({ domainModel, paramSchema, value, close }: AnyType) {
	ctx = useObservable(InsertCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));
		} else {
			val = {
				conAry: []
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
	const entityAry = ctx.domainModel.entityAry;

	if (!nowValue.entity && entityAry.length > 0) {
		ctx.setEntity(entityAry[0].id);
	}

	const fieldSchema = useMemo(() => {
		const nowEntity = nowValue.entity;
		if (nowEntity) {
			const oriEntity = entityAry.find((et: Entity) => et.id === nowEntity.id);
			const properties: Record<string, unknown> = {};
			const rtn = {
				type: 'object',
				properties
			};

			oriEntity.fieldAry.forEach((field: Field) => {
				if (!field.isPrimaryKey) {
					properties[field.name] = getFieldSchema(field.dbType);
				}
			});
			return rtn;
		}
	}, []);

	return (
		<PopView close={close} save={ctx.save}>
			<div className={css.segTitle}>
				向
				<select className={css.selectDom}
				        value={nowValue.entity?.id}
				        onChange={e => {
					        ctx.setEntity(e.target.value);
				        }}>
					{
						entityAry.map((et: Entity) => {
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
				to={{ title: nowValue.entity.name, schema: fieldSchema }}
				addBlurFn={ctx.addBlur}
			/>
		</PopView>
	);
}



