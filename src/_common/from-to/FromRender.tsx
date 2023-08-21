// @ts-ignore
import { IgnoreObservable, observe, useComputed, useObservable } from '@mybricks/rxui';
import React, { useEffect, useState } from 'react';
import { getPinTypeStyle, isTypeMatch, isXpathMatch, getTypeTitleBySchema } from './utils';
import Ctx from './Ctx';
import { XPATH_ARRAY } from './constants';
import { AnyType } from '../../_types';

import css from './FromRender.less';


class MyCtx {
	title!: string;

  @IgnoreObservable
  	schema!: Record<string, unknown>;
}

let edtCtx: Ctx;
let myCtx: MyCtx;

export default function FromRender({ title, schema }: { title: string; schema: Record<string, unknown> }) {
	edtCtx = observe(Ctx, { from: 'parents' });

	myCtx = useObservable(MyCtx, next => {
		next({ title, schema });
	});

	return myCtx.schema ? (
		<div className={`${css.schema} ${edtCtx.mover ? css.draging : ''}`}>
			{/*<div className={css.tt}>参数</div>*/}
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
					return <ProItem key={key} keyName={key} val={properties[key]} xpath={nxpath}/>;
				})
			}
		</>
	) : null;
}

function ProItem({ val, keyName, xpath, root }: { val, keyName?, xpath?, root? }) {
	const [matchMover, setMatch] = useState(false);

	let jsx;
	if (val.type === 'array') {
		jsx = (<ProAry items={val.items} xpath={xpath}/>);
	} else {
		if (val.type === 'object') {
			jsx = (<ProObj properties={val.properties} xpath={xpath}/>);
		}
	}

	useComputed(() => {
		if (edtCtx.mover) {
			if (isXpathMatch(xpath, edtCtx.mover.xpath)) {
				//console.log(xpath,edtCtx.mover.xpath)
				// if(xpath,edtCtx.mover.xpath){
				//
				// }
				const toSchema = edtCtx.mover.schema;

				if (isTypeMatch(val, toSchema)) {
					setMatch(true);
				} else {
					setMatch(false);
				}
			}
		} else {
			setMatch(false);
		}
	});

	if (val.type === 'unknown' || val.type === 'follow') {
		return (
			<div className={css.invalid}>（无效的类型）</div>
		);
	}

	const _hasCon = edtCtx.conAry.find(con => con.from === xpath);

	const [hasCon, setHasCon] = useState(_hasCon);

	useEffect(() => {
		if (hasCon) {
			const toEle = edtCtx.toEle.querySelector(`[data-xpath='${xpath}']`) as HTMLElement;
			if (!toEle) {
				setHasCon(void 0);
			}
		}
	}, []);


	const st = getPinTypeStyle(val.type);

	return (
		<div key={keyName}
			className={`${css.item} ${root ? css.rootItem : ''}`}>
			<div className={`${css.keyName} ${hasCon ? css.done : ''} ${matchMover ? css.match : ''}`}
				onMouseOver={() => {
					if (matchMover) {
						edtCtx.hoverFromXpath = xpath;
					}
				}}
				onMouseOut={() => {
					// @ts-ignore
					edtCtx.hoverFromXpath = void 0;
				}}>
				<span className={`${css.point}`} data-xpath={xpath}
					style={{
						borderColor: st?.strokeColor,
						backgroundColor: st?.strokeColor,
						visibility: hasCon ? 'visible' : 'hidden'
					}}></span>
				{keyName}
				<span className={css.typeName} style={{ color: st?.strokeColor }}>
					{root ? myCtx.title : `（${getTypeTitleBySchema(val)}）`}
				</span>
			</div>
			{jsx}
		</div>
	);
}
