// @ts-ignore
import { dragable, IgnoreObservable, observe, useComputed, useObservable } from '@mybricks/rxui';
import React, { useCallback, useEffect, useState } from 'react';
import { getPinTypeStyle, getTypeTitleBySchema } from './utils';
import Ctx from './Ctx';
import { XPATH_ARRAY } from './constants';
import { AnyType } from '../../_types';

import css from './ToRender.less';

class MyCtx {
	title!: string;

  @IgnoreObservable
  	schema!: Record<string, unknown>;
}

let edtCtx: Ctx;
let myCtx: MyCtx;

export default function ToRender({ title, schema }: { title: string; schema: Record<string, unknown> }) {
	edtCtx = observe(Ctx, { from: 'parents' });
	myCtx = useObservable(MyCtx, next => {
		next({ title, schema });
	}, [schema]);

	return myCtx.schema ? (
		<div className={`${css.schema} ${edtCtx.mover ? css.draging : ''}`}>
			{/*<div className={css.tt}>表中的字段</div>*/}
			<ProItem val={myCtx.schema} xpath={''} root={true}/>
		</div>
	) : null;
}

function ProAry({ items, xpath }: AnyType) {
	return items ? <ProItem val={items} xpath={`${xpath}/${XPATH_ARRAY}`}/> : null;
}

function ProObj({ properties, xpath }: AnyType) {
	return properties ? (
		<>
			{
				Object.keys(properties).sort().map(key => {
					const nxpath = xpath !== void 0 ? `${xpath}/${key}` : void 0;
					return <ProItem key={key} val={properties[key]} xpath={nxpath} keyName={key}/>;
				})
			}
		</>
	) : null;
}

function ProItem({ val, keyName, xpath, root }: { val, keyName?, xpath?, root? }) {
	let jsx;
	if (val.type === 'array') {
		jsx = (<ProAry items={val.items} xpath={xpath}/>);
	} else {
		if (val.type === 'object') {
			jsx = (<ProObj properties={val.properties} xpath={xpath}/>);
		}
	}

	const mouseDown = useCallback((e) => {
		const point = e.target as HTMLElement;

		dragable(e, ({ epo: { ex, ey }, dpo: { dx, dy } }, state) => {
			if (state == 'start') {

				point.style.visibility = 'hidden';

				edtCtx.mover = {
					x: ex + 3,
					y: ey - 14,
					title: keyName,
					schema: val,
					xpath
				};
			}
			if (state == 'moving') {
				edtCtx.mover.x += dx;
				edtCtx.mover.y += dy;
			}
			if (state == 'finish') {
				point.style.visibility = 'visible';
				edtCtx.finishMover();
			}
		});
	}, []);

	const [_hasCon, hasChildrenCon, hasParentCon] = useComputed(() => {
		const hasCon = edtCtx.conAry.find(con => con.to === xpath);

		const hasChildrenCon = edtCtx.conAry.find(con => {
			if (!hasCon && con.to.indexOf(xpath + '/') === 0) {
				return true;
			}
		});

		const hasParentCon = edtCtx.conAry.find(() => {
			if (!hasCon) {
				const ary = xpath.split('/');

				let tPath = '';
				return ary.find(now => {
					tPath += `/${now}`;
					tPath = tPath.replace(/\/\//, '/');
					if (edtCtx.conAry.find(con => con.to === tPath)) {
						return true;
					}
				});
			}
		});

		return [hasCon, hasChildrenCon, hasParentCon];
	});

	const [hasCon, setHasCon] = useState();

	useEffect(() => {
		setHasCon(hasCon);

		if (hasCon) {
			const fromEle = edtCtx.fromEle.querySelector(`[data-xpath='${xpath}']`) as HTMLElement;
			if (!fromEle) {
				setHasCon(void 0);
			}
		}
	}, [_hasCon]);

	if (val.type === 'unknown' || val.type === 'follow') {
		return (
			<div className={css.invalid}>（无效的类型）</div>
		);
	}

	const st = getPinTypeStyle(val.type);

	return (
		<div key={keyName} className={`${css.item} ${root ? css.rootItem : ''}`}>
			<div data-xpath={xpath}
				className={`${css.keyName} ${hasCon ? css.done : ''}`}>
				{
					!hasCon && !hasChildrenCon && !hasParentCon ? (
						<span data-not-connect={1}
							className={`${css.point}`}
							style={{ left: -7, top: 11, borderColor: st?.strokeColor, backgroundColor: st?.fillColor }}
							onMouseDown={mouseDown}></span>
					) : null
				}
				{keyName}
				<span className={css.typeName} style={{ color: st?.strokeColor }}>
					{root ? myCtx.title : `（${getTypeTitleBySchema(val)}）`}
				</span>
			</div>
			{jsx}
		</div>
	);
}
