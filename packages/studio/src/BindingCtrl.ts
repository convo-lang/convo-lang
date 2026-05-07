import { ObjectBinding, ObjectBindingOptions } from "@convo-lang/convo-lang";
import { uuid } from "@iyio/common";
import type { StudioCtrl } from "./StudioCtrl.js";

export interface BindingCtrlOptions<T extends Record<string,any>> extends ObjectBindingOptions<T>
{
    studio:StudioCtrl;
}

export abstract class BindingCtrl<T extends Record<string,any>> extends ObjectBinding<T>
{
    public readonly id:string;

    public readonly studio:StudioCtrl;
    public constructor({
        obj,
        studio
    }:BindingCtrlOptions<T>){
        super({obj});
        this.id=uuid();
        this.studio=studio;
    }
}