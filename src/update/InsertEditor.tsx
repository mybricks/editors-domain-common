import css from "./InsertEditor.less";
import React, {useCallback, useEffect, useMemo} from "react";
import {evt, getPosition, useComputed, useObservable} from "@mybricks/rxui";
import InsertCtx from "./InsertCtx";
import FromTo from "../_common/from-to";

let ctx: InsertCtx

export default function InsertEditor({domainModel, paramSchema, value, close}) {
  ctx = useObservable(InsertCtx, next => {
    const oriVal = value.get()
    let val
    if (oriVal) {
      val = JSON.parse(JSON.stringify(oriVal))
    } else {
      val = {
        conAry: []
      }
    }

    next({
      domainModel,
      paramSchema,
      nowValue: val,
      value,
      close
    })
  }, {to: 'children'})

  const nowValue = ctx.nowValue
  const entityAry = ctx.domainModel.entityAry

  if (!nowValue.entity && entityAry.length > 0) {
    ctx.setEntity(entityAry[0].id)
  }

  const fieldSchema = useMemo(() => {
    const nowEntity = nowValue.entity
    if (nowEntity) {
      const oriEntity = entityAry.find(et => et.id === nowEntity.id)
      const properties = {}
      const rtn = {
        type: 'object',
        properties
      }

      oriEntity.fieldAry.forEach(field => {
        if (!field.isPrimaryKey) {
          properties[field.name] = field.getSchema()
        }
      })
      return rtn
    }
  }, [])

  return (
    <div className={css.bg} onClick={close}>
      <div className={css.view} onClick={evt(ctx.blurAll).stop}>
        <div className={css.toolbar}>
          <button onClick={ctx.save}>确定</button>
        </div>
        <div className={css.main}>
          <div className={css.segTitle}>
            向
            <select className={css.selectDom}
                    value={nowValue.entity?.id}
                    onChange={e => {
                      ctx.setEntity(e.target.value)
                    }}>
              {
                entityAry.map(et => {
                  return (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  )
                })
              }
            </select>
            中通过以下规则编辑数据
          </div>
          <FromTo conAry={nowValue.conAry}
                  from={{title: '参数', schema: paramSchema}}
                  to={{
                    title: nowValue.entity.name,
                    schema: fieldSchema
                  }}
                  addBlurFn={ctx.addBlur}/>
        </div>
      </div>
    </div>
  )
}




