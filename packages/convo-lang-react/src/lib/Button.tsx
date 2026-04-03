import { createElement } from "react";
import { ButtonBaseProps, useBaseButton } from "./useButtonBase.js";

export function Button(props:ButtonBaseProps){

    const {elem,children,...buttonProps}=useBaseButton(props);

    return createElement(elem,buttonProps,children);

}
