import React, { FC } from 'react';
import { AnyType } from '../_types';
import CodeEditor from './code';

const SQLCode: FC = ({ editConfig: { value, options, popView } }: AnyType, { domainModel, canvasEle }: AnyType) => {
	const { paramSchema } = options;
	return (
		<CodeEditor value={value} popView={popView} domainModel={domainModel} canvasEle={canvasEle} paramSchema={paramSchema}/>
	);
};

export default SQLCode;
