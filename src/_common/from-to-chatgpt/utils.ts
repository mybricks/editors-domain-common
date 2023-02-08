import {XPATH_ARRAY,C_TYPES_INFO} from "./constants";

export const getPinTypeStyle = function (type): { strokeColor, fillColor } {
  return C_TYPES_INFO.find(ty => ty.type == (type || 'unknown'))
}

export function getAutoChangeScript(schema0, schema1) {
  if (isTypeEqual(schema0, schema1) || schema1.type === 'any') {
    return `
      function(val){
         return val
      }
    `
  } else {
    if (schema0.type === 'string') {
      switch (schema1.type) {
        case 'boolean': {
          return `function(val){
            return true
          }`
        }
        default: {
          return
        }
      }
    } else if (schema0.type === 'number') {
      switch (schema1.type) {
        case 'string': {
          return `function(val){
            return String(val)
          }`
        }
        case 'boolean': {
          return `function(val){
            return val>0
          }`
        }
        default: {
          return
        }
      }
    } else if (schema0.type === 'boolean') {
      switch (schema1.type) {
        case 'string': {
          return `function(val){
            return val?'true'|'false'
          }`
        }
        case 'number': {
          return `function(val){
            return val?1:0
          }`
        }
        default: {
          return
        }
      }
    } else {
      return
    }
  }
}

export function isXpathMatch(xpath0: string, xpath1: string) {
  const ia0 = xpath0.indexOf(XPATH_ARRAY), ia1 = xpath1.indexOf(XPATH_ARRAY)
// if(xpath0.endsWith('/merchantCode')){
//   debugger
// }
  if (ia0 < 0 && ia1 < 0) {//not in array
    return true
  }

  const i0 = xpath0.indexOf(XPATH_ARRAY), i1 = xpath1.indexOf(XPATH_ARRAY)
  if (i0 >= 0) {// a/:array/b/c
    if (i1 < 0) {// a1/b1/c1
      return false
    } else {
      //console.log(xpath0,xpath1)


      const sub0 = xpath0.substring(i0 + XPATH_ARRAY.length)
      const sub1 = xpath1.substring(i1 + XPATH_ARRAY.length)

      //console.log(sub0,sub1)

      if (isXpathMatch(sub0, sub1)) {
        return true
      } else {
        return false
      }
    }
  } else if (i1 >= 0) {
    return false
  }


  const ary0 = xpath0.split('/'), ary1 = xpath1.split('/')
  // if (ary0.length !== ary1.length) {
  //
  // }


  const notFoundArray = ary0.find((now, idx) => {
    if (now === XPATH_ARRAY) {
      if (ary1[idx] !== XPATH_ARRAY) {
        return true
      }
    }
  })

  if (notFoundArray) {
    return false
  }

  return true
}

export function isTypeEqual(schema0, schema1) {
  if (schema0.type === schema1.type) {
    if (schema0.type === 'object') {
      if (!ifTypeObjMatch(schema0, schema1)) {
        return false
      }
    } else if (schema0.type === 'array') {
      if (!isTypeAryMatch(schema0, schema1)) {
        return false
      }
    }
    return true
  }
  return false
}

export function isTypeMatch(schema0, schema1) {
  // 存在 fun 允许不同类型间转换 
  return true;

  if (isTypeEqual(schema0, schema1)) {
    return true
  } else if (schema1.type === 'any') {
    return true
  } else if (schema0.type === 'boolean') {
    if (schema1.type.match(/number|string/gi)) {
      return true
    } else {
      return false
    }
  } else if (schema0.type === 'number') {
    if (schema1.type.match(/boolean|string/gi)) {
      return true
    } else {
      return false
    }
  } else if (schema0.type === 'string') {
    if (schema1.type.match(/boolean/gi)) {
      return true
    } else {
      return false
    }
  } else {
    return false
  }
}

export function isTypeAryMatch(schema0, schema1) {
  if (schema0.type === 'array' && schema1.type === 'array') {
    const item0 = schema0.items
    const item1 = schema1.items

    if (item0 && item1 === void 0) {
      return true
    }

    if (item0 === void 0 && item1) {
      return false
    }

    return isTypeMatch(item0, item1)

    // if (item0.type === item1.type) {
    //   if (item0.type === 'object') {
    //     if (!ifTypeObjMatch(item0, item1)) {
    //       return false
    //     }
    //   } else if (item0.type === 'array') {
    //     if (!isTypeAryMatch(item0, item1)) {
    //       return false
    //     }
    //   }
    //   return true
    // }
  } else {
    return false
  }
}

export function ifTypeObjMatch(schema0, schema1) {
  if (schema0.type === 'object' && schema1.type === 'object') {
    const pro0 = schema0.properties
    const pro1 = schema1.properties

    if (pro0 && (pro1 === void 0 || pro1 && Object.keys(pro1).length === 0)) {
      return true
    }

    if (pro0 === void 0 && pro1) {
      return false
    }

    const pk0 = Object.keys(pro0)
    const pk1 = Object.keys(pro1)
    if (pk0.sort().toString() === pk1.sort().toString()) {
      if (pk0.find(key => {
        return pro0[key].type !== pro1[key].type
      })) {
        return false
      } else {
        return true
      }
    }
  }

  return false
}

export function getTypeTitleBySchema(schema: { type: string }) {
  if (!schema || typeof schema !== 'object' || typeof schema.type !== 'string') {
    return '错误类型'
  }

  switch (schema.type) {
    case "number":
      return '数字'
    case "string":
      return '字符'
    case "boolean":
      return '布尔'
    case "object":
      return `${!schema.properties ? '任意对象' : '对象'}`
    case "array":
      return `${!schema.items ? '任意列表' : '列表'}`
    case "any":
      return '任意'
    case "follow":
      return '跟随'
    case "unknown":
      return '未知'
    default: {
      return '未定义'
    }
  }
}
