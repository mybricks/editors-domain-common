import React, { useCallback } from 'react';
import { observe } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';
import { CountCondition } from './constant';

import css from './Where.less';

let ctx: QueryCtx;

export default function Where() {
	ctx = observe(QueryCtx, { from: 'parents' });
	const nowValue = ctx.nowValue;

	if (!nowValue.entity.id || !ctx.isEntityForeigner(nowValue.entity.id)) {
		return null;
	}
	const oriEntity = ctx.entityAry.find(et => et.id === nowValue.entity.id);
	
	const onChangeCondition = (event) => {
		nowValue.condition = event.target.value;
		
		if (event.target.value === CountCondition) {
			const oriEntity = ctx.domainModel.entityAry.find(e => e.id === nowValue.entity.id);
			const primaryField = oriEntity.fieldAry.find(f => f.name === 'id');

			if (primaryField) {
				const field = primaryField.toJSON();
				field.name = '总数';
				field.desc = '查询数据总数';
				
				nowValue.entity.fieldAry = [field];
			} else {
				nowValue.entity.fieldAry = [];
			}
		}
	};

	return (
		<div className={css.where}>
			<div className={css.segTitle}>
        2. 筛选符合
				<select
					className={css.selectDom}
					value={nowValue.condition}
					onChange={onChangeCondition}
				>
					<option value={'-1'}>[全部]</option>
					{/* TODO: 选择总数则只能选中 id 字段 */}
					<option value={CountCondition}>[总数]</option>
					<optgroup label="----------"></optgroup>
					<option value={'max(id)'}>最后一条</option>
					{
						oriEntity.fieldAry.filter(field => {
							if (!field.isPrimaryKey && field.isDBTypeOfBigInt()) {
								return true;
							}
						}).map(field => {
							return (
								<option key={field.id} value={`max(${field.name})`}>
									{field.name}(最大值)
								</option>
							);
						})
					}
				</select>
        的数据
			</div>
		</div>
	);
}
