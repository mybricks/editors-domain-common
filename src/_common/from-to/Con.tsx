import css from "./Con.less";
import React, { useCallback, useMemo, useRef } from "react";

import { evt, getPosition, observe, useComputed, uuid } from "@mybricks/rxui";
import Ctx from "./Ctx";

export default function Con({ fromXpath, toXpath }) {
	const edtCtx = observe(Ctx, { from: 'parents' });

	const lineRef = useRef<SVGPolylineElement>();

	const cid = useMemo(() => uuid(), []);

	const [fxy, txy, lines, borderColor] = useComputed(() => {
		const fromEle = edtCtx.fromEle.querySelector(`[data-xpath='${fromXpath}']`) as HTMLElement;
		const toEle = edtCtx.toEle.querySelector(`[data-xpath='${toXpath}']`) as HTMLElement;

		if (fromEle && toEle) {
			const fromPo = getPosition(fromEle, edtCtx.ele), toPo = getPosition(toEle, edtCtx.ele);
			const fxr = Math.round(fromPo.x + fromEle.offsetWidth / 2), fyr = Math.round(fromPo.y + fromEle.offsetHeight / 2),
				txr = Math.round(toPo.x), tyr = Math.round(toPo.y + 1);

			// const {width, height, left, top, stPo, lines} = calculate(
			//   {x: 0, y: fromPo.y + fromEle.offsetHeight / 2},
			//   {x: edtCtx.consEle.offsetWidth, y: toPo.y + toEle.offsetHeight / 2}
			// )
			const fxy = [fxr, fyr];
			const txy = [txr - 10, tyr + Math.round(toEle.offsetHeight / 2) - 1.5];
			const half = [fxr + (txy[0] - fxr) / 2, fyr + (txy[1] - fyr) / 2];
			const lines = `M ${fxy.join(',')} C ${half[0]},${fyr} ${half[0]},${txy[1]} ${txy.join(',')} L ${txy.join(',')}`;
			//console.log(lines)
			return [fxy, txy, lines, fromEle.style.borderColor];
		} else {
			return [null, null, null];
		}
	});

	// useEffect(() => {
	//   if (!lines) {
	//     edtCtx.removeCon({fromXpath, toXpath})
	//   }
	// }, [])

	const focus = useCallback(() => {
		edtCtx.focusCon = {
			id: cid,
			fromXpath,
			toXpath,
			position: {
				x: fxy[0] + Math.round(txy[0] - fxy[0]) / 2,
				y: Math.min(fxy[1], txy[1]) + Math.abs(txy[1] - fxy[1]) / 2 + 5,
			}
		};
	}, []);

	//const st = getPinTypeStyle(val.type)
	const key = `${fromXpath}-${toXpath}`;
	return lines ? (
		<>
			<defs>
				<marker id={key} markerUnits="strokeWidth" markerWidth="1" markerHeight="1" viewBox="0 0 12 12" refX="6"
					refY="6" orient="auto">
					<path d="M2,2 L10,6 L2,10 L2,2" style={{ fill: borderColor }}/>
				</marker>
			</defs>
			<path ref={lineRef}
				className={`${css.bgLine}`}
				d={lines}
				onClick={evt(focus).stop}
				fill={'none'}
				markerEnd={`url(#${key})`}/>
			<path d={lines}
				fill={'none'}
				style={{ stroke: borderColor }}
				className={`${edtCtx.focusCon?.id === cid ? css.focus : ''}`}/>
		</>
	) : null;
}
