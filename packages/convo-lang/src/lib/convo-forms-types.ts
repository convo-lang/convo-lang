import { z } from "zod";

export const ConvoFormItemTypeScheme=z.enum(['question','multi-choice-question']);
export type ConvoFormItemType=z.infer<typeof ConvoFormItemTypeScheme>;

export const ConvoFormItemScheme=z.object({
    id:z.string().describe('Unique id of the item'),

    type:ConvoFormItemTypeScheme,

    question:z.string().optional().describe('The question to ask the user if the item is a question'),


})
export type ConvoFormItem=z.infer<typeof ConvoFormItemScheme>;

export const ConvoFormScheme=z.object({
    id:z.string().describe('Unique id of the forms'),
    name:z.string().describe('Name of the form'),
    disabled:z.boolean().optional(),
    description:z.string(),
    items:ConvoFormItemScheme.array().describe('The items in the form such as inputs and content')

})
export type ConvoForm=z.infer<typeof ConvoFormScheme>;

export const ConvoFormItemResponseScheme=z.object({
    itemId:z.string().describe('Id of the item the response is responding to'),
    textResponse:z.string().optional().describe('Text response'),
})
export type ConvoFormItemResponse=z.infer<typeof ConvoFormItemResponseScheme>;

export const ConvoFormSubmissionResponseScheme=z.object({
    formId:z.string().describe('Id of the form being submitted'),
    responses:ConvoFormItemResponseScheme.array(),
})
export type ConvoFormSubmissionResponse=z.infer<typeof ConvoFormSubmissionResponseScheme>;
