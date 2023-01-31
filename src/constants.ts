export const XPATH_ARRAY = `:array`

export const TYPE_MAP: {
  [key: string]: string;
} = {
  NULL: "[object Null]",
  ARRAY: "[object Array]",
  OBJECT: "[object Object]",
  STRING: "[object String]",
  NUMBER: "[object Number]",
  BOOLEAN: "[object Boolean]",
  FUNCTION: "[object Function]",
  FORMDATA: "[object FormData]",
  UNDEFINED: "[object Undefined]",
};

export const C_TYPES_INFO = [{
  type: 'number',
  title: '数字',
  strokeColor: '#4460B8',
  fillColor: '#8297DA'
}, {
  type: 'boolean',
  title: '布尔',
  strokeColor: '#ff0000',
  fillColor: '#f8bcbc'
},
  {
    type: 'string',
    title: '字符',
    strokeColor: '#88a409',
    fillColor: '#b4cb9a'
  },
  {
    type: 'object',
    title: '对象',
    strokeColor: '#9727d0',
    fillColor: '#e4b1f8'
  },
  {
    type: 'array',
    title: '数组',
    strokeColor: '#ce980f',
    fillColor: '#ecc86a'
  },
  {
    type: 'any',
    title: '任意',
    strokeColor: '#999',
    fillColor: '#FFF'
  },
  {
    type: 'follow',
    title: '跟随',
    strokeColor: '#999',
    fillColor: '#FFF'
  },
  {
    type: 'unknown',
    title: '未知',
    strokeColor: '#999',
    fillColor: '#DDD'
  }
]