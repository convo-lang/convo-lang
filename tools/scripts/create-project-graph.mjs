import devkit from '@nrwl/devkit';

const {createProjectGraphAsync}=devkit;

const main=async ()=>{
    try{
        const r=await createProjectGraphAsync();
        process.exit(0);
    }catch(ex){
        console.error(ex);
        process.exit(1);
    }
}

main();
