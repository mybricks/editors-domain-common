import css from './FromRender.less'
import {IgnoreObservable, observe, useComputed, useObservable} from "@mybricks/rxui";
import React, {useEffect, useState} from "react";

import {getPinTypeStyle, isTypeMatch, isXpathMatch} from "./utils";
import {XPATH_ARRAY} from "../constants";
import {getTypeTitleBySchema} from "../utils";
import InsertCtx from "./InsertCtx";

class MyCtx {
  @IgnoreObservable
  schema: {}
}

let edtCtx: InsertCtx

export default function FromRender({schema}: { schema: {} }) {
  edtCtx = observe(InsertCtx, {from: 'parents'})

  const ctx = useObservable(MyCtx, next => {
    next({schema})
  })

  return ctx.schema ? (
    <div className={`${css.schema} ${edtCtx.mover ? css.draging : ''}`}>
      {/*<div className={css.tt}>参数</div>*/}
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
          return <ProItem key={key} keyName={key} val={properties[key]} xpath={nxpath}/>
        })
      }
    </>
  ) : null
}

function ProItem({val, keyName, xpath, root}: { val, keyName?, xpath?, root? }) {
  const [matchMover, setMatch] = useState(false)

  let jsx
  if (val.type === 'array') {
    jsx = (<ProAry items={val.items} xpath={xpath}/>)
  } else {
    if (val.type === 'object') {
      jsx = (<ProObj properties={val.properties} xpath={xpath}/>)
    }
  }

  useComputed(() => {
    if (edtCtx.mover) {
      if (isXpathMatch(xpath, edtCtx.mover.xpath)) {
        //console.log(xpath,edtCtx.mover.xpath)
        // if(xpath,edtCtx.mover.xpath){
        //
        // }
        const toSchema = edtCtx.mover.schema

        if (isTypeMatch(val, toSchema)) {
          setMatch(true)
        } else {
          setMatch(false)
        }
      }
    } else {
      setMatch(false)
    }
  })

  if (val.type === 'unknown' || val.type === 'follow') {
    return (
      <div className={css.invalid}>（无效的类型）</div>
    )
  }

  const _hasCon = edtCtx.nowValue.conAry.find(con => con.from === xpath)

  const [hasCon, setHasCon] = useState(_hasCon)

  useEffect(() => {
    if (hasCon) {
      const toEle = edtCtx.toEle.querySelector(`[data-xpath='${xpath}']`) as HTMLElement
      if (!toEle) {
        setHasCon(void 0)
      }
    }
  }, [])


  const st = getPinTypeStyle(val.type)

  return (
    <div key={keyName}
         className={`${css.item} ${root ? css.rootItem : ''}`}>
      <div className={`${css.keyName} ${hasCon ? css.done : ''} ${matchMover ? css.match : ''}`}
           onMouseOver={e => {
             if (matchMover) {
               edtCtx.hoverFromXpath = xpath
             }
           }}
           onMouseOut={e => {
             edtCtx.hoverFromXpath = void 0
           }}>
           <span className={`${css.point}`} data-xpath={xpath}
                 style={{
                   borderColor: st.strokeColor,
                   backgroundColor: st.strokeColor,
                   visibility: hasCon ? 'visible' : 'hidden'
                 }}></span>
        {keyName}
        <span className={css.typeName} style={{color: st.strokeColor}}>
          {root ? '参数' : `（${getTypeTitleBySchema(val)}）`}
        </span>
      </div>
      {jsx}
    </div>
  )
}