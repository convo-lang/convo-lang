export interface StudioUri
{
    basename:string;

    uri:string;

    /**
     * URI without query
     */
    uriBase:string;

    protocol:string;

    path:string;

    pathIsAbsolute?:boolean;

    domain?:string;

    queryParams?:Record<string,string>;

    /**
     * Path to document relative to the root of the workspace. Documents located outside of the
     * workspace will not have a `workspacePath`
     */
    workspacePath?:string;
}

export interface Studio
{
    windows:StudioWindow[];
}

export interface StudioWindow
{
    /**
     * Unique id within the windows siblings
     */
    id:string;

    /**
     * Grid columns sizes as fractional units. A value of [1,2] would result in 2 columns with the
     * first consuming 1/3 of the available width and the other consuming the remaining 2/3.
     */
    columns?:number[];

    /**
     * Grid row sizes as fractional units similar to columns.
     */
    rows?:number[];

    cells:StudioCell[];
}

export interface StudioCell
{
    id:string;
    row?:number;
    column?:number;
    docs:StudioDoc[];
}

export type StudioDocTask='edit'|'form';

export interface StudioDoc
{
    /**
     * Basename of the path or url of the document
     */
    name:string;

    /**
     * Full URL to document
     */
    uri:string;

    contentType:string;

    /**
     * The task or use of the document
     * @default 'edit'
     */
    task?:StudioDocTask;

    content?:string;
}

/**
 * This interface will be replace with a ConvoDb Filesystem mount
 */
export interface TmpStudioIo
{
    readFileAsync(path:string):Promise<string|undefined>;

    writeFileAsync(path:string,content:string):Promise<boolean>;
}