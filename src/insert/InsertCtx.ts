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

export default class InsertCtx {
  domainModel: DomainViewModel

  value: {
    get, set
  }

  paramSchema: {
    type,
    properties
  }

  nowValue: {
    desc: string
    script: string
    entity: T_Entity,
    conAry: { from: string, to: string }[]
  }

  close

  blurAry = []

  //------------------------------------------------------------

  ele: HTMLElement

  contentEle: HTMLElement

  fromEle: HTMLElement

  toEle: HTMLElement

  consEle: HTMLElement

  mover: {
    x: number
    y: number
    title: string
    schema: { type }
    xpath: string
  }

  hoverFromXpath: string

  focusCon: {
    id
    fromXpath
    toXpath
    position: { x, y }
  }

  finishMover() {
    const conAry = this.nowValue.conAry
    if (this.hoverFromXpath !== void 0
      && !conAry.find(con => con.from === this.hoverFromXpath && con.to === this.mover.xpath)) {
      this.nowValue.conAry = conAry.filter(con => {
        if (con.to !== this.mover.xpath) {
          return true
        }
      })

      this.nowValue.conAry.push({
        from: this.hoverFromXpath,
        to: this.mover.xpath
      })
    }

    this.mover = void 0
  }

  removeCon({fromXpath, toXpath}) {
    const conAry = this.nowValue.conAry
    conAry.forEach((con, idx) => {
      if (con.from === fromXpath &&
        con.to === toXpath) {
        conAry.splice(idx, 1)
      }
    })
  }

  delFocusCon() {
    if (this.focusCon) {
      const conAry = this.nowValue.conAry
      conAry.forEach((con, idx) => {
        if (con.from === this.focusCon.fromXpath &&
          con.to === this.focusCon.toXpath) {

          conAry.splice(idx, 1)
        }
      })
    }
  }

  //------------------------------------------------------------

  addBlur(fn) {
    this.blurAry.push(fn)
  }

  blurAll() {
    this.focusCon = void 0

    if (this.blurAry.length > 0) {
      this.blurAry.forEach(fn => fn())

      this.blurAry = []
    }
  }

  save() {
    const nowValue = this.nowValue
    let desc

    const conAry = this.nowValue.conAry


    if (nowValue.entity && nowValue.entity.fieldAry.length > 0) {
      desc = `${nowValue.entity.name}`

      const sql = `INSERT INTO ${nowValue.entity.name} `

      const fieldAry = [], valueAry = []
      nowValue.entity.fieldAry.forEach(f => {
        const fieldName = f.name
        const field = this.getOriField(fieldName)

        if (!field.isPrimaryKey) {
          fieldAry.push(fieldName)

          const con = conAry.find(con => con.to === `/${fieldName}`)
          if (con) {
            const fromPropName = con.from.substring(con.from.indexOf('/') + 1)
            const q = field.getTypeQuote()
            valueAry.push(`${q}\${params.${fromPropName}}${q}`)
          } else {
            valueAry.push('null')
          }
        }
      })

      const script = `
      (params)=>{
        return \`${sql}(${fieldAry.join(',')}) VALUES (${valueAry.join(',')})\`
      }
      `
      this.nowValue.script = script
    } else {
      this.nowValue.script = void 0
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

  getOriField(fieldName) {
    const oriEntity = this.getOriEntity()
    if (oriEntity) {
      return oriEntity.fieldAry.find(e => e.name === fieldName)
    }
  }

  setEntity(entityId) {
    const entity = this.domainModel.entityAry.find(e => e.id === entityId)
    const ent = entity.toJSON()
    this.nowValue.entity = ent
  }
}