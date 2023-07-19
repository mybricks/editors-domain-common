import React, { FC, useCallback, useState } from 'react';
import { Popover, Space } from 'antd';
import { MethodList } from '../_constants/method';
import { FieldBizTypeMap } from '../_constants/field';

import css from './FieldCollapse.less';

type Method = typeof MethodList[number];
export type MethodItem = Method['methods'][number];
interface MethodCollapseProps {
	method: Method;
	initialOpen?: boolean;
	clickMethod(method: MethodItem): void;
}

const MethodCollapse: FC<MethodCollapseProps> = props => {
	const { method, clickMethod, initialOpen = false } = props;
	const [open, setOpen] = useState(initialOpen);

	const clickOpen = useCallback(event => {
		event.stopPropagation();
		setOpen(open => !open);
	}, []);

	return (
		<div className={css.selectFromCollapse}>
			<div className={css.field} onClick={clickOpen}>
				<div className={css.collapseIcon} style={open ? { transform: 'rotateZ(90deg)' } : undefined}>
					<svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="#aeafb2">
						<path d="M715.8 493.5L335 165.1c-14.2-12.2-35-1.2-35 18.5v656.8c0 19.7 20.8 30.7 35 18.5l380.8-328.4c10.9-9.4 10.9-27.6 0-37z"></path>
					</svg>
				</div>
				<span>{method.name}</span>
				<span></span>
			</div>
			{open ? (
				<div className={css.selectFromChildren} style={{ padding: 0 }}>
					{method.methods
						.map(m => (
							<Popover
								key={m.method + m.suffix}
								placement="left"
								content={(
									<Space direction="vertical" size="small" style={{ maxWidth: '300px' }}>
										<div>
											语法：
											<span style={{ color: '#777' }}>{m.syntax}</span>
										</div>
										<div>
											描述：
											<span style={{ color: '#777' }}>{m.description}</span>
										</div>
										<div>
											返回值：
											<span style={{ color: '#777' }}>{FieldBizTypeMap[m.returnType] || '未知类型'}</span>
										</div>
									</Space>
								)}
								title={m.name}
							>
								<div className={css.field} onClick={() => clickMethod(m)}>
									<span>{m.name}</span>
									<span>（{FieldBizTypeMap[m.returnType] || '未知类型'}）</span>
								</div>
							</Popover>
						))}
				</div>
			) : null}
		</div>
	);
};

export default MethodCollapse;