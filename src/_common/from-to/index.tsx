import React, { useCallback, useEffect } from 'react';
// @ts-ignore
import { getPosition, observe, useComputed, useObservable } from '@mybricks/rxui';
import FromRender from './FromRender';
import ToRender from './ToRender';
import Ctx from './Ctx';
import Con from './Con';

import css from './index.less';

export default function FromTo({ conAry, from, to, addBlurFn }) {
	const ctx = useObservable(Ctx, next => {
		next({
			conAry: conAry || [],
			addBlurFn
		});
	}, { to: 'children' }, [conAry]);

	useEffect(() => {
		addBlurFn(() => {
			ctx.focusCon = void 0;
		});
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
		const ary: Array<{ from: string; to: string }> = [];
		ctx.conAry.forEach(con => {//判断刷新
			const fromEle = ctx.fromEle.querySelector(`[data-xpath='${con.from}']`) as HTMLElement;
			const toEle = ctx.toEle.querySelector(`[data-xpath='${con.to}']`) as HTMLElement;
			
			if (fromEle && toEle) {
				ary.push(con);
			}
		});
		
		if (ary.length !== ctx.conAry.length) {
			ctx.conAry = ary;
		}
	}, []);


	return (
		<div className={css.relations} ref={e => e && (ctx.consEle = e)}>
			<svg>
				{
					ctx.conAry.map((con) => {
						return (
							<Con key={`${con.from}-${con.to}`} fromXpath={con.from} toXpath={con.to}/>
						);
					})
				}
			</svg>
			<div className={css.mover} style={moverStyle}>
				{ctx.mover?.title}
			</div>
			<ConMenu ctx={ctx}/>
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