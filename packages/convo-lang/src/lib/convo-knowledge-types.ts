/**
 * Represents the granularity / level of a document item
 * Levels:
 * 0. Knowledge base - All documents in a system
 * 1. Collection - Group of documents
 * 2. Document
 * 3. Chapter
 * 4. Page
 * 5. Section
 * 6. Paragraph
 * 7. Sentence
 * 8. Word
 * 9. Character
 */
export type ConvoKnowledgeLevel=1|2|3|4|5;

/**
 * 0. Knowledge base - All documents in a system
 * 1.
 */
export type ConvoDocMediaLevel=1|2|3|4|5;

export interface ConvoDocItem
{


    /**
     * Summary of the item
     */
    summary?:string;

    /**
     * URI of the source document
     */
    uri?:string;

    embedding?:number[];
    embeddingModel?:string;

    level:ConvoKnowledgeLevel;

}

export interface ConvoDoc extends ConvoDocItem
{
    pages:ConvoDocPage[];
}

export interface ConvoDocPage extends ConvoDocItem
{
    parts:ConvoDocPart[];
}

export interface ConvoDocPart extends ConvoDocItem
{
    /**
     * Raw text content of the item
     */
    text?:string;

    /**
     * Page index of the source document
     */
    pageIndex?:number;

    /**
     * Character index relative to the start of the source document
     */
    charIndex?:number;

}
