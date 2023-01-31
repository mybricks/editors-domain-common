import React, {useCallback} from 'react'
import css from './index.less'
import {observe, useObservable} from "@mybricks/rxui";
import {NS_Emits} from "@sdk";

import SPAContext from "../../SPAContext";
import QueryEditor from "./QueryEditor";

export default function ServiceSelect({title, value, options, ele, containerEle}: { ele: HTMLElement }) {
  const emitView = useObservable(NS_Emits.Views, {expectTo: 'parents'})
  const dsCtx = observe(SPAContext, {from: 'parents'})

  //const entityAry = dsCtx.model.domainView.entityAry

  const openEditor = useCallback(() => {
    function doJSX({close}) {
      return <QueryEditor domainModel={dsCtx.model.domainView}
                          paramSchema={options.paramSchema}
                          value={value} close={close}/>
    }

    emitView.popView('查询数据', doJSX as any, {width: 500, beforeEditView: true})
  }, [])

  //let selectedCon

  const val = value.get()
  // if (val?.entity) {
  //   if (entityAry) {
  //     selectedCon = entityAry.find(et => et.id === val.entity.id)
  //   }
  // }

  // useEffect(() => {
  //   openEditor()
  // }, [])

  return (
    <div className={`${css.editor} ${css[options?.type]}`}
         onClick={openEditor}>
      <span>已选择:</span>
      <span className={css.tt}>{val?.desc ? `${val.desc}` : '[空] 点击选择..'}</span>
      {/*{selectedCon ? <span className={css.type}>{selectedCon.icon}</span> : null}*/}
    </div>
  )
}