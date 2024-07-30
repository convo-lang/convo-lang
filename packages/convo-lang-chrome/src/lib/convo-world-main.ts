import { setChromeEnv } from "@iyio/chrome-common";
import { WorldMainCtrl } from "./WorldMainCtrl";

export const initConvoChromeWorldMain=()=>{

    setChromeEnv('main');

    new WorldMainCtrl();
}
