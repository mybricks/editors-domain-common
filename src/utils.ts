import {TYPE_MAP} from "./constants";

export function typeCheck(variable: any, type: string): boolean {
  const checkType = /^\[.*\]$/.test(type) ? type : TYPE_MAP[type.toUpperCase()];

  return Object.prototype.toString.call(variable) === checkType;
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
