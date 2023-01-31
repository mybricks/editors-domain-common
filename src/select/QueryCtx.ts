import {DomainViewModel} from "@mybricks/desn-domain-view";

export type T_Field = {
  id,
  isPrimaryKey,
  name,
  desc
}

export type T_Entity = {
  id,
  name,
  desc,
  fieldAry: T_Field[]
}

export type T_Condition = {
  fieldId,
  fieldName,
  operator,
  value
}

export default class QueryCtx {
  editorEle:HTMLElement

  paramSchema:{}

  domainModel: DomainViewModel

  value: {
    get, set
  }

  nowValue: {
    desc: string
    sql: string
    entity: T_Entity,
    whereJoiner,
    conditions: T_Condition[],
    limit
  }

  close

  blurAry = []

  addBlur(fn) {
    this.blurAry.push(fn)
  }

  blurAll() {
    if (this.blurAry.length > 0) {
      this.blurAry.forEach(fn => fn())

      this.blurAry = []
    }
  }

  save() {
    const nowValue = this.nowValue
    let desc

    if (nowValue.entity && nowValue.entity.fieldAry.length > 0) {
      const sql = []
      const fAry = nowValue.entity.fieldAry.map(field => {
        return field.name
      }).join(',')

      desc = `${nowValue.entity.name} 的 ${fAry}`

      sql.push(`SELECT ${fAry} FROM ${nowValue.entity.name}`)

      if (nowValue.conditions.length > 0) {
        const wheres = nowValue.conditions.map(con => {
          if (con.value !== void 0) {
            const oriField = this.getOriField(con.fieldId)
            if (oriField) {
              const val = oriField.getValueByType(con.value)

              return con.fieldName + con.operator + val
            }
          }
        }).filter(w => w)

        if (wheres.length > 0) {
          sql.push(`WHERE ${wheres.join(` ${nowValue.whereJoiner} `)}`)
        }
      }

      sql.push(`LIMIT ${nowValue.limit}`)

      this.nowValue.sql = sql.join(' ')
    } else {
      this.nowValue.sql = void 0
    }
    this.nowValue.desc = desc

    this.value.set(this.nowValue)

    this.close()
  }

  getOriEntity() {
    const nowEntity = this.nowValue.entity
    if (nowEntity) {
      return this.domainModel.entityAry.find(e => e.id === nowEntity.id)
    }
  }

  getOriField(fieldId) {
    const oriEntity = this.getOriEntity()
    if (oriEntity) {
      return oriEntity.fieldAry.find(e => e.id === fieldId)
    }
  }

  setEntity(entity) {
    const ent = entity.toJSON()
    this.nowValue.entity = ent
  }

  setField(fieldId) {
    const nowEntity = this.nowValue.entity
    const oriEntity = this.domainModel.entityAry.find(e => e.id === nowEntity.id)

    if (nowEntity.fieldAry.find(f => f.id === fieldId)) {//exist
      nowEntity.fieldAry = nowEntity.fieldAry.filter(f => f.id !== fieldId)
    } else {
      nowEntity.fieldAry = oriEntity.fieldAry.map(oriF => {
        let field = nowEntity.fieldAry.find(f => f.id === oriF.id)
        if (field) {//exits
          return field
        } else if (oriF.id === fieldId) {
          return oriEntity.fieldAry.find(f => f.id === fieldId).toJSON() as any
        }
      }).filter(f => f)
    }
  }

  addCondition(field: T_Field) {
    this.nowValue.conditions.push({
      fieldId: field.id,
      fieldName: field.name,
      operator: void 0,
      value: ''
    })
  }

  removeCondition(fieldId) {
    this.nowValue.conditions = this.nowValue.conditions.filter(con => con.fieldId !== fieldId)
  }
}