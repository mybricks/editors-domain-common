import React, { FC, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnyType } from '../_types';
import DeleteEditor from './delete-editor';

import styles from '../delete/index.less';

const Delete: FC = ({ editConfig: { value, options } }: AnyType, { domainModel, canvasEle }: AnyType) => {
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
			<div className={styles.editor} onClick={openPop}>
				<span>规则:</span>
				<span className={styles.tt}>{val?.desc ? `${val.desc}` : '[空] 点击编辑..'}</span>
			
			</div>
			{
				popTrue ? createPortal(
					<DeleteEditor domainModel={domainModel} paramSchema={options.paramSchema} value={value} close={close} />,
					canvasEle
				) : null
			}
		</>
	);
	
};

export default Delete;