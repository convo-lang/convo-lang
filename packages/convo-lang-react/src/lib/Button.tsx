import { createElement } from "react";
import { ButtonBaseProps, useBaseButton } from "./useButtonBase.js";

export type ButtonProps=ButtonBaseProps;
export function Button(props:ButtonProps){

    const {elem,children,...buttonProps}=useBaseButton(props);

    return createElement(elem,buttonProps,children);

}
