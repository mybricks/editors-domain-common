import React, { FC } from 'react';
import PopView from '../_common/pop-view';
// @ts-ignore
import { evt, useObservable } from '@mybricks/rxui';
import ViewCtx from './context';
import { AnyType } from '../_types';
import Where from '../_common/where';
import { SQLWhereJoiner } from '../_constants/field';

import styles from './index.less';

interface ViewEditorProps {
	domainModel: AnyType;
	value: AnyType;
	close: () => void;
}

const ViewEditor: FC<ViewEditorProps> = ({ domainModel, value, close }) => {
	const ctx = useObservable(ViewCtx, next => {
		const oriVal = value.get();
		let val;
		if (oriVal) {
			val = JSON.parse(JSON.stringify(oriVal));
		} else {
			val = {
				conditions: {
					entityId: Date.now(),
					fieldId: Date.now(),
					fieldName: '条件组',
					whereJoiner: SQLWhereJoiner.AND,
					conditions: []
				},
				entities: [],
			};
		}
		next({
			domainModel,
			nowValue: val,
			value,
			close,
		});
	}, { to: 'children' });
	return (
		<PopView close={close} save={ctx.save} clickView={evt(ctx.blurAll).stop}>
			<Where
				titleClassName={styles.whereTitle}
				addBlur={ctx.addBlur}
				nowValue={ctx.nowValue}
				domainModal={ctx.domainModel}
				title= '1. 筛选符合以下条件的数据'
				paramSchema={{ type: 'object', properties: {} }}
			/>
		</PopView>
	);
};

export default ViewEditor;
