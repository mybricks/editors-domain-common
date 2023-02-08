import React, { useCallback, useEffect, useState } from 'react';
import css from './index.less';
import { getPosition, observe, useComputed, useObservable } from '@mybricks/rxui';
import FromRender from './FromRender';
import ToRender from './ToRender';
import Ctx from './Ctx';
import Con from './Con';
import axios from 'axios';

export default function FromTo({ conAry, from, to, addBlurFn }) {
	const ctx = useObservable(Ctx, next => {
		next({
			conAry: conAry || [],
			addBlurFn
		});
	}, { to: 'children' });

	const [transformer, setTransformer] = useState("");
	const [prompt, setPrompt] = useState("");
	const [pending, setPending] = useState(false);

	useEffect(() => {
		addBlurFn(() => {
			// ctx.focusCon = void 0;
		});

		console.warn("阿卡的肌肤对抗肌肤", ctx.focusCon)

	}, []);

	const onDeleteCon = useCallback(() => {
		ctx.delFocusCon();
	}, []);

	const onChangeTransformer = useCallback((e) => {
		console.error("onChangeTransformer", e);
		let value = e.target.value?.trim();
		setTransformer(value);
		setPrompt("");
		// ctx.changeFocusConTransformer("", e.target.value?.trim());
	}, [prompt]);

	const onChangePrompt = useCallback((e) => {
		let value = e.target.value?.trim();
		setPrompt(value);
	}, []);

	const onChatGpt = useCallback(() => {
		//调用接口
		setPending(true);
		let prompt = `
请帮我把这个 JavaScript 函数的代码补充完整，(inputValue, { inputSchema, outputSchema }) => {}

inputSchema 为 

{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "sex": {
      "type": "string"
    },
    "age": {
      "type": "number"
    }
  }
}

outputSchema 为

{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "sex": {
      "type": "number"
    },
    "age": {
      "type": "string"
    }
  }
}

`;

		// 
		setTimeout(() => {
			// console.log("back")
			setPending(false);
			// setTransformer("");
		}, 1000);
	}, []);

	return (
		<div className={css.content} ref={e => e && (ctx.contentEle = e)}>
			<div className={css.scroll} ref={e => e && (ctx.ele = e)}>
				<div className={css.from} ref={e => e && (ctx.fromEle = e)}>
					<FromRender title={from.title} schema={from.schema} />
				</div>
				<div className={css.to} ref={e => e && (ctx.toEle = e)}>
					<ToRender title={to.title} schema={to.schema} />
				</div>
				{ctx.ele ? <Cons /> : null}
			</div>

			{/* 连线信息 */}
			{ctx.focusCon ? (
				<div className={css.transformer}>
					<div className={css.head}>
						<div className={css.title}>从<span className={css.conPoint}>{ctx.focusCon?.fromXpath || "root"}</span>到<span className={css.conPoint}>{ctx.focusCon?.toXpath || "root"}</span>的连线</div>
						<div className={css.extra}>
							<div className={css.delete} onClick={onDeleteCon}>删除连线</div>
						</div>
					</div>
					<div className={css.body}>
						<textarea className={css.textarea} onInput={onChangeTransformer} readOnly={pending} value={transformer}></textarea>
						<textarea className={css.chatgpt} placeholder="可以尝试用中文来描述你的需求" onInput={onChangePrompt} onBlur={onChatGpt} value={prompt}></textarea>
					</div>
				</div>
			) : null}

		</div>
	);
}


function Cons() {
	const ctx = observe(Ctx, { from: 'parents' });

	const moverStyle = useComputed(() => {
		const rtn = {} as any;
		const mover = ctx.mover;
		if (mover) {
			const po = getPosition(ctx.ele);

			rtn.display = '';
			rtn.left = mover.x - po.x;
			rtn.top = mover.y - po.y;

			const st = ctx.contentEle.scrollTop;

			if (rtn.top - st < 0) {
				ctx.contentEle.scrollTop = st - 20;
			} else {
				if ((rtn.top - st + 30) > ctx.contentEle.offsetHeight) {
					ctx.contentEle.scrollTop = st + 20;
				}
			}
		} else {
			rtn.display = 'none';
		}
		return rtn;
	});

	useEffect(() => {
		{
			const ary = [];
			ctx.conAry.forEach((con, idx) => {//判断刷新
				const fromEle = ctx.fromEle.querySelector(`[data-xpath='${con.from}']`) as HTMLElement;
				const toEle = ctx.toEle.querySelector(`[data-xpath='${con.to}']`) as HTMLElement;

				if (fromEle && toEle) {
					ary.push(con);
				}
			});

			if (ary.length !== ctx.conAry.length) {
				ctx.conAry = ary;
			}
		}
	}, []);


	return (
		<div className={css.relations} ref={e => e && (ctx.consEle = e)}>
			<svg>
				{
					ctx.conAry.map((con, idx) => {
						return (
							<Con key={`${con.from}-${con.to}`} fromXpath={con.from} toXpath={con.to} />
						);
					})
				}
			</svg>
			<div className={css.mover} style={moverStyle}>
				{ctx.mover?.title}
			</div>
			{/* 连线上不再展示按钮 */}
			{/* <ConMenu ctx={ctx}/> */}
		</div>
	);
}

function ConMenu({ ctx }) {
	let style = {} as any;
	const fc = ctx.focusCon;
	if (fc) {
		style.display = 'block';
		style.left = fc.position.x;
		style.top = fc.position.y;
	}

	const del = useCallback(() => {
		ctx.delFocusCon();
	}, []);

	return (
		<div className={css.conMenu} style={style}>
			<div className={css.menuItem} onClick={del}>删除</div>
		</div>
	);
}