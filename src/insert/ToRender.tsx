import css from './ToRender.less'
import {dragable, IgnoreObservable, observe, useComputed, useObservable} from "@mybricks/rxui";
import React, {useCallback, useEffect, useState} from "react";
import EdtCtx from "./InsertCtx";
import {XPATH_ARRAY} from "../constants";
import {getTypeTitleBySchema} from "../utils";
import {getPinTypeStyle} from "./utils";
import InsertCtx from "./InsertCtx";

class MyCtx {
  @IgnoreObservable
  schema: {}
}

let edtCtx: EdtCtx

export default function ToRender({schema}: { schema: {} }) {
  edtCtx = observe(InsertCtx, {from: 'parents'})

  const ctx = useObservable(MyCtx, next => {
    next({schema})
  }, [schema])

  return ctx.schema ? (
    <div className={`${css.schema} ${edtCtx.mover ? css.draging : ''}`}>
      {/*<div className={css.tt}>表中的字段</div>*/}
      <ProItem val={ctx.schema} xpath={''} root={true}/>
    </div>
  ) : null
}

function ProAry({items, xpath}) {
  return items ? <ProItem val={items} xpath={`${xpath}/${XPATH_ARRAY}`}/> : null
}

function ProObj({properties, xpath}) {
  return properties ? (
    <>
      {
        Object.keys(properties).map(key => {
          const nxpath = xpath !== void 0 ? `${xpath}/${key}` : void 0
          return <ProItem key={key} val={properties[key]} xpath={nxpath} keyName={key}/>
        })
      }
    </>
  ) : null
}

function ProItem({val, keyName, xpath, root}: { val, keyName?, xpath?, root? }) {
  let jsx
  if (val.type === 'array') {
    jsx = (<ProAry items={val.items} xpath={xpath}/>)
  } else {
    if (val.type === 'object') {
      jsx = (<ProObj properties={val.properties} xpath={xpath}/>)
    }
  }

  const mouseDown = useCallback((e) => {
    const point = e.target as HTMLElement

    let ox, oy, nx, ny
    dragable(e, ({po: {x, y}, epo: {ex, ey}, dpo: {dx, dy}}, state) => {
      if (state == 'start') {
        nx = ox = parseInt(point.style.left)
        ny = oy = parseInt(point.style.top)

        point.style.visibility = 'hidden'
        //point.style.pointerEvents = 'none'

        edtCtx.mover = {
          x: ex + 3,
          y: ey - 14,
          title: keyName,
          schema: val,
          xpath
        }
      }
      if (state == 'moving') {
        // point.style.left = (nx += dx) + 'px'
        // point.style.top = (ny += dy) + 'px'

        edtCtx.mover.x += dx
        edtCtx.mover.y += dy
      }
      if (state == 'finish') {
        point.style.visibility = 'visible'

        //point.style.left = ox + 'px'
        // point.style.top = oy + 'px'
        // point.style.pointerEvents = 'auto'
        //
        edtCtx.finishMover()
      }
    })
  }, [])

  const [_hasCon, hasChildrenCon, hasParentCon] = useComputed(() => {
    const hasCon = edtCtx.nowValue.conAry.find(con => con.to === xpath)

    // if(keyName==='solution'){
    //   debugger
    // }

    const hasChildrenCon = edtCtx.nowValue.conAry.find(con => {
      if (!hasCon && con.to.indexOf(xpath + '/') === 0) {
        return true
      }
    })

    const hasParentCon = edtCtx.nowValue.conAry.find(con => {
      if (!hasCon) {
        const ary = xpath.split('/')

        let tPath = ''
        const has = ary.find(now => {
          //if(now!==''){
          tPath += `/${now}`
          tPath = tPath.replace(/\/\//, '/')
          if (edtCtx.nowValue.conAry.find(con => con.to === tPath)) {
            return true
          }
          //}
        })

        return has
      }
    })

    return [hasCon, hasChildrenCon, hasParentCon]
  })

  const [hasCon, setHasCon] = useState()

  useEffect(() => {
    setHasCon(hasCon)

    if (hasCon) {
      const fromEle = edtCtx.fromEle.querySelector(`[data-xpath='${xpath}']`) as HTMLElement
      if (!fromEle) {
        setHasCon(void 0)
      }
    }
  }, [_hasCon])

  if (val.type === 'unknown' || val.type === 'follow') {
    return (
      <div className={css.invalid}>（无效的类型）</div>
    )
  }

  const st = getPinTypeStyle(val.type)

  return (
    <div key={keyName} className={`${css.item} ${root ? css.rootItem : ''}`}>
      <div data-xpath={xpath}
           className={`${css.keyName} ${hasCon ? css.done : ''}`}>
        {
          !hasCon && !hasChildrenCon && !hasParentCon ? (
            <span data-not-connect={1}
                  className={`${css.point}`}
                  style={{left: -7, top: 11, borderColor: st.strokeColor, backgroundColor: st.fillColor}}
                  onMouseDown={mouseDown}></span>
          ) : null
        }
        {keyName}
        <span className={css.typeName} style={{color: st.strokeColor}}>
          {root ? edtCtx.nowValue.entity.name : `（${getTypeTitleBySchema(val)}）`}
        </span>
      </div>
      {jsx}
    </div>
  )
}