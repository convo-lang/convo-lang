export const getHighlighterLang=(path:string):string|undefined=>{
    const i=path.lastIndexOf('.');
    if(i===-1){
        return undefined;
    }
    switch(path.substring(i+1).toLowerCase()){

        case 'convo':
        case 'convomake':
            return 'convo';
        
        case 'js':
        case 'mjs':
        case 'cjs':
            return 'javascript';
        case 'jsx':
            return 'jsx';

        case 'ts':
            return 'typescript';

        case 'tsx':
            return 'tsx';

        case 'py':
        case 'python':
            return 'python';

        case 'json':
            return 'json';

        case 'xml':
            return 'xml';

        case 'html':
            return 'html';

        case 'bash':
        case 'sh':
            return 'shell';

        case 'diff':
            return 'diff';

        case 'yaml':
        case 'yml':
            return 'yaml';

        case 'toml':
            return 'toml';

        case 'psql':
        case 'sql':
            return 'sql';

        case 'md':
            return 'markdown';

        default:
            return undefined;

    }
}