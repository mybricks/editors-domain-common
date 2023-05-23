import React from 'react';
import { observe } from '@mybricks/rxui';
import QueryCtx from './QueryCtx';

import css from './Where.less';

let ctx: QueryCtx;

export default function Where() {
	ctx = observe(QueryCtx, { from: 'parents' });
	const nowValue = ctx.nowValue;

	if (!nowValue.entity.id || !ctx.isEntityForeigner(nowValue.entity.id)) {
		return null;
	}
	const oriEntity = ctx.entityAry.find(et => et.id === nowValue.entity.id);

	return (
		<div className={css.where}>
			<div className={css.segTitle}>
        2. 筛选符合
				<select className={css.selectDom}
					value={nowValue.condition}
					onChange={e => (nowValue.condition = e.target.value)}>
					<option value={'-1'}>[全部]</option>
					{/* TODO: 选择总数则只能选中 id 字段 */}
					<option value="count(id)">[总数]</option>
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
