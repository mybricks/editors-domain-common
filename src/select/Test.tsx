import Editor from "./index";
import React from "react";

export default function Test({model}) {
  console.log(model)

  return (
    <div style={{
      position: 'absolute',
      right: 0, top: 0, bottom: 0, width: 300, background: '#FFF', zIndex: 11
    }}>
      <Editor value={{
        get() {

        }
      }}/>
    </div>
  )
}