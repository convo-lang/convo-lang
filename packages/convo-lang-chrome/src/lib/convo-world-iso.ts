import { createChromeIsoMainRelay, setChromeEnv } from "@iyio/chrome-common";
import { WorldIsoCtrl } from "./WorldIsoCtrl";

export const initConvoChromeWorldIso=()=>{

    setChromeEnv('iso');

    createChromeIsoMainRelay();
    new WorldIsoCtrl();
}
