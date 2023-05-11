import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import QueryEditor from './QueryEditor';
import { AnyType } from '../_types';

import css from './index.less';

const ServiceSelect = ({ editConfig: { value, options } }: AnyType, { domainModel, canvasEle }: AnyType) => {
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
	    <div className={`${css.editor} ${options.errorMessage ? css.error : ''}`} onClick={openPop}>
		    <span>已选择:</span>
		    <span className={css.tt}>{val?.desc ? `${val.desc}` : '[空] 点击选择..'}</span>
	    </div>
			{options.errorMessage ? <div className={css.errorMessage}>{options.errorMessage}，请打开选择面板确认！</div> : null}
	    {
		    visible ? createPortal(
			    <QueryEditor
				    domainModel={domainModel}
				    paramSchema={options.paramSchema}
				    showPager={options.showPager}
				    value={value}
				    close={close}
			    />,
			    canvasEle
		    ) : null
	    }
		</>
	);
};

export default ServiceSelect;
