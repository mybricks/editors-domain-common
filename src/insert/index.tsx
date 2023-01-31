import React, {useCallback, useEffect, useState} from 'react'
import css from './index.less'
import {observe, useObservable} from "@mybricks/rxui";

import InsertEditor from "./InsertEditor";
import {createPortal} from "react-dom";

export default function ({title, value, options}, {domainModel, canvasEle}) {
  const [popTrue, pop] = useState(false)
  // const openEditor = useCallback(() => {
  //   function doJSX({close}) {
  //     return <InsertEditor domainModel={domainModel}
  //                          paramSchema={options.paramSchema}
  //                          value={value}
  //                          close={close}/>
  //   }
  //
  //   emitView.popView('添加数据', doJSX as any, {width: 500, beforeEditView: true})
  // }, [])

  const val = value.get()

  const openPop = useCallback(() => {
    pop(true)
  }, [])

  const close = useCallback(() => {
    pop(false)
  }, [])

  return (
    <>
      <div className={`${css.editor} ${css[options?.type]}`}
           onClick={openPop}>
        <span>规则:</span>
        <span className={css.tt}>{val?.desc ? `${val.desc}` : '[空] 点击编辑..'}</span>
        {/*{selectedCon ? <span className={css.type}>{selectedCon.icon}</span> : null}*/}

      </div>
      {
        popTrue ? createPortal(<InsertEditor domainModel={domainModel}
                                             paramSchema={options.paramSchema}
                                             value={value}
                                             close={close}/>, canvasEle) : null
      }
    </>
  )
}