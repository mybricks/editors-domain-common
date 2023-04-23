import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import InsertEditor from './InsertEditor';
import { AnyType } from "../_types";

// @ts-ignore
import css from './index.less';

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
			<div className={`${css.editor} ${options.errorMessage ? css.error : ''}`}
				onClick={openPop}>
				<span>规则:</span>
				<span className={css.tt}>{val?.desc ? `${val.desc}` : '[空] 点击编辑..'}</span>
			</div>
			{options.errorMessage ? <div className={css.errorMessage}>{options.errorMessage}，请打开编辑面板确认！</div> : null}
			{
				visible ? createPortal(
					<InsertEditor batch={options.batch} domainModel={domainModel} paramSchema={options.paramSchema} value={value} close={close} />,
	        canvasEle
				) : null
			}
		</>
	);
}