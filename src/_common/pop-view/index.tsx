import React, {FC, ReactNode, useCallback} from 'react';

import styles from './index.less';

interface PopViewProps {
	close(): void;
	save(): void;
	children: ReactNode;
}

const PopView: FC<PopViewProps> = props => {
	const { close, save, children } = props;
	const stopBubble = useCallback((event) => {
		event.stopPropagation();
	}, []);
	
	return (
		<div className={styles.bg} onClick={close}>
			<div className={styles.view} onClick={stopBubble}>
				<div className={styles.toolbar}>
					<div className={styles.closeIcon} onClick={close}>
						<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
							<path
								d="M426.1888 522.717867L40.004267 136.533333 136.533333 40.004267l386.184534 386.184533L908.9024 40.004267 1005.431467 136.533333 619.178667 522.717867l386.184533 386.184533-96.529067 96.529067L522.717867 619.178667 136.533333 1005.431467 40.004267 908.9024l386.184533-386.184533z"
							></path>
						</svg>
					</div>
					<button onClick={save}>确定</button>
				</div>
				
				<div className={styles.main}>{children}</div>
			</div>
		</div>
	);
};

export default PopView;