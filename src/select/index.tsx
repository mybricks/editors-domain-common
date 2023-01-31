import React, {useCallback, useState} from 'react'
import css from './index.less'
import {observe, useObservable} from "@mybricks/rxui";
// import {NS_Emits} from "@sdk";
import QueryEditor from "./QueryEditor";
import {createPortal} from "react-dom";

export default function ServiceSelect({ editConfig: { value, options } }, { domainModel, canvasEle }) {
  // const emitView = useObservable(NS_Emits.Views, {expectTo: 'parents'})
	const [popTrue, pop] = useState(false);

  //const entityAry = dsCtx.model.domainView.entityAry

  // const openEditor = useCallback(() => {
  //   function doJSX({close}) {
  //     return <QueryEditor domainModel={domainModel}
  //                         paramSchema={options.paramSchema}
  //                         value={value} close={close}/>
  //   }
	//
  //   emitView.popView('查询数据', doJSX as any, {width: 500, beforeEditView: true})
  // }, [])

  const val = value.get()
	const openPop = useCallback(() => {
		pop(true)
	}, [])
	
	const close = useCallback(() => {
		pop(false)
	}, [])

  return (
    <div className={`${css.editor} ${css[options?.type]}`}
         onClick={openPop}>
      <span>已选择:</span>
      <span className={css.tt}>{val?.desc ? `${val.desc}` : '[空] 点击选择..'}</span>
      {/*{selectedCon ? <span className={css.type}>{selectedCon.icon}</span> : null}*/}
	    {
		    popTrue ? createPortal(<QueryEditor domainModel={domainModel}
		                                        paramSchema={options.paramSchema}
		                                        value={value} close={close} />, canvasEle) : null
	    }
    </div>
  )
}