import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import InsertEditor from './InsertEditor';

// @ts-ignore
import css from './index.less';
import {AnyType} from "../_types";

export default function ({ editConfig: { value, options } }: AnyType, { domainModel, canvasEle }: AnyType) {
	const [visible, setVisible] = useState(false);
	const val = value.get();

	const openPop = useCallback(() => {
		setVisible(true);
	}, []);

	const close = useCallback(() => {
		setVisible(false);
	}, []);

	return (
		<>
			<div className={`${css.editor} ${css[options?.type]}`}
				onClick={openPop}>
				<span>规则:</span>
				<span className={css.tt}>{val?.desc ? `${val.desc}` : '[空] 点击编辑..'}</span>
			</div>
			{
				visible ? createPortal(
					<InsertEditor domainModel={domainModel} paramSchema={options.paramSchema} value={value} close={close}/>,
	        canvasEle
				) : null
			}
		</>
	);
}