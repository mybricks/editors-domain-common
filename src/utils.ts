import {TYPE_MAP} from "./constants";

export function typeCheck(variable: any, type: string): boolean {
  const checkType = /^\[.*\]$/.test(type) ? type : TYPE_MAP[type.toUpperCase()];

  return Object.prototype.toString.call(variable) === checkType;
}