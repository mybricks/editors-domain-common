export default class Ctx {

  conAry: { from: string, to: string }[]

  addBlurFn: Function
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
    const conAry = this.conAry
    if (this.hoverFromXpath !== void 0
      && !conAry.find(con => con.from === this.hoverFromXpath && con.to === this.mover.xpath)) {

      conAry.forEach((con, idx) => {
        if (con.to === this.mover.xpath) {
          conAry.splice(idx, 1)//删除
        }
      })

      conAry.push({
        from: this.hoverFromXpath,
        to: this.mover.xpath
      })
    }

    this.mover = void 0
  }

  removeCon({fromXpath, toXpath}) {
    const conAry = this.conAry
    conAry.forEach((con, idx) => {
      if (con.from === fromXpath &&
        con.to === toXpath) {
        conAry.splice(idx, 1)
      }
    })
  }

  delFocusCon() {
    if (this.focusCon) {
      const conAry = this.conAry
      conAry.forEach((con, idx) => {
        if (con.from === this.focusCon.fromXpath &&
          con.to === this.focusCon.toXpath) {

          conAry.splice(idx, 1)
        }
      })
    }
  }
}