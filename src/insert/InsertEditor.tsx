import css from "./InsertEditor.less";
import React, {useCallback, useEffect} from "react";
import {evt, getPosition, useComputed, useObservable} from "@mybricks/rxui";
import InsertCtx from "./InsertCtx";
import FromRender from "./FromRender";
import ToRender from "./ToRender";
import Con from './Con'

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
            中通过以下规则添加数据
          </div>
          <Mapping/>
        </div>
      </div>
    </div>
  )
}

function Mapping() {
  const paramSchema = ctx.paramSchema
  const nowValue = ctx.nowValue
  const entityAry = ctx.domainModel.entityAry

  const fieldSchema = useComputed(() => {
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
  })

  return (
    <div className={css.content} ref={e => e && (ctx.contentEle = e)}>
      <div className={css.scroll} ref={e => e && (ctx.ele = e)}>
        <div className={css.from} ref={e => e && (ctx.fromEle = e)}>
          <FromRender schema={paramSchema}/>
        </div>
        <div className={css.to} ref={e => e && (ctx.toEle = e)}>
          <ToRender schema={fieldSchema}/>
        </div>
        {ctx.ele ? <Cons/> : null}
      </div>
    </div>
  )
}

function Cons() {
  const moverStyle = useComputed(() => {
    const rtn = {} as any
    const mover = ctx.mover
    if (mover) {
      const po = getPosition(ctx.ele)

      rtn.display = ''
      rtn.left = mover.x - po.x
      rtn.top = mover.y - po.y

      const st = ctx.contentEle.scrollTop

      if (rtn.top - st < 0) {
        ctx.contentEle.scrollTop = st - 20
      } else {
        if ((rtn.top - st + 30) > ctx.contentEle.offsetHeight) {
          ctx.contentEle.scrollTop = st + 20
        }
      }
    } else {
      rtn.display = 'none'
    }
    return rtn
  })

  useEffect(() => {
    {
      const ary = []
      ctx.nowValue.conAry.forEach((con, idx) => {//判断刷新
        const fromEle = ctx.fromEle.querySelector(`[data-xpath='${con.from}']`) as HTMLElement
        const toEle = ctx.toEle.querySelector(`[data-xpath='${con.to}']`) as HTMLElement

        if (fromEle && toEle) {
          ary.push(con)
        }
      })

      if (ary.length !== ctx.nowValue.conAry.length) {
        ctx.nowValue.conAry = ary
      }
    }
  }, [])


  return (
    <div className={css.relations} ref={e => e && (ctx.consEle = e)}>
      <svg>
        {
          ctx.nowValue.conAry.map((con, idx) => {
            return (
              <Con key={`${con.from}-${con.to}`} fromXpath={con.from} toXpath={con.to}/>
            )
          })
        }
      </svg>
      <div className={css.mover} style={moverStyle}>
        {ctx.mover?.title}
      </div>
      <ConMenu ctx={ctx}/>
    </div>
  )
}

function ConMenu() {
  let style = {} as any
  const fc = ctx.focusCon
  if (fc) {
    style.display = 'block'
    style.left = fc.position.x
    style.top = fc.position.y
  }

  const del = useCallback(() => {
    ctx.delFocusCon()
  }, [])

  return (
    <div className={css.conMenu} style={style}>
      <div className={css.menuItem} onClick={del}>删除</div>
    </div>
  )
}