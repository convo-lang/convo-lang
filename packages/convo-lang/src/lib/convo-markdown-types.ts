import { ConvoStatement, ConvoTag } from "./convo-types.js";

export type ConvoMdStatementType=(
    'h1'|
    'h2'|
    'h3'|
    'h4'|
    'h5'|
    'h6'|
    'list'|
    'code'|
    'image'|
    'link'|
    'hr'
);

export interface ConvoMdText
{
    /**
     * Text content
     */
    t?:string;

    /**
     * Bold
     */
    b?:boolean;

    /**
     * Italic
     */
    i?:boolean;
}

export interface ConvoMdStatement
{
    type:ConvoMdStatementType;
    text?:string;
    children?:ConvoMdStatement[];
    dynamic?:ConvoStatement;

    /**
     * Code language used in code block.
     */
    codeLang?:string;

    /**
     * image or link url
     */
    url?:string;

    tags?:ConvoTag[];

    /**
     * Source start
     */
    s?:number;

    /**
     * Source end
     */
    e?:number;

}
