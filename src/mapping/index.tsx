import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import QueryEditor from './QueryEditor';
import { Clear } from './Icons';
import { AnyType } from '../_types';

import css from './index.less';

export default function MappingEditor({ editConfig: { value } }: AnyType, { domainModel, canvasEle, fieldModel }: AnyType) {
	console.log('fieldModel', fieldModel);
	const [visible, setVisible] = useState(false);
	const val = value.get();
	
	const openPop = useCallback(() => setVisible(true), []);
	const close = useCallback(() => setVisible(false), []);
	const clear = useCallback(event => {
		event.stopPropagation();
		value.set(void 0);
	}, []);

	return (
		<>
			<div className={css.editor} onClick={openPop}>
				<span>映射到:</span>
				<span className={css.tt}>{val?.desc ? `${val.desc}` : '点击编辑..'}</span>
				<span className={`${css.icons} ${!val ? css.disabled : ''}`} onClick={clear}>{Clear}</span>
			</div>
			{
				visible ? createPortal(
					<QueryEditor
						fieldModel={fieldModel}
						domainModel={domainModel}
						value={value}
						close={close}
					/>,
					canvasEle
				) : null
			}
		</>
	);
}
