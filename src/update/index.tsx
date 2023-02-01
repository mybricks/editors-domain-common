import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import InsertEditor from './InsertEditor';
import { AnyType } from '../_types';

import css from './index.less';

export default function ({ editConfig: { value, options } }: AnyType, { domainModel, canvasEle }: AnyType) {
	const [popTrue, pop] = useState(false);

	const val = value.get();

	const openPop = useCallback(() => {
		pop(true);
	}, []);

	const close = useCallback(() => {
		pop(false);
	}, []);

	return (
		<>
			<div className={`${css.editor} ${css[options?.type]}`}
				onClick={openPop}>
				<span>规则:</span>
				<span className={css.tt}>{val?.desc ? `${val.desc}` : '[空] 点击编辑..'}</span>
				{/*{selectedCon ? <span className={css.type}>{selectedCon.icon}</span> : null}*/}

			</div>
			{
				popTrue ? createPortal(
					<InsertEditor domainModel={domainModel} paramSchema={options.paramSchema} value={value} close={close} />,
					canvasEle
				) : null
			}
		</>
	);
}