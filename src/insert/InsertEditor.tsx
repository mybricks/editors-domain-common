import React, { useMemo } from 'react';
// @ts-ignore
import { evt, useObservable } from '@mybricks/rxui';
import InsertCtx from './InsertCtx';
import FromTo from '../_common/from-to';
import { AnyType } from '../_types';
import { getFieldSchema } from '../_utils/field';
import PopView from '../_common/pop-view';
import { Entity } from '../_types/domain';
import { formatEntitiesByOriginEntities } from '../_utils/entity';

import styles from './InsertEditor.less';

let ctx: InsertCtx;

const InsertEditor = ({ domainModel, paramSchema, value, close }: AnyType) => {
	ctx = useObservable(InsertCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));
			
			/** 实体信息可能存在变更，每次使用最新的实体信息 */
			val.entities = formatEntitiesByOriginEntities(val.entities ?? [], domainModel.entityAry);
		} else {
			val = {
				conAry: [],
				entities: [domainModel.entityAry[0]?.toJSON()] ?? [],
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

	const fieldSchema = useMemo(() => {
		const nowEntity = nowValue.entities[0];
		if (nowEntity) {
			const oriEntity = entityAry.find((et: { id: string }) => et.id === nowEntity.id);
			const properties: Record<string, unknown> = {};
			const rtn = {
				type: 'object',
				properties
			};

			oriEntity.fieldAry.forEach((field: { isPrimaryKey: boolean; name: string; dbType: string }) => {
				if (!field.isPrimaryKey) {
					properties[field.name] = getFieldSchema(field.dbType);
				}
			});
			return rtn;
		}
	}, []);

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
						entityAry.map((et: Entity) => {
							return <option key={et.id} value={et.id}>{et.name}</option>;
						})
					}
				</select>
				中通过以下规则添加数据
			</div>
			<FromTo
				conAry={nowValue.conAry}
			  from={{ title: '参数', schema: paramSchema }}
				to={{ title: nowValue.entities[0]?.name, schema: fieldSchema }}
				addBlurFn={ctx.addBlur}
			/>
		</PopView>
	);
};

export default InsertEditor;




