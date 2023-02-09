import React, { useCallback, useEffect, useState } from 'react';
import { AnyType } from '../_types';

const { Input, message } = (window as AnyType).antd || {};

import css from './index.less';

const getContentFromResponse = (reponseText: string) => {
	if (!reponseText || typeof reponseText !== 'string') {
		return '';
	}
	return reponseText.replace(/MYSQL:/g, '').replace(/\n/g, '');
};

export default function ({ editConfig: { value, options } }: AnyType, { domainModel, canvasEle }: AnyType) {
	const [naturalString, setNaturalString] = useState((value.get() ?? {}).description || '');
	const [sqlString, setSqlString] = useState((value.get() ?? {}).sql || '');

	const generateSQL = useCallback(() => {
		if (!naturalString) {
			message.warn('请先填写需求描述');
			return;
		}

		message.loading({ content: '生成SQL中，请稍后...', key: 'GENERATE_SQL', duration: 0 });

		(async () => {
			const response = await fetch('./paas/api/intelligence/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					prompt: options?.getSql?.({ naturalString, domainModel, paramsSchema: options.paramsSchema }),
				})
			});

			const res = await response.json();

			if (res.code !== 1) {
				throw new Error(res?.message);
			}

			const sql = getContentFromResponse(res.data);

			const sqlType = sql.split(' ')[0];

			if (!['SELECT', 'DELETE', 'UPDATE', 'INSERT'].includes(sqlType.toUpperCase())) {
				throw new Error('暂不支持的类型');
			}

			// setNaturalString('');
			setSqlString(getContentFromResponse(res.data));

			message.success({ content: '生成SQL成功', key: 'GENERATE_SQL', duration: 2 });
    
		})().catch(err => {
			message.error({ content: err?.message || '生成SQL失败', key: 'GENERATE_SQL', duration: 2 });
		});
	}, [naturalString]);

	useEffect(() => {
		const sqlType = sqlString.split(' ')[0];

		value.set({
			sql: sqlString,
			sqlType: sqlType,
			description: naturalString
		});
	}, [sqlString]);

	return (
		<>
			<div className={`${css.editor}`}>
				<p className={css.title}>需求描述</p>
				<Input.TextArea
					rows={4}
					placeholder={'请用一句话来描述你的需求，比如：找到前三个姓李的用户'}
					onChange={evt => {
						setNaturalString(evt?.target?.value);
					}}
					onBlur={(evt) => {
						setNaturalString(evt?.target?.value);
					}}
					value={naturalString}
				/>
				<div className={css.chatAI} onClick={generateSQL}>点击使用需求信息生成SQL语句</div>
				{
					sqlString && <>
						<p className={css.title}>生成的SQL语句</p>
						<p className={css.text}>{sqlString}</p>
					</>
				}
				{
					Array.isArray(options.suggestions) && <div className={css.suggestions}>
						<p>常见示例</p>
						{
							options.suggestions.map((t, i) => {
								return <div key={t}>{`${i + 1}. ${t}`}</div>;
							})
						}
					</div>
				}
				{/* <Input.TextArea
					rows={5}
          disabled={true}
					readonly
					onChange={evt => {
						setSqlString(evt?.target?.value);
					}}
					onBlur={(evt) => {
						setSqlString(evt?.target?.value);
					}}
					value={sqlString}
				/> */}
			</div>
		</>
	);
}