import { initOpenAiBackend } from "@convo-lang/convo-lang-openai";
import { vfs, VfsCtrl, vfsMntTypes } from "@iyio/vfs";
import { VfsDiskMntCtrl } from "@iyio/vfs-node";

export const initBackend=()=>{
    initOpenAiBackend(undefined,scope=>{
        scope.implementService(vfs,()=>new VfsCtrl({
            config:{
                mountPoints:[
                    {
                        type:vfsMntTypes.file,
                        mountPath:'/',
                        sourceUrl:'public',
                        allowLocalConfig:true
                    }
                ],
                allowLocalConfig:true,
            },
            mntProviderConfig:{
                ctrls:[new VfsDiskMntCtrl()]
            },
        }))
    });
}
