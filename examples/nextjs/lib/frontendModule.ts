import { convoDocReaderFactory, convoHttpRelayModule } from "@convo-lang/convo-lang";
import { convoPdfDocReaderFactory } from "@convo-lang/convo-lang-pdf";
import { ScopeRegistration, initRootScope, isServerSide } from "@iyio/common";
import { nextJsModule } from "@iyio/nextjs-common";
import { VfsCtrl, VfsHttpProxyMntCtrl, vfs, vfsMntTypes } from "@iyio/vfs";

let inited=false;
export const initFrontend=()=>{
    if(inited){
        return;
    }
    inited=true;
    initRootScope(frontendModule);
}

export const frontendModule=(reg:ScopeRegistration)=>{

    if(isServerSide){
        return;
    }

    reg.addFactory(convoDocReaderFactory,convoPdfDocReaderFactory);
    //reg.implementService(convoCacheService,()=>new ConvoUserVfsCache())

    reg.addFactory(convoDocReaderFactory,convoPdfDocReaderFactory);
    //reg.implementService(convoCacheService,()=>new ConvoUserVfsCache());

    reg.use(convoHttpRelayModule);

    reg.use(nextJsModule);

    // reg.use(authModule);

    // reg.use({
    //     priority:ScopeModulePriorities.types,
    //     init:scope=>{
    //         storeRoot(scope).mount('/',new LocalStorageStore({keyPrefix:'convo-studio::'}));
    //     }
    // });

    reg.implementService(vfs,()=>new VfsCtrl({
        config:{
            mountPoints:[
                {
                    type:vfsMntTypes.httpProxy,
                    mountPath:'/',
                    sourceUrl:'/'
                }
            ]
        },
        mntProviderConfig:{
            ctrls:[
                new VfsHttpProxyMntCtrl({
                    baseUrl:'/api/filesystem',
                    itemUrlPrefix:'/fs/',
                })
            ]
        }
    }))

}

